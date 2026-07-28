import { Router, type IRouter } from 'express';
import {
  ListEvidenceQueryParams, ListEvidenceResponse, CreateEvidenceBody, CreateEvidenceResponse,
  GetEvidenceParams, GetEvidenceResponse, UpdateEvidenceParams, UpdateEvidenceBody,
  UpdateEvidenceResponse, DeleteEvidenceParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';

const router: IRouter = Router();
const config = entityConfigs.evidence;

router.get('/evidence', (req, res) => {
  const query = ListEvidenceQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: query.error.message });
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (query.data.type) { conditions.push('type = ?'); params.push(query.data.type); }
  if (query.data.storyId != null) { conditions.push('story_id = ?'); params.push(query.data.storyId); }
  if (query.data.projectId != null) { conditions.push('project_id = ?'); params.push(query.data.projectId); }
  if (query.data.search) { conditions.push('title LIKE ?'); params.push(`%${query.data.search}%`); }
  res.json(ListEvidenceResponse.parse(listEntities(config, {
    where: conditions.join(' AND ') || undefined, params, orderBy: 'created_at DESC',
  })));
});
router.post('/evidence', async (req, res) => {
  const parsed = CreateEvidenceBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Evidence creation failed' });
  await recordActivity('evidence', Number(row.id), String(row.title), 'captured');
  res.status(201).json(CreateEvidenceResponse.parse(row));
});
router.get('/evidence/:id', (req, res) => {
  const params = GetEvidenceParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Evidence not found' });
  res.json(GetEvidenceResponse.parse(row));
});
router.patch('/evidence/:id', (req, res) => {
  const params = UpdateEvidenceParams.safeParse(req.params);
  const body = UpdateEvidenceBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid evidence update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Evidence not found' });
  res.json(UpdateEvidenceResponse.parse(row));
});
router.delete('/evidence/:id', (req, res) => {
  const params = DeleteEvidenceParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Evidence not found' });
  res.sendStatus(204);
});

export default router;
