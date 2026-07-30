import { Router, type IRouter } from 'express';
import {
  ListStoriesQueryParams, ListStoriesResponse, CreateStoryBody, CreateStoryResponse,
  GetStoryParams, GetStoryResponse, UpdateStoryParams, UpdateStoryBody,
  UpdateStoryResponse, DeleteStoryParams, GetStoriesByStatusResponse,
  TransitionStoryParams, TransitionStoryBody, TransitionStoryResponse,
  GetStoryOutlineParams, GetStoryOutlineResponse, ReplaceStoryOutlineParams,
  ReplaceStoryOutlineBody, ReplaceStoryOutlineResponse, GetStoryLinksParams,
  GetStoryLinksResponse, LinkStoryEntityParams, LinkStoryEntityBody,
  UnlinkStoryEntityParams, GetStoryOutputsParams, GetStoryOutputsResponse,
  CreateStoryOutputParams, CreateStoryOutputBody, CreateStoryOutputResponse,
  GetStoryHealthParams, GetStoryHealthResponse, GetStoryTimelineParams,
  GetStoryTimelineResponse, ArchiveStoryParams, ArchiveStoryBody, ArchiveStoryResponse,
} from '@workspace/api-zod';
import { all, get, run, transaction } from '@workspace/db';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { appendDomainEvent, projectDomainEventsToActivity } from '../lib/events';
import { executeCapability } from '../lib/intelligence';
import {
  canTransitionStory, checkpointStory, contentMetrics, normalizeStory, storyEvent, storyHealth, storyLinks,
  storyLinkConfig,
} from '../lib/stories';
import { guardWorkspaceMutations, workspaceMutationError } from '../lib/workspace-guard';

const router: IRouter = Router();
const config = entityConfigs.stories;
router.use(guardWorkspaceMutations(config.table));

function appendStoryEvent(storyId: number, title: string, eventType: string, action: string) {
  appendDomainEvent({
    eventType,
    eventVersion: 1,
    aggregateType: 'story',
    aggregateId: storyId,
    payload: { entityTitle: title, action },
  });
}

