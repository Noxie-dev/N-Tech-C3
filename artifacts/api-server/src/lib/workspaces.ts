import { all, get, run, type Row } from '@workspace/db';

const JSON_FIELDS = [
  'tags', 'repository_links', 'preferred_export_formats', 'knowledge_domains',
] as const;

function parseJson(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function workspaceFromRow(row: Row) {
  return {
    id: Number(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: row.description == null ? null : String(row.description),
    color: row.color == null ? null : String(row.color),
    status: String(row.status),
    purpose: String(row.purpose),
    brand: row.brand == null ? null : String(row.brand),
    writingVoice: row.writing_voice == null ? null : String(row.writing_voice),
    targetAudience: row.target_audience == null ? null : String(row.target_audience),
    currentGoal: row.current_goal == null ? null : String(row.current_goal),
    icon: row.icon == null ? null : String(row.icon),
    logoPath: row.logo_path == null ? null : String(row.logo_path),
    owner: String(row.owner),
    tags: parseJson(row.tags),
    repositoryLinks: parseJson(row.repository_links),
    preferredExportFormats: parseJson(row.preferred_export_formats),
    knowledgeDomains: parseJson(row.knowledge_domains),
    isFavorite: Boolean(row.is_favorite),
    isPinned: Boolean(row.is_pinned),
    lastOpenedAt: row.last_opened_at == null ? null : String(row.last_opened_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function makeSlug(name: string, excludeId?: number) {
  const root = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace';
  let slug = root;
  let suffix = 2;
  while (get(
    `SELECT id FROM projects WHERE slug = ?${excludeId == null ? '' : ' AND id != ?'}`,
    excludeId == null ? [slug] : [slug, excludeId],
  )) {
    slug = `${root}-${suffix++}`;
  }
  return slug;
}

export function getWorkspaceRow(id: number) {
  return get('SELECT * FROM projects WHERE id = ?', [id]);
}

export function metricsForWorkspace(id: number) {
  const counts = get(`
    SELECT
      (SELECT count(*) FROM stories WHERE project_id = ?) stories,
      (SELECT count(*) FROM evidence WHERE project_id = ?) evidence,
      (SELECT count(*) FROM knowledge WHERE project_id = ?) knowledge,
      (SELECT count(*) FROM campaigns WHERE project_id = ?) campaigns,
      (SELECT count(*) FROM assets WHERE project_id = ?) assets
  `, [id, id, id, id, id]) ?? {};
  return {
    stories: Number(counts.stories ?? 0),
    evidence: Number(counts.evidence ?? 0),
    knowledge: Number(counts.knowledge ?? 0),
    campaigns: Number(counts.campaigns ?? 0),
    assets: Number(counts.assets ?? 0),
    exports: 0,
  };
}

function ratioScore(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

export function healthForWorkspace(id: number) {
  const values = get(`
    SELECT
      (SELECT count(*) FROM activity
        WHERE created_at >= datetime('now', '-30 days') AND (
          (entity_type = 'workspace' AND entity_id = ?) OR
          (entity_type = 'story' AND entity_id IN (SELECT id FROM stories WHERE project_id = ?)) OR
          (entity_type = 'evidence' AND entity_id IN (SELECT id FROM evidence WHERE project_id = ?)) OR
          (entity_type = 'campaign' AND entity_id IN (SELECT id FROM campaigns WHERE project_id = ?)) OR
          (entity_type = 'knowledge' AND entity_id IN (SELECT id FROM knowledge WHERE project_id = ?)) OR
          (entity_type = 'asset' AND entity_id IN (SELECT id FROM assets WHERE project_id = ?))
        )) recent_activity,
      (SELECT count(*) FROM stories WHERE project_id = ? AND status NOT IN ('Published', 'Archived')) active_stories,
      (SELECT count(DISTINCT s.id) FROM stories s JOIN evidence e ON e.story_id = s.id
        WHERE s.project_id = ? AND s.status NOT IN ('Published', 'Archived')) stories_with_evidence,
      (SELECT count(*) FROM stories WHERE project_id = ? AND campaign_id IS NOT NULL
        AND status NOT IN ('Published', 'Archived')) stories_with_campaign,
      (SELECT count(*) FROM knowledge WHERE project_id = ?) knowledge_total,
      (SELECT count(*) FROM knowledge WHERE project_id = ? AND json_array_length(linked_page_ids) > 0) knowledge_linked,
      (SELECT count(*) FROM assets WHERE project_id = ?) assets_total,
      (SELECT count(*) FROM assets WHERE project_id = ? AND (story_id IS NOT NULL OR campaign_id IS NOT NULL)) assets_linked
  `, [id, id, id, id, id, id, id, id, id, id, id, id, id]) ?? {};
  const activeStories = Number(values.active_stories ?? 0);
  const knowledgeTotal = Number(values.knowledge_total ?? 0);
  const assetsTotal = Number(values.assets_total ?? 0);
  const components = [
    {
      key: 'recentActivity', label: 'Recent activity',
      score: Number(values.recent_activity) > 0 ? 100 : 0, applicable: true,
      explanation: Number(values.recent_activity) > 0 ? 'Activity recorded in the last 30 days.' : 'No activity in the last 30 days.',
    },
    {
      key: 'evidenceCoverage', label: 'Evidence coverage',
      score: ratioScore(Number(values.stories_with_evidence), activeStories),
      applicable: activeStories > 0,
      explanation: activeStories > 0 ? 'Active stories supported by evidence.' : 'No active stories to assess.',
    },
    {
      key: 'campaignCoverage', label: 'Campaign coverage',
      score: ratioScore(Number(values.stories_with_campaign), activeStories),
      applicable: activeStories > 0,
      explanation: activeStories > 0 ? 'Active stories assigned to campaigns.' : 'No active stories to assess.',
    },
    {
      key: 'knowledgeConnections', label: 'Knowledge connections',
      score: ratioScore(Number(values.knowledge_linked), knowledgeTotal),
      applicable: knowledgeTotal > 0,
      explanation: knowledgeTotal > 0 ? 'Knowledge pages connected to other pages.' : 'No knowledge pages to assess.',
    },
    {
      key: 'assetConnections', label: 'Asset connections',
      score: ratioScore(Number(values.assets_linked), assetsTotal),
      applicable: assetsTotal > 0,
      explanation: assetsTotal > 0 ? 'Assets linked to a story or campaign.' : 'No assets to assess.',
    },
  ];
  const applicable = components.filter((component) => component.applicable);
  return {
    score: applicable.length ? Math.round(applicable.reduce((sum, component) => sum + component.score, 0) / applicable.length) : 0,
    insufficientData: applicable.length < 2,
    components,
  };
}

export function summarizeWorkspace(row: Row) {
  const workspace = workspaceFromRow(row);
  return { ...workspace, metrics: metricsForWorkspace(workspace.id), health: healthForWorkspace(workspace.id) };
}

export function workspaceOverview(row: Row) {
  const summary = summarizeWorkspace(row);
  const recentActivity = all(`
    SELECT * FROM activity WHERE
      (entity_type = 'workspace' AND entity_id = ?) OR
      (entity_type = 'story' AND entity_id IN (SELECT id FROM stories WHERE project_id = ?)) OR
      (entity_type = 'evidence' AND entity_id IN (SELECT id FROM evidence WHERE project_id = ?)) OR
      (entity_type = 'campaign' AND entity_id IN (SELECT id FROM campaigns WHERE project_id = ?)) OR
      (entity_type = 'knowledge' AND entity_id IN (SELECT id FROM knowledge WHERE project_id = ?)) OR
      (entity_type = 'asset' AND entity_id IN (SELECT id FROM assets WHERE project_id = ?))
    ORDER BY created_at DESC LIMIT 8
  `, [summary.id, summary.id, summary.id, summary.id, summary.id, summary.id]).map((item) => ({
    id: Number(item.id), entityType: String(item.entity_type), entityId: Number(item.entity_id),
    entityTitle: String(item.entity_title), action: String(item.action), createdAt: String(item.created_at),
  }));
  const story = get(`
    SELECT id, title, status FROM stories WHERE project_id = ?
      AND status NOT IN ('Published', 'Archived') ORDER BY updated_at DESC LIMIT 1
  `, [summary.id]);
  return {
    ...summary,
    recentActivity,
    continueWorking: story ? { id: Number(story.id), title: String(story.title), status: String(story.status) } : null,
  };
}

export function serializeWorkspaceField(field: string, value: unknown) {
  if ((JSON_FIELDS as readonly string[]).includes(field)) return JSON.stringify(value ?? []);
  if (field === 'is_favorite' || field === 'is_pinned') return value ? 1 : 0;
  return value;
}
