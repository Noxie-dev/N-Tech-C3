import { Router, type IRouter } from 'express';
import {
  ListProjectsResponse, CreateProjectBody, CreateProjectResponse,
  GetProjectParams, GetProjectResponse, UpdateProjectParams, UpdateProjectBody,
  UpdateProjectResponse, DeleteProjectParams,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { recordActivity } from '../lib/activity';

const router: IRouter = Router();
const config = entityConfigs.projects;

router.get('/projects', (_req, res) => {
  res.json(ListProjectsResponse.parse(listEntities(config, { orderBy: 'created_at DESC' })));
});

router.post('/projects', async (req, res) => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = createEntity(config, parsed.data);
  if (!row) return void res.status(500).json({ error: 'Project creation failed' });
  await recordActivity('project', Number(row.id), String(row.name), 'created');
  res.status(201).json(CreateProjectResponse.parse(row));
});

router.get('/projects/:id', (req, res) => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Project not found' });
  res.json(GetProjectResponse.parse(row));
});

router.patch('/projects/:id', (req, res) => {
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid project update' });
  const row = updateEntity(config, params.data.id, body.data);
  if (!row) return void res.status(404).json({ error: 'Project not found' });
  res.json(UpdateProjectResponse.parse(row));
});

router.delete('/projects/:id', (req, res) => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!deleteEntity(config, params.data.id)) return void res.status(404).json({ error: 'Project not found' });
  res.sendStatus(204);
});

export default router;
