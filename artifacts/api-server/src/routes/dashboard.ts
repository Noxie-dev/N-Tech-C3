import { Router, type IRouter } from 'express';
import { GetDashboardStatsResponse, GetRecentActivityResponse } from '@workspace/api-zod';
import { all, get } from '@workspace/db';

const router: IRouter = Router();

function count(table: string, where = '', params: Array<string | number> = []) {
  const row = get(`SELECT COUNT(*) AS count FROM ${table}${where ? ` WHERE ${where}` : ''}`, params);
  return Number(row?.count ?? 0);
}

router.get('/dashboard/stats', (_req, res) => {
  const storiesByStatus = all('SELECT status, COUNT(*) AS count FROM stories GROUP BY status')
    .map((row) => ({ status: String(row.status), count: Number(row.count) }));
  res.json(GetDashboardStatsResponse.parse({
    totalStories: count('stories'),
    totalCampaigns: count('campaigns'),
    totalEvidence: count('evidence'),
    totalAssets: count('assets'),
    totalKnowledge: count('knowledge'),
    activeCampaigns: count('campaigns', 'status = ?', ['Active']),
    storiesByStatus,
  }));
});

router.get('/activity', (_req, res) => {
  const items = all(`
    SELECT id, entity_type, entity_id, entity_title, action, created_at
    FROM activity ORDER BY created_at DESC LIMIT 30
  `).map((row) => ({
    id: Number(row.id),
    entityType: row.entity_type,
    entityId: Number(row.entity_id),
    entityTitle: row.entity_title,
    action: row.action,
    createdAt: row.created_at,
  }));
  res.json(GetRecentActivityResponse.parse(items));
});

export default router;
