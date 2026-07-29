import { Router, type IRouter } from 'express';
import {
  ListAssetsQueryParams, ListAssetsResponse, CreateAssetBody, CreateAssetResponse,
  GetAssetParams, GetAssetResponse, UpdateAssetParams, UpdateAssetBody,
  UpdateAssetResponse, DeleteAssetParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';
import { guardWorkspaceMutations } from '../lib/workspace-guard';

const router: IRouter = Router();
const config = entityConfigs.assets;
router.use(guardWorkspaceMutations(config.table));

router.get('/assets', (req, res) => {
  const query = ListAssetsQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: query.error.message });
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (query.data.type) { conditions.push('type = ?'); params.push(query.data.type); }
  if (query.data.storyId != null) { conditions.push('story_id = ?'); params.push(query.data.storyId); }
  res.json(ListAssetsResponse.parse(listEntities(config, {
    where: conditions.join(' AND ') || undefined, params, orderBy: 'created_at DESC',
  })));
});
router.post('/assets', async (req, res) => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Asset creation failed' });
  await recordActivity('asset', Number(row.id), String(row.title), 'created');
  res.status(201).json(CreateAssetResponse.parse(row));
});
router.get('/assets/:id', (req, res) => {
  const params = GetAssetParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Asset not found' });
  res.json(GetAssetResponse.parse(row));
});
router.patch('/assets/:id', (req, res) => {
  const params = UpdateAssetParams.safeParse(req.params);
  const body = UpdateAssetBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid asset update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Asset not found' });
  res.json(UpdateAssetResponse.parse(row));
});
router.delete('/assets/:id', (req, res) => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Asset not found' });
  res.sendStatus(204);
});

export default router;