router.get('/stories/by-status', (_req, res) => {
  const rows = all('SELECT status, COUNT(*) AS count FROM stories GROUP BY status')
    .map((row) => ({ status: row.status, count: Number(row.count) }));
  res.json(GetStoriesByStatusResponse.parse(rows));
});
router.get('/stories', (req, res) => {
  const query = ListStoriesQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: query.error.message });
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (query.data.status) { conditions.push('status = ?'); params.push(query.data.status); }
  if (query.data.campaignId != null) {
    conditions.push(
      'id IN (SELECT story_id FROM story_campaigns WHERE campaign_id = ?)',
    );
    params.push(query.data.campaignId);
  }
  if (query.data.workspaceId != null) { conditions.push('project_id = ?'); params.push(query.data.workspaceId); }
  if (query.data.storyType) { conditions.push('story_type = ?'); params.push(query.data.storyType); }
  if (query.data.search) { conditions.push('title LIKE ?'); params.push(`%${query.data.search}%`); }
  res.json(ListStoriesResponse.parse(listEntities(config, {
    where: conditions.join(' AND ') || undefined,
    params,
    orderBy: 'updated_at DESC',
  }).map(normalizeStory)));
});
router.post('/stories', async (req, res) => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const workspaceError = workspaceMutationError(parsed.data.workspaceId);
  if (workspaceError) return void res.status(workspaceError === 'Workspace not found' ? 404 : 409).json({ error: workspaceError });
  const input = { ...parsed.data } as Record<string, unknown>;
  if (input.workspaceId != null) input.projectId = input.workspaceId;
  delete input.workspaceId;
  const metrics = contentMetrics(input.content);
  const row = transaction(() => {
    const created = createEntity(config, { ...input, ...metrics });
    if (!created) throw new Error('Story creation failed');
    storyEvent(Number(created.id), 'created', { status: created.status });
    checkpointStory(Number(created.id), 'Initial Story');
    appendStoryEvent(Number(created.id), String(created.title), 'StoryCreated', 'created');
    return created;
  });
  projectDomainEventsToActivity();
  res.status(201).json(CreateStoryResponse.parse(normalizeStory(row)));
});
router.get('/stories/:id', (req, res) => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Story not found' });
  res.json(GetStoryResponse.parse(normalizeStory(row)));
});
router.patch('/stories/:id', async (req, res) => {
  const params = UpdateStoryParams.safeParse(req.params);
  const body = UpdateStoryBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid story update' });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Story not found' });
  const workspaceError = workspaceMutationError(existing.projectId);
  if (workspaceError) return void res.status(409).json({ error: workspaceError });
  if (existing.status === 'Archived') return void res.status(409).json({ error: 'Archived Stories are read-only' });
  if (body.data.expectedVersion != null && body.data.expectedVersion !== existing.version) {
    return void res.status(409).json({ error: 'Story has changed; reload before saving', currentVersion: existing.version });
  }
  const input = { ...body.data } as Record<string, unknown>;
  if (input.workspaceId !== undefined) input.projectId = input.workspaceId;
  delete input.workspaceId;
  delete input.expectedVersion;
  const metrics = input.content === undefined ? {} : contentMetrics(input.content);
  input.version = Number(existing.version ?? 1) + 1;
  const row = transaction(() => {
    const updated = updateEntity(config, params.data.id, { ...input, ...metrics });
    if (!updated) throw new Error('Story update failed');
    storyEvent(Number(updated.id), 'updated', { fields: Object.keys(input) });
    checkpointStory(Number(updated.id), 'Story updated');
    appendStoryEvent(Number(updated.id), String(updated.title), 'StoryUpdated', 'updated');
    return updated;
  });
  projectDomainEventsToActivity();
  res.json(UpdateStoryResponse.parse(normalizeStory(row)));
});
router.delete('/stories/:id', (req, res) => {
  const params = DeleteStoryParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Story not found' });
  res.sendStatus(204);
});

router.post('/stories/:id/transition', async (req, res) => {
  const params = TransitionStoryParams.safeParse(req.params);
  const body = TransitionStoryBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid lifecycle transition' });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Story not found' });
  const workspaceError = workspaceMutationError(existing.projectId);
  if (workspaceError) return void res.status(409).json({ error: workspaceError });
  if (!canTransitionStory(String(existing.status), body.data.status)) {
    return void res.status(409).json({
      error: `Illegal Story transition from ${existing.status} to ${body.data.status}`,
    });
  }
  const health = storyHealth(params.data.id);
  if (body.data.status === 'Approved' && health?.blockers.length) {
    return void res.status(409).json({ error: 'Story is not ready for approval', blockers: health.blockers });
  }
  if (body.data.status === 'Published') {
    const ready = get("SELECT id FROM story_outputs WHERE story_id = ? AND status IN ('Ready', 'Published') LIMIT 1", [params.data.id]);
    if (!ready) return void res.status(409).json({ error: 'A ready Output is required before publishing' });
  }
  const row = transaction(() => {
    const transitioned = updateEntity(config, params.data.id, {
      status: body.data.status,
      archivedAt: body.data.status === 'Archived' ? new Date().toISOString() : null,
      version: Number(existing.version ?? 1) + 1,
    })!;
    storyEvent(params.data.id, 'transitioned', { from: existing.status, to: body.data.status });
    checkpointStory(params.data.id, `Transitioned to ${body.data.status}`);
    appendStoryEvent(params.data.id, String(transitioned.title), 'StoryTransitioned', `transitioned to ${body.data.status}`);
    return transitioned;
  });
  projectDomainEventsToActivity();
  res.json(TransitionStoryResponse.parse(normalizeStory(row)));
});

