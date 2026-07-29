import { Router, type IRouter } from 'express';
import {
  ListEvidenceQueryParams, ListEvidenceResponse, CreateEvidenceBody, CreateEvidenceResponse,
  GetEvidenceParams, GetEvidenceResponse, UpdateEvidenceParams, UpdateEvidenceBody,
  UpdateEvidenceResponse, DeleteEvidenceParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { transaction } from '@workspace/db';
import { appendDomainEvent, projectDomainEventsToActivity } from '../lib/events';
import { guardWorkspaceMutations } from '../lib/workspace-guard';

const router: IRouter = Router();
const config = entityConfigs.evidence;
router.use(guardWorkspaceMutations(config.table));

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
  const row = transaction(() => {
    const created = createEntity(config, parsed.data);
    if (!created) throw new Error('Evidence creation failed');
    appendDomainEvent({
      eventType: 'EvidenceCaptured', eventVersion: 1, aggregateType: 'evidence',
      aggregateId: Number(created.id),
      payload: { entityTitle: String(created.title), action: 'captured' },
    });
    return created;
  });
  projectDomainEventsToActivity();
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
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  const row = transaction(() => {
    const updated = updateEntity(config, params.data.id, body.data)!;
    appendDomainEvent({
      eventType: 'EvidenceUpdated', eventVersion: 1, aggregateType: 'evidence',
      aggregateId: params.data.id,
      payload: { entityTitle: String(updated.title), action: 'updated' },
    });
    return updated;
  });
  projectDomainEventsToActivity();
  res.json(UpdateEvidenceResponse.parse(row));
});
router.delete('/evidence/:id', (req, res) => {
  const params = DeleteEvidenceParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  transaction(() => {
    deleteEntity(config, params.data.id);
    appendDomainEvent({
      eventType: 'EvidenceDeleted', eventVersion: 1, aggregateType: 'evidence',
      aggregateId: params.data.id,
      payload: { entityTitle: String(existing.title), action: 'deleted' },
    });
  });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

export default router;
