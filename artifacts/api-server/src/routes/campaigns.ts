import { Router, type IRouter } from 'express';
import {
  ListCampaignsResponse, CreateCampaignBody, CreateCampaignResponse,
  GetCampaignParams, GetCampaignResponse, UpdateCampaignParams, UpdateCampaignBody,
  UpdateCampaignResponse, DeleteCampaignParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';
import { guardWorkspaceMutations } from '../lib/workspace-guard';

const router: IRouter = Router();
const config = entityConfigs.campaigns;
router.use(guardWorkspaceMutations(config.table));

router.get('/campaigns', (_req, res) => {
  res.json(ListCampaignsResponse.parse(listEntities(config, { orderBy: 'created_at DESC' })));
});
router.post('/campaigns', async (req, res) => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Campaign creation failed' });
  await recordActivity('campaign', Number(row.id), String(row.title), 'created');
  res.status(201).json(CreateCampaignResponse.parse(row));
});
router.get('/campaigns/:id', (req, res) => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Campaign not found' });
  res.json(GetCampaignResponse.parse(row));
});
router.patch('/campaigns/:id', (req, res) => {
  const params = UpdateCampaignParams.safeParse(req.params);
  const body = UpdateCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid campaign update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Campaign not found' });
  res.json(UpdateCampaignResponse.parse(row));
});
router.delete('/campaigns/:id', (req, res) => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Campaign not found' });
  res.sendStatus(204);
});

export default router;