router.get('/stories/:id/outline', (req, res) => {
  const params = GetStoryOutlineParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Story not found' });
  const rows = all('SELECT * FROM story_outline_items WHERE story_id = ? ORDER BY position, id', [params.data.id])
    .map((row) => ({
      id: Number(row.id), storyId: Number(row.story_id),
      parentId: row.parent_id == null ? null : Number(row.parent_id),
      position: Number(row.position), title: String(row.title),
      notes: row.notes == null ? null : String(row.notes),
      completionStatus: String(row.completion_status),
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    }));
  res.json(GetStoryOutlineResponse.parse(rows));
});

router.put('/stories/:id/outline', (req, res) => {
  const params = ReplaceStoryOutlineParams.safeParse(req.params);
  const body = ReplaceStoryOutlineBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid Story outline' });
  const story = getEntity(config, params.data.id);
  if (!story) return void res.status(404).json({ error: 'Story not found' });
  const workspaceError = workspaceMutationError(story.projectId);
  if (workspaceError) return void res.status(409).json({ error: workspaceError });
  if (story.status === 'Archived') return void res.status(409).json({ error: 'Archived Stories are read-only' });
  transaction(() => {
    run('DELETE FROM story_outline_items WHERE story_id = ?', [params.data.id]);
    body.data.forEach((item, position) => {
      run(`INSERT INTO story_outline_items (story_id, position, title, notes, completion_status)
        VALUES (?, ?, ?, ?, ?)`, [
        params.data.id, position, item.title, item.notes ?? null, item.completionStatus,
      ]);
    });
    storyEvent(params.data.id, 'outline_replaced', { count: body.data.length });
    appendStoryEvent(params.data.id, String(story.title), 'StoryOutlineReplaced', 'outline updated');
  });
  projectDomainEventsToActivity();
  const rows = all('SELECT * FROM story_outline_items WHERE story_id = ? ORDER BY position', [params.data.id])
    .map((row) => ({
      id: Number(row.id), storyId: Number(row.story_id), parentId: null,
      position: Number(row.position), title: String(row.title),
      notes: row.notes == null ? null : String(row.notes),
      completionStatus: String(row.completion_status),
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    }));
  res.json(ReplaceStoryOutlineResponse.parse(rows));
});

router.get('/stories/:id/links', (req, res) => {
  const params = GetStoryLinksParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Story not found' });
  res.json(GetStoryLinksResponse.parse(storyLinks(params.data.id)));
});

