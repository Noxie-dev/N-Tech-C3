import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.NTC3_VAULT_PATH = mkdtempSync(path.join(tmpdir(), 'ntc3-api-test-'));

let app: Awaited<typeof import('./app')>['default'];

beforeAll(async () => {
  app = (await import('./app')).default;
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

    const overview = await request(app)
      .get(`/api/workspaces/${created.body.id}`)
      .expect(200);
    expect(overview.body).toMatchObject({
      id: created.body.id,
      metrics: { stories: 0, evidence: 0, campaigns: 0 },
      health: { score: expect.any(Number), insufficientData: true },
      recentActivity: expect.any(Array),
    });

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
