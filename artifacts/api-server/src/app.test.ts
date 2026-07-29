import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.NTC3_VAULT_PATH = mkdtempSync(path.join(tmpdir(), 'ntc3-api-test-'));

let app: Awaited<typeof import('./app')>['default'];
let database: typeof import('@workspace/db');
let events: typeof import('./lib/events');

beforeAll(async () => {
  app = (await import('./app')).default;
  database = await import('@workspace/db');
  events = await import('./lib/events');
});

describe('local API', () => {
  it('reports health', async () => {
    const response = await request(app).get('/api/healthz').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('persists and returns a project through SQLite', async () => {
    const created = await request(app)
      .post('/api/projects')
      .send({ name: 'Migration test', description: 'API contract' })
      .expect(201);

    expect(created.body).toMatchObject({
      id: expect.any(Number),
      name: 'Migration test',
      description: 'API contract',
    });

    const listed = await request(app).get('/api/projects').expect(200);
    expect(listed.body).toContainEqual(created.body);
  });

  it('supports the canonical workspace lifecycle and overview', async () => {
    const created = await request(app)
      .post('/api/workspaces')
      .send({
        name: 'Route 01',
        description: 'Workspace architecture',
        purpose: 'Product',
        tags: ['route-01'],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: 'Route 01',
      slug: 'route-01',
      status: 'Active',
      purpose: 'Product',
      tags: ['route-01'],
    });
    expect(database.get(
      'SELECT event_type, event_version FROM domain_events WHERE aggregate_type = ? AND aggregate_id = ?',
      ['workspace', created.body.id],
    )).toEqual({ event_type: 'WorkspaceCreated', event_version: 1 });
    expect(database.get(
      'SELECT source_event_id FROM activity WHERE entity_type = ? AND entity_id = ?',
      ['workspace', created.body.id],
    )?.source_event_id).toEqual(expect.any(Number));
    const activityCount = database.get(
      'SELECT count(*) count FROM activity WHERE entity_type = ? AND entity_id = ?',
      ['workspace', created.body.id],
    )?.count;
    events.projectDomainEventsToActivity();
    expect(database.get(
      'SELECT count(*) count FROM activity WHERE entity_type = ? AND entity_id = ?',
      ['workspace', created.body.id],
    )?.count).toBe(activityCount);

    const overview = await request(app)
      .get(`/api/workspaces/${created.body.id}`)
      .expect(200);
    expect(overview.body).toMatchObject({
      id: created.body.id,
      metrics: { stories: 0, evidence: 0, campaigns: 0 },
      health: { score: expect.any(Number), insufficientData: true },
      recentActivity: expect.any(Array),
    });
    expect(database.get(
      'SELECT classification FROM intelligence_results WHERE capability_id = ? AND subject_id = ?',
      ['workspace-health', created.body.id],
    )).toEqual({ classification: 'deterministic' });

    await request(app)
      .patch(`/api/workspaces/${created.body.id}`)
      .send({ status: 'Archived' })
      .expect(200);
    await request(app)
      .patch(`/api/workspaces/${created.body.id}`)
      .send({ description: 'Blocked while archived' })
      .expect(409);
    await request(app)
      .patch(`/api/workspaces/${created.body.id}`)
      .send({ status: 'Active' })
      .expect(200);
  });

  it('supports the Story Engine outline, graph, output, health, versions, and archive lifecycle', async () => {
    const workspace = await request(app)
      .post('/api/workspaces')
      .send({ name: 'Story Engine Workspace', purpose: 'Product' })
      .expect(201);
    const story = await request(app)
      .post('/api/stories')
      .send({
        title: 'Evidence-based architecture',
        workspaceId: workspace.body.id,
        storyType: 'TechnicalDocumentation',
        status: 'Idea',
        summary: 'A supported engineering narrative',
      })
      .expect(201);
    expect(story.body).toMatchObject({
      workspaceId: workspace.body.id,
      storyType: 'TechnicalDocumentation',
      version: 1,
    });
    expect(database.get(
      'SELECT event_type FROM domain_events WHERE aggregate_type = ? AND aggregate_id = ?',
      ['story', story.body.id],
    )).toEqual({ event_type: 'StoryCreated' });

    const outline = await request(app)
      .put(`/api/stories/${story.body.id}/outline`)
      .send([
        { title: 'Problem', completionStatus: 'Complete' },
        { title: 'Evidence', completionStatus: 'InProgress' },
      ])
      .expect(200);
    expect(outline.body).toHaveLength(2);

    const evidence = await request(app)
      .post('/api/evidence')
      .send({ title: 'Architecture trace', type: 'Diagram', projectId: workspace.body.id })
      .expect(201);
    await request(app)
      .post(`/api/stories/${story.body.id}/links`)
      .send({ entityType: 'evidence', entityId: evidence.body.id })
      .expect(201);
    const links = await request(app).get(`/api/stories/${story.body.id}/links`).expect(200);
    expect(links.body.evidence[0]).toMatchObject({ id: evidence.body.id, title: 'Architecture trace' });

    const output = await request(app)
      .post(`/api/stories/${story.body.id}/outputs`)
      .send({ title: 'Architecture article', type: 'Blog' })
      .expect(201);
    expect(output.body).toMatchObject({ status: 'Draft', type: 'Blog' });

    const health = await request(app).get(`/api/stories/${story.body.id}/health`).expect(200);
    expect(health.body).toMatchObject({
      score: expect.any(Number),
      blockers: expect.any(Array),
      components: expect.arrayContaining([expect.objectContaining({ key: 'evidence' })]),
    });
    expect(database.get(
      'SELECT capability_version, classification FROM intelligence_results WHERE capability_id = ? AND subject_id = ?',
      ['story-health', story.body.id],
    )).toEqual({ capability_version: '1.0.0', classification: 'deterministic' });

    const updated = await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ content: '<p>Engineering evidence supports this decision.</p>', expectedVersion: 1 })
      .expect(200);
    expect(updated.body.version).toBe(2);
    await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ content: '<p>Stale overwrite</p>', expectedVersion: 1 })
      .expect(409);

    await request(app)
      .post(`/api/stories/${story.body.id}/archive`)
      .send({ archived: true })
      .expect(200);
    await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ title: 'Blocked edit' })
      .expect(409);
    await request(app)
      .post(`/api/stories/${story.body.id}/archive`)
      .send({ archived: false })
      .expect(200);

    const timeline = await request(app).get(`/api/stories/${story.body.id}/timeline`).expect(200);
    expect(timeline.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventType: 'created' }),
      expect.objectContaining({ eventType: 'version' }),
    ]));
  });

  it('enforces Workspace ownership, parent archive guards, and lifecycle ordering', async () => {
    await request(app)
      .post('/api/stories')
      .send({ title: 'Unassigned Story' })
      .expect(400);

    const workspace = await request(app)
      .post('/api/workspaces')
      .send({ name: 'Invariant Workspace', purpose: 'Product' })
      .expect(201);
    const story = await request(app)
      .post('/api/stories')
      .send({ title: 'Ordered lifecycle', workspaceId: workspace.body.id })
      .expect(201);

    await request(app)
      .post(`/api/stories/${story.body.id}/transition`)
      .send({ status: 'Draft' })
      .expect(409);
    await request(app)
      .post(`/api/stories/${story.body.id}/outputs`)
      .send({ title: 'Premature output', type: 'Blog', status: 'Ready' })
      .expect(409);

    await request(app)
      .patch(`/api/workspaces/${workspace.body.id}`)
      .send({ status: 'Archived' })
      .expect(200);
    await request(app)
      .post('/api/evidence')
      .send({
        title: 'Blocked child',
        type: 'TerminalOutput',
        projectId: workspace.body.id,
      })
      .expect(409);
    await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ summary: 'Blocked by archived parent' })
      .expect(409);
  });

  it('captures terminal evidence content', async () => {
    const response = await request(app)
      .post('/api/evidence')
      .send({
        title: 'Build output',
        type: 'TerminalOutput',
        content: 'pnpm run build\\nDone',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      title: 'Build output',
      type: 'TerminalOutput',
      content: 'pnpm run build\\nDone',
    });
    expect(database.get(
      'SELECT event_type FROM domain_events WHERE aggregate_type = ? AND aggregate_id = ?',
      ['evidence', response.body.id],
    )).toEqual({ event_type: 'EvidenceCaptured' });
    expect(database.get(
      'SELECT source_event_id FROM activity WHERE entity_type = ? AND entity_id = ?',
      ['evidence', response.body.id],
    )?.source_event_id).toEqual(expect.any(Number));

    const search = await request(app)
      .get('/api/search')
      .query({ q: 'build output' })
      .expect(200);
    expect(search.body[0]).toMatchObject({
      entityType: 'evidence',
      title: 'Build output',
      path: '/evidence',
    });
  });

  it('filters global search by project and entity type', async () => {
    const project = await request(app)
      .post('/api/projects')
      .send({ name: 'Filtered project' })
      .expect(201);
    await request(app)
      .post('/api/evidence')
      .send({
        title: 'Scoped telemetry record',
        type: 'Benchmark',
        content: 'unique-filter-token',
        projectId: project.body.id,
      })
      .expect(201);
    await request(app)
      .post('/api/evidence')
      .send({
        title: 'Unscoped telemetry record',
        type: 'Benchmark',
        content: 'unique-filter-token',
      })
      .expect(201);

    const search = await request(app)
      .get('/api/search')
      .query({ q: 'unique filter token', entityType: 'evidence', projectId: project.body.id })
      .expect(200);

    expect(search.body).toHaveLength(1);
    expect(search.body[0].title).toBe('Scoped telemetry record');
  });
});