router.post('/stories/:id/links', (req, res) => {
  const params = LinkStoryEntityParams.safeParse(req.params);
  const body = LinkStoryEntityBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid Story link' });
  const story = get('SELECT id, project_id, status FROM stories WHERE id = ?', [params.data.id]);
  if (!story) return void res.status(404).json({ error: 'Story not found' });
  if (story.status === 'Archived') return void res.status(409).json({ error: 'Archived Stories are read-only' });
  if (body.data.entityType === 'story') {
    const target = get('SELECT id, project_id FROM stories WHERE id = ?', [body.data.entityId]);
    if (!target) return void res.status(404).json({ error: 'Related Story not found' });
    if (target.project_id !== story.project_id) return void res.status(409).json({ error: 'Cross-Workspace Story links are not supported' });
    run(`INSERT OR REPLACE INTO story_relations
      (source_story_id, target_story_id, relationship_type, notes) VALUES (?, ?, ?, ?)`,
    [params.data.id, body.data.entityId, body.data.relationshipType ?? 'Related', body.data.notes ?? null]);
  } else {
    const link = storyLinkConfig[body.data.entityType];
    const evidenceFields = body.data.entityType === 'evidence' ? ', title, lifecycle_status' : '';
    const target = get(`SELECT id, ${link.workspace} workspace_id${evidenceFields} FROM ${link.target} WHERE id = ?`, [body.data.entityId]);
    if (!target) return void res.status(404).json({ error: 'Linked entity not found' });
    if (target.workspace_id != null && story.project_id != null && target.workspace_id !== story.project_id) {
      return void res.status(409).json({ error: 'Linked entities must belong to the Story Workspace' });
    }
    if (body.data.entityType === 'evidence') {
      if (target.lifecycle_status !== 'Active') {
        return void res.status(409).json({ error: 'Only active Evidence can be linked' });
      }
      run('INSERT OR REPLACE INTO story_evidence (story_id, evidence_id, notes) VALUES (?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.notes ?? null]);
      appendDomainEvent({
        eventType: 'EvidenceLinkedToStory', eventVersion: 1, aggregateType: 'evidence',
        aggregateId: body.data.entityId,
        payload: { entityTitle: String(target.title), action: `linked to Story ${params.data.id}`, storyId: params.data.id },
      });
    } else if (body.data.entityType === 'knowledge') {
      run('INSERT OR REPLACE INTO story_knowledge (story_id, knowledge_id, relationship_type, notes) VALUES (?, ?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.relationshipType ?? 'Reference', body.data.notes ?? null]);
    } else if (body.data.entityType === 'asset') {
      run('INSERT OR REPLACE INTO story_assets (story_id, asset_id, role) VALUES (?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.relationshipType ?? 'Supporting']);
    } else {
      return void res.status(409).json({
        error:
          "Campaign membership is governed from Campaign Mission Control",
      });
    }
  }
  storyEvent(params.data.id, 'entity_linked', body.data);
  projectDomainEventsToActivity();
  res.sendStatus(201);
});

router.delete('/stories/:id/links/:entityType/:entityId', (req, res) => {
  const params = UnlinkStoryEntityParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (params.data.entityType === 'campaign') {
    return void res.status(409).json({
      error: 'Campaign membership is governed from Campaign Mission Control',
    });
  }
  if (params.data.entityType === 'story') {
    run('DELETE FROM story_relations WHERE source_story_id = ? AND target_story_id = ?', [params.data.id, params.data.entityId]);
  } else {
    const link = storyLinkConfig[params.data.entityType];
    const evidence = params.data.entityType === 'evidence'
      ? get('SELECT id, title, lifecycle_status FROM evidence WHERE id = ?', [params.data.entityId])
      : undefined;
    if (evidence && evidence.lifecycle_status !== 'Active') {
      return void res.status(409).json({ error: 'Only active Evidence can be unlinked' });
    }
    run(`DELETE FROM ${link.table} WHERE story_id = ? AND ${link.id} = ?`, [params.data.id, params.data.entityId]);
    if (evidence) {
      appendDomainEvent({
        eventType: 'EvidenceUnlinkedFromStory', eventVersion: 1, aggregateType: 'evidence',
        aggregateId: params.data.entityId,
        payload: { entityTitle: String(evidence.title), action: `unlinked from Story ${params.data.id}`, storyId: params.data.id },
      });
    }
  }
  storyEvent(params.data.id, 'entity_unlinked', { entityType: params.data.entityType, entityId: params.data.entityId });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

router.get('/stories/:id/outputs', (req, res) => {
  const params = GetStoryOutputsParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const rows = all('SELECT * FROM story_outputs WHERE story_id = ? ORDER BY updated_at DESC', [params.data.id])
    .map((row) => ({
      id: Number(row.id), storyId: Number(row.story_id), type: String(row.type),
      title: String(row.title), status: String(row.status),
      content: row.content == null ? null : String(row.content),
      format: row.format == null ? null : String(row.format),
      destination: row.destination == null ? null : String(row.destination),
      publishedAt: row.published_at == null ? null : String(row.published_at),
      createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    }));
  res.json(GetStoryOutputsResponse.parse(rows));
});

router.post('/stories/:id/outputs', (req, res) => {
  const params = CreateStoryOutputParams.safeParse(req.params);
  const body = CreateStoryOutputBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid Story Output' });
  const story = getEntity(config, params.data.id);
  if (!story) return void res.status(404).json({ error: 'Story not found' });
  const workspaceError = workspaceMutationError(story.projectId);
  if (workspaceError) return void res.status(409).json({ error: workspaceError });
  if (req.body?.status && req.body.status !== 'Draft') {
    return void res.status(409).json({ error: 'Outputs must be created as Draft and transitioned after validation' });
  }
  const row = transaction(() => {
    const result = run(`INSERT INTO story_outputs
      (story_id, type, title, status, content, format, destination)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [
      params.data.id, body.data.type, body.data.title, 'Draft',
      body.data.content ?? null, body.data.format ?? null, body.data.destination ?? null,
    ]);
    const created = get('SELECT * FROM story_outputs WHERE id = ?', [Number(result.lastInsertRowid)])!;
    storyEvent(params.data.id, 'output_created', { outputId: Number(created.id), type: created.type });
    appendStoryEvent(params.data.id, String(story.title), 'StoryOutputCreated', 'output created');
    return created;
  });
  projectDomainEventsToActivity();
  res.status(201).json(CreateStoryOutputResponse.parse({
    id: Number(row.id), storyId: Number(row.story_id), type: String(row.type),
    title: String(row.title), status: String(row.status),
    content: row.content, format: row.format, destination: row.destination,
    publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at,
  }));
});

router.get('/stories/:id/health', (req, res) => {
  const params = GetStoryHealthParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const story = get(`
    SELECT s.id, s.version,
      coalesce((SELECT max(id) FROM domain_events
        WHERE aggregate_type = 'story' AND aggregate_id = s.id), 0) event_watermark
    FROM stories s WHERE s.id = ?
  `, [params.data.id]);
  if (!story) return void res.status(404).json({ error: 'Story not found' });
  const health = executeCapability({
    subjectType: 'story',
    subjectId: params.data.id,
    inputWatermark: `${story.version}:${story.event_watermark}`,
    capability: {
      id: 'story-health',
      version: '1.0.0',
      resultKind: 'health-score',
      classification: 'deterministic',
      analyze: () => ({
        value: storyHealth(params.data.id)!,
        explanation: 'Calculated from Story structure, relationships, metadata, content, and Outputs.',
      }),
    },
  });
  res.json(GetStoryHealthResponse.parse(health));
});

router.get('/stories/:id/timeline', (req, res) => {
  const params = GetStoryTimelineParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Story not found' });
  const rows = all(`
    SELECT id, event_type, actor, payload, created_at FROM story_events WHERE story_id = ?
    UNION ALL
    SELECT -id id, 'version' event_type, 'Local Owner' actor,
      json_object('version', version, 'summary', change_summary) payload, created_at
    FROM story_versions WHERE story_id = ?
    ORDER BY created_at DESC LIMIT 100
  `, [params.data.id, params.data.id]).map((row) => ({
    id: Number(row.id), eventType: String(row.event_type), actor: String(row.actor),
    payload: JSON.parse(String(row.payload ?? '{}')), createdAt: String(row.created_at),
  }));
  res.json(GetStoryTimelineResponse.parse(rows));
});

router.post('/stories/:id/archive', (req, res) => {
  const params = ArchiveStoryParams.safeParse(req.params);
  const body = ArchiveStoryBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid archive request' });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Story not found' });
  const row = transaction(() => {
    const archived = updateEntity(config, params.data.id, {
      status: body.data.archived ? 'Archived' : 'Draft',
      archivedAt: body.data.archived ? new Date().toISOString() : null,
      version: Number(existing.version ?? 1) + 1,
    })!;
    const action = body.data.archived ? 'archived' : 'restored';
    storyEvent(params.data.id, action);
    checkpointStory(params.data.id, body.data.archived ? 'Story archived' : 'Story restored');
    appendStoryEvent(params.data.id, String(archived.title), body.data.archived ? 'StoryArchived' : 'StoryRestored', action);
    return archived;
  });
  projectDomainEventsToActivity();
  res.json(ArchiveStoryResponse.parse(normalizeStory(row)));
});

export default router;
