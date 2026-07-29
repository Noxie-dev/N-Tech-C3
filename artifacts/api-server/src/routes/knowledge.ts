import { Router, type IRouter } from 'express';
import {
  ListKnowledgeQueryParams, ListKnowledgeResponse, CreateKnowledgeBody, CreateKnowledgeResponse,
  GetKnowledgeParams, GetKnowledgeResponse, UpdateKnowledgeParams, UpdateKnowledgeBody,
  UpdateKnowledgeResponse, DeleteKnowledgeParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';
import { guardWorkspaceMutations } from '../lib/workspace-guard';

const router: IRouter = Router();
const config = entityConfigs.knowledge;
router.use(guardWorkspaceMutations(config.table));

router.get('/knowledge', (req, res) => {
  const query = ListKnowledgeQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: query.error.message });
  const conditions: string[] = [];
  const params: string[] = [];
  if (query.data.category) { conditions.push('category = ?'); params.push(query.data.category); }
  if (query.data.search) { conditions.push('title LIKE ?'); params.push(`%${query.data.search}%`); }
  res.json(ListKnowledgeResponse.parse(listEntities(config, {
    where: conditions.join(' AND ') || undefined, params, orderBy: 'updated_at DESC',
  })));
});
router.post('/knowledge', async (req, res) => {
  const parsed = CreateKnowledgeBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Knowledge creation failed' });
  await recordActivity('knowledge', Number(row.id), String(row.title), 'created');
  res.status(201).json(CreateKnowledgeResponse.parse(row));
});
router.get('/knowledge/:id', (req, res) => {
  const params = GetKnowledgeParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Knowledge page not found' });
  res.json(GetKnowledgeResponse.parse(row));
});
router.patch('/knowledge/:id', (req, res) => {
  const params = UpdateKnowledgeParams.safeParse(req.params);
  const body = UpdateKnowledgeBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid knowledge update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Knowledge page not found' });
  res.json(UpdateKnowledgeResponse.parse(row));
});
router.delete('/knowledge/:id', (req, res) => {
  const params = DeleteKnowledgeParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Knowledge page not found' });
  res.sendStatus(204);
});

export default router;
