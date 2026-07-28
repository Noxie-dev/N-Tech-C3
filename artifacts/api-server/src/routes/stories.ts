import { Router, type IRouter } from 'express';
import {
  ListStoriesQueryParams, ListStoriesResponse, CreateStoryBody, CreateStoryResponse,
  GetStoryParams, GetStoryResponse, UpdateStoryParams, UpdateStoryBody,
  UpdateStoryResponse, DeleteStoryParams, GetStoriesByStatusResponse,
} from '@workspace/api-zod';
import { all } from '@workspace/db';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';

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
  if (query.data.search) { conditions.push('title LIKE ?'); params.push(`%${query.data.search}%`); }
  res.json(ListStoriesResponse.parse(listEntities(config, {
    where: conditions.join(' AND ') || undefined,
    params,
    orderBy: 'updated_at DESC',
  })));
});
router.post('/stories', async (req, res) => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Story creation failed' });
  await recordActivity('story', Number(row.id), String(row.title), 'created');
  res.status(201).json(CreateStoryResponse.parse(row));
});
router.get('/stories/:id', (req, res) => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Story not found' });
  res.json(GetStoryResponse.parse(row));
});
router.patch('/stories/:id', async (req, res) => {
  const params = UpdateStoryParams.safeParse(req.params);
  const body = UpdateStoryBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid story update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Story not found' });
  await recordActivity('story', Number(row.id), String(row.title), 'updated');
  res.json(UpdateStoryResponse.parse(row));
});
router.delete('/stories/:id', (req, res) => {
  const params = DeleteStoryParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Story not found' });
  res.sendStatus(204);
});

export default router;
