import { all, get, run, type Row } from '@workspace/db';

export function normalizeStory(row: Row) {
  return { ...row, workspaceId: row.projectId ?? null };
}

export function contentMetrics(content: unknown) {
  const text = String(content ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = text ? text.split(' ').length : 0;
  return { wordCount, estimatedReadMinutes: wordCount ? Math.max(1, Math.ceil(wordCount / 220)) : 0 };
}

export function storyEvent(storyId: number, eventType: string, payload: Record<string, unknown> = {}) {
  run('INSERT INTO story_events (story_id, event_type, payload) VALUES (?, ?, ?)', [
    storyId, eventType, JSON.stringify(payload),
  ]);
}

export function checkpointStory(storyId: number, changeSummary: string) {
  const story = get('SELECT * FROM stories WHERE id = ?', [storyId]);
  if (!story) return;
  run(`
    INSERT INTO story_versions (story_id, version, title, summary, content, metadata, change_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    storyId, Number(story.version), String(story.title), story.summary as string | null,
    story.content as string | null,
    JSON.stringify({
      status: story.status, priority: story.priority, storyType: story.story_type,
      audience: story.audience, tags: JSON.parse(String(story.tags ?? '[]')),
    }),
    changeSummary,
  ]);
}

function component(key: string, label: string, score: number, applicable: boolean, explanation: string) {
  return { key, label, score: Math.max(0, Math.min(100, Math.round(score))), applicable, explanation };
}

export function storyHealth(storyId: number) {
  const story = get('SELECT * FROM stories WHERE id = ?', [storyId]);
  if (!story) return undefined;
  const values = get(`
    SELECT
      (SELECT count(*) FROM story_outline_items WHERE story_id = ?) outline_total,
      (SELECT count(*) FROM story_outline_items WHERE story_id = ? AND completion_status = 'Complete') outline_complete,
      (SELECT count(*) FROM story_evidence WHERE story_id = ?) evidence_count,
      (SELECT count(*) FROM story_knowledge WHERE story_id = ?) knowledge_count,
      (SELECT count(*) FROM story_assets WHERE story_id = ?) asset_count,
      (SELECT count(*) FROM story_outputs WHERE story_id = ?) output_count,
      (SELECT count(*) FROM story_outputs WHERE story_id = ? AND status IN ('Ready', 'Published')) ready_outputs
  `, [storyId, storyId, storyId, storyId, storyId, storyId, storyId]) ?? {};
  const outlineTotal = Number(values.outline_total);
  const contentWords = Number(story.word_count);
  const metadataFields = [story.summary, story.objective, story.story_type, story.audience, story.project_id];
  const metadataScore = metadataFields.filter((value) => value != null && value !== '' && value !== 'Other').length / metadataFields.length * 100;
  const components = [
    component('outline', 'Outline completeness',
      outlineTotal ? Number(values.outline_complete) / outlineTotal * 100 : 0,
      outlineTotal > 0, outlineTotal ? 'Completed outline sections.' : 'Add an outline to establish structure.'),
    component('evidence', 'Evidence coverage', Math.min(100, Number(values.evidence_count) * 25),
      true, `${Number(values.evidence_count)} Evidence item(s) linked.`),
    component('knowledge', 'Knowledge references', Math.min(100, Number(values.knowledge_count) * 34),
      true, `${Number(values.knowledge_count)} Knowledge page(s) linked.`),
    component('assets', 'Asset readiness', Math.min(100, Number(values.asset_count) * 50),
      true, `${Number(values.asset_count)} Asset(s) linked.`),
    component('metadata', 'Metadata completeness', metadataScore, true, 'Required Story context populated.'),
    component('readability', 'Readability', contentWords >= 300 ? 100 : contentWords / 3,
      contentWords > 0, contentWords ? `${contentWords} words available for deterministic review.` : 'Write content to assess readability.'),
    component('outputs', 'Output readiness',
      Number(values.output_count) ? Number(values.ready_outputs) / Number(values.output_count) * 100 : 0,
      Number(values.output_count) > 0, Number(values.output_count) ? 'Ready or published outputs.' : 'Create an output to assess publishing readiness.'),
  ];
  const weights: Record<string, number> = {
    outline: 20, evidence: 25, knowledge: 10, assets: 10, metadata: 15, readability: 10, outputs: 10,
  };
  const applicable = components.filter((item) => item.applicable);
  const applicableWeight = applicable.reduce((sum, item) => sum + weights[item.key], 0);
  const score = applicableWeight
    ? Math.round(applicable.reduce((sum, item) => sum + item.score * weights[item.key], 0) / applicableWeight)
    : 0;
  const blockers: string[] = [];
  if (!story.project_id) blockers.push('Assign the Story to a Workspace.');
  if (!story.summary) blockers.push('Add a Story summary.');
  if (!outlineTotal) blockers.push('Create a Story outline.');
  if (!Number(values.evidence_count)) blockers.push('Link supporting Evidence.');
  if (!Number(values.ready_outputs)) blockers.push('Prepare at least one Output.');
  return { score, insufficientData: applicable.length < 3, blockers, components };
}

function linkedRows(sql: string, params: Array<string | number>, entityType: string) {
  return all(sql, params).map((row) => ({
    id: Number(row.id), title: String(row.title), entityType,
    relationshipType: row.relationship_type == null ? null : String(row.relationship_type),
    notes: row.notes == null ? null : String(row.notes),
  }));
}

export function storyLinks(storyId: number) {
  return {
    evidence: linkedRows(`
      SELECT e.id, e.title, 'Evidence' relationship_type, se.notes
      FROM story_evidence se JOIN evidence e ON e.id = se.evidence_id WHERE se.story_id = ?
    `, [storyId], 'evidence'),
    knowledge: linkedRows(`
      SELECT k.id, k.title, sk.relationship_type, sk.notes
      FROM story_knowledge sk JOIN knowledge k ON k.id = sk.knowledge_id WHERE sk.story_id = ?
    `, [storyId], 'knowledge'),
    assets: linkedRows(`
      SELECT a.id, a.title, sa.role relationship_type, NULL notes
      FROM story_assets sa JOIN assets a ON a.id = sa.asset_id WHERE sa.story_id = ?
    `, [storyId], 'asset'),
    campaigns: linkedRows(`
      SELECT c.id, c.title, CASE WHEN sc.is_primary THEN 'Primary' ELSE 'Campaign' END relationship_type, NULL notes
      FROM story_campaigns sc JOIN campaigns c ON c.id = sc.campaign_id WHERE sc.story_id = ?
    `, [storyId], 'campaign'),
    stories: linkedRows(`
      SELECT s.id, s.title, sr.relationship_type, sr.notes
      FROM story_relations sr JOIN stories s ON s.id = sr.target_story_id WHERE sr.source_story_id = ?
    `, [storyId], 'story'),
  };
}

export const storyLinkConfig = {
  evidence: { table: 'story_evidence', id: 'evidence_id', target: 'evidence', workspace: 'project_id' },
  knowledge: { table: 'story_knowledge', id: 'knowledge_id', target: 'knowledge', workspace: 'project_id' },
  asset: { table: 'story_assets', id: 'asset_id', target: 'assets', workspace: 'project_id' },
  campaign: { table: 'story_campaigns', id: 'campaign_id', target: 'campaigns', workspace: 'project_id' },
} as const;

