import { Router, type IRouter } from 'express';
import {
  ListTemplatesQueryParams, ListTemplatesResponse, CreateTemplateBody, CreateTemplateResponse,
  GetTemplateParams, GetTemplateResponse, UpdateTemplateParams, UpdateTemplateBody,
  UpdateTemplateResponse, DeleteTemplateParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';

const router: IRouter = Router();
const config = entityConfigs.templates;

router.get('/templates', (req, res) => {
  const query = ListTemplatesQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: query.error.message });
  res.json(ListTemplatesResponse.parse(listEntities(config, {
    where: query.data.type ? 'type = ?' : undefined,
    params: query.data.type ? [query.data.type] : [],
    orderBy: 'created_at DESC',
  })));
});
router.post('/templates', async (req, res) => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Template creation failed' });
  await recordActivity('template', Number(row.id), String(row.title), 'created');
  res.status(201).json(CreateTemplateResponse.parse(row));
});
router.get('/templates/:id', (req, res) => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Template not found' });
  res.json(GetTemplateResponse.parse(row));
});
router.patch('/templates/:id', (req, res) => {
  const params = UpdateTemplateParams.safeParse(req.params);
  const body = UpdateTemplateBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid template update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Template not found' });
  res.json(UpdateTemplateResponse.parse(row));
});
router.delete('/templates/:id', (req, res) => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Template not found' });
  res.sendStatus(204);
});

export default router;
