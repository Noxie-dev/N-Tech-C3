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
import { all, get, run } from '@workspace/db';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';
import {
  checkpointStory, contentMetrics, normalizeStory, storyEvent, storyHealth, storyLinks,
  storyLinkConfig,
} from '../lib/stories';

const router: IRouter = Router();
const config = entityConfigs.stories;

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
  if (query.data.campaignId != null) { conditions.push('campaign_id = ?'); params.push(query.data.campaignId); }
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
  const input = { ...parsed.data } as Record<string, unknown>;
  if (input.workspaceId != null) input.projectId = input.workspaceId;
  delete input.workspaceId;
  const metrics = contentMetrics(input.content);
  const row = createEntity(config, { ...input, ...metrics });
  if (!row) return void res.status(500).json({ error: 'Story creation failed' });
  await recordActivity('story', Number(row.id), String(row.title), 'created');
  storyEvent(Number(row.id), 'created', { status: row.status });
  checkpointStory(Number(row.id), 'Initial Story');
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
  const row = updateEntity(config, params.data.id, { ...input, ...metrics });
  if (!row) return void res.status(404).json({ error: 'Story not found' });
  await recordActivity('story', Number(row.id), String(row.title), 'updated');
  storyEvent(Number(row.id), 'updated', { fields: Object.keys(input) });
  checkpointStory(Number(row.id), 'Story updated');
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
  const health = storyHealth(params.data.id);
  if (body.data.status === 'Approved' && health?.blockers.length) {
    return void res.status(409).json({ error: 'Story is not ready for approval', blockers: health.blockers });
  }
  if (body.data.status === 'Published') {
    const ready = get("SELECT id FROM story_outputs WHERE story_id = ? AND status IN ('Ready', 'Published') LIMIT 1", [params.data.id]);
    if (!ready) return void res.status(409).json({ error: 'A ready Output is required before publishing' });
  }
  const row = updateEntity(config, params.data.id, {
    status: body.data.status,
    archivedAt: body.data.status === 'Archived' ? new Date().toISOString() : null,
    version: Number(existing.version ?? 1) + 1,
  })!;
  storyEvent(params.data.id, 'transitioned', { from: existing.status, to: body.data.status });
  checkpointStory(params.data.id, `Transitioned to ${body.data.status}`);
  await recordActivity('story', params.data.id, String(row.title), `transitioned to ${body.data.status}`);
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
  if (story.status === 'Archived') return void res.status(409).json({ error: 'Archived Stories are read-only' });
  run('DELETE FROM story_outline_items WHERE story_id = ?', [params.data.id]);
  body.data.forEach((item, position) => {
    run(`INSERT INTO story_outline_items (story_id, position, title, notes, completion_status)
      VALUES (?, ?, ?, ?, ?)`, [
      params.data.id, position, item.title, item.notes ?? null, item.completionStatus,
    ]);
  });
  storyEvent(params.data.id, 'outline_replaced', { count: body.data.length });
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
    const target = get(`SELECT id, ${link.workspace} workspace_id FROM ${link.target} WHERE id = ?`, [body.data.entityId]);
    if (!target) return void res.status(404).json({ error: 'Linked entity not found' });
    if (target.workspace_id != null && story.project_id != null && target.workspace_id !== story.project_id) {
      return void res.status(409).json({ error: 'Linked entities must belong to the Story Workspace' });
    }
    if (body.data.entityType === 'evidence') {
      run('INSERT OR REPLACE INTO story_evidence (story_id, evidence_id, notes) VALUES (?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.notes ?? null]);
    } else if (body.data.entityType === 'knowledge') {
      run('INSERT OR REPLACE INTO story_knowledge (story_id, knowledge_id, relationship_type, notes) VALUES (?, ?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.relationshipType ?? 'Reference', body.data.notes ?? null]);
    } else if (body.data.entityType === 'asset') {
      run('INSERT OR REPLACE INTO story_assets (story_id, asset_id, role) VALUES (?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.relationshipType ?? 'Supporting']);
    } else {
      run('INSERT OR REPLACE INTO story_campaigns (story_id, campaign_id, is_primary) VALUES (?, ?, ?)',
        [params.data.id, body.data.entityId, body.data.relationshipType === 'Primary' ? 1 : 0]);
    }
  }
  storyEvent(params.data.id, 'entity_linked', body.data);
  res.sendStatus(201);
});

router.delete('/stories/:id/links/:entityType/:entityId', (req, res) => {
  const params = UnlinkStoryEntityParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (params.data.entityType === 'story') {
    run('DELETE FROM story_relations WHERE source_story_id = ? AND target_story_id = ?', [params.data.id, params.data.entityId]);
  } else {
    const link = storyLinkConfig[params.data.entityType];
    run(`DELETE FROM ${link.table} WHERE story_id = ? AND ${link.id} = ?`, [params.data.id, params.data.entityId]);
  }
  storyEvent(params.data.id, 'entity_unlinked', { entityType: params.data.entityType, entityId: params.data.entityId });
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
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Story not found' });
  const result = run(`INSERT INTO story_outputs
    (story_id, type, title, status, content, format, destination)
    VALUES (?, ?, ?, ?, ?, ?, ?)`, [
    params.data.id, body.data.type, body.data.title, body.data.status ?? 'Draft',
    body.data.content ?? null, body.data.format ?? null, body.data.destination ?? null,
  ]);
  const row = get('SELECT * FROM story_outputs WHERE id = ?', [Number(result.lastInsertRowid)])!;
  storyEvent(params.data.id, 'output_created', { outputId: Number(row.id), type: row.type });
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
  const health = storyHealth(params.data.id);
  if (!health) return void res.status(404).json({ error: 'Story not found' });
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
  const row = updateEntity(config, params.data.id, {
    status: body.data.archived ? 'Archived' : 'Draft',
    archivedAt: body.data.archived ? new Date().toISOString() : null,
    version: Number(existing.version ?? 1) + 1,
  })!;
  storyEvent(params.data.id, body.data.archived ? 'archived' : 'restored');
  res.json(ArchiveStoryResponse.parse(normalizeStory(row)));
});

export default router;
