import { Router, type IRouter } from 'express';
import {
  CreateWorkspaceBody, CreateWorkspaceResponse, DuplicateWorkspaceParams,
  DuplicateWorkspaceResponse, ExportWorkspaceParams, ExportWorkspaceResponse,
  GetWorkspaceIntegrityParams, GetWorkspaceIntegrityResponse, GetWorkspaceParams,
  GetWorkspaceResponse, ListWorkspacesQueryParams, ListWorkspacesResponse,
  UpdateWorkspaceBody, UpdateWorkspaceParams, UpdateWorkspaceResponse,
} from '@workspace/api-zod';
import { all, get, run } from '@workspace/db';
import { recordActivity } from '../lib/activity';
import {
  getWorkspaceRow, makeSlug, metricsForWorkspace, serializeWorkspaceField,
  summarizeWorkspace, workspaceFromRow, workspaceOverview,
} from '../lib/workspaces';

const router: IRouter = Router();

const fieldMap: Record<string, string> = {
  name: 'name', description: 'description', color: 'color', status: 'status',
  purpose: 'purpose', brand: 'brand', writingVoice: 'writing_voice',
  targetAudience: 'target_audience', currentGoal: 'current_goal', tags: 'tags',
  repositoryLinks: 'repository_links', preferredExportFormats: 'preferred_export_formats',
  knowledgeDomains: 'knowledge_domains', isFavorite: 'is_favorite', isPinned: 'is_pinned',
};

router.get('/workspaces', (req, res) => {
  const parsed = ListWorkspacesQueryParams.safeParse(req.query);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  const query = parsed.data;
  if (query.search) {
    conditions.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)');
    const term = `%${query.search}%`;
    params.push(term, term, term);
  }
  if (query.status) {
    conditions.push('status = ?');
    params.push(query.status);
  } else {
    conditions.push("status != 'Archived'");
  }
  if (query.favorite != null) {
    conditions.push('is_favorite = ?');
    params.push(query.favorite ? 1 : 0);
  }
  if (query.pinned != null) {
    conditions.push('is_pinned = ?');
    params.push(query.pinned ? 1 : 0);
  }
  if (query.purpose) {
    conditions.push('purpose = ?');
    params.push(query.purpose);
  }
  const rows = all(`SELECT * FROM projects WHERE ${conditions.join(' AND ')}
    ORDER BY is_pinned DESC, last_opened_at DESC, updated_at DESC`, params);
  res.json(ListWorkspacesResponse.parse(rows.map(summarizeWorkspace)));
});

router.post('/workspaces', async (req, res) => {
  const parsed = CreateWorkspaceBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const data = parsed.data;
  const slug = makeSlug(data.name);
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  const columns = entries.map(([field]) => fieldMap[field]);
  const params = entries.map(([field, value]) => serializeWorkspaceField(fieldMap[field], value));
  const result = run(
    `INSERT INTO projects (slug, ${columns.join(', ')}) VALUES (?, ${columns.map(() => '?').join(', ')})`,
    [slug, ...params] as Array<string | number>,
  );
  const row = getWorkspaceRow(Number(result.lastInsertRowid));
  if (!row) return void res.status(500).json({ error: 'Workspace creation failed' });
  await recordActivity('workspace', Number(row.id), String(row.name), 'created');
  res.status(201).json(CreateWorkspaceResponse.parse(workspaceFromRow(row)));
});

router.get('/workspaces/:workspaceId', (req, res) => {
  const parsed = GetWorkspaceParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = getWorkspaceRow(parsed.data.workspaceId);
  if (!row) return void res.status(404).json({ error: 'Workspace not found' });
  run("UPDATE projects SET last_opened_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?", [parsed.data.workspaceId]);
  res.json(GetWorkspaceResponse.parse(workspaceOverview({ ...row, last_opened_at: new Date().toISOString() })));
});

router.patch('/workspaces/:workspaceId', async (req, res) => {
  const params = UpdateWorkspaceParams.safeParse(req.params);
  const body = UpdateWorkspaceBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid workspace update' });
  const existing = getWorkspaceRow(params.data.workspaceId);
  if (!existing) return void res.status(404).json({ error: 'Workspace not found' });
  if (existing.status === 'Archived' && body.data.status !== 'Active') {
    return void res.status(409).json({ error: 'Archived workspaces are read-only; restore it first' });
  }
  const entries = Object.entries(body.data).filter(([, value]) => value !== undefined);
  if (body.data.name) entries.push(['slug', makeSlug(body.data.name, params.data.workspaceId)]);
  const assignments = entries.map(([field]) => `${field === 'slug' ? 'slug' : fieldMap[field]} = ?`);
  const values = entries.map(([field, value]) => serializeWorkspaceField(field === 'slug' ? field : fieldMap[field], value));
  run(`UPDATE projects SET ${assignments.join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    [...values, params.data.workspaceId] as Array<string | number>);
  const updated = getWorkspaceRow(params.data.workspaceId)!;
  await recordActivity('workspace', params.data.workspaceId, String(updated.name),
    body.data.status === 'Archived' ? 'archived' : body.data.status === 'Active' ? 'restored' : 'updated');
  res.json(UpdateWorkspaceResponse.parse(workspaceFromRow(updated)));
});

router.post('/workspaces/:workspaceId/duplicate', async (req, res) => {
  const parsed = DuplicateWorkspaceParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const existing = getWorkspaceRow(parsed.data.workspaceId);
  if (!existing) return void res.status(404).json({ error: 'Workspace not found' });
  const name = `${existing.name} Copy`;
  const result = run(`
    INSERT INTO projects (
      name, slug, description, color, status, purpose, brand, writing_voice,
      target_audience, current_goal, icon, logo_path, owner, tags, repository_links,
      preferred_export_formats, knowledge_domains
    ) SELECT ?, ?, description, color, 'Active', purpose, brand, writing_voice,
      target_audience, current_goal, icon, logo_path, owner, tags, repository_links,
      preferred_export_formats, knowledge_domains FROM projects WHERE id = ?
  `, [name, makeSlug(String(name)), parsed.data.workspaceId]);
  const duplicate = getWorkspaceRow(Number(result.lastInsertRowid))!;
  await recordActivity('workspace', Number(duplicate.id), String(duplicate.name), 'duplicated');
  res.status(201).json(DuplicateWorkspaceResponse.parse(workspaceFromRow(duplicate)));
});

router.get('/workspaces/:workspaceId/integrity', (req, res) => {
  const parsed = GetWorkspaceIntegrityParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = getWorkspaceRow(parsed.data.workspaceId);
  if (!row) return void res.status(404).json({ error: 'Workspace not found' });
  const failures = get('PRAGMA foreign_key_check');
  const issues = failures ? ['The local vault contains broken foreign-key references.'] : [];
  res.json(GetWorkspaceIntegrityResponse.parse({ healthy: issues.length === 0, issues }));
});

router.get('/workspaces/:workspaceId/export', (req, res) => {
  const parsed = ExportWorkspaceParams.safeParse(req.params);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  const row = getWorkspaceRow(parsed.data.workspaceId);
  if (!row) return void res.status(404).json({ error: 'Workspace not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${row.slug}-workspace.json"`);
  res.json(ExportWorkspaceResponse.parse({
    schemaVersion: 1, exportedAt: new Date(), workspace: workspaceFromRow(row),
    metrics: metricsForWorkspace(parsed.data.workspaceId),
  }));
});

export default router;
