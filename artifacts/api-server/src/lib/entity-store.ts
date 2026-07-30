import { all, get, run, type Row } from '@workspace/db';
import type { SQLInputValue } from 'node:sqlite';

export type EntityConfig = {
  table: string;
  fields: Record<string, string>;
  jsonFields?: string[];
};

export const entityConfigs = {
  projects: {
    table: 'projects',
    fields: {
      name: 'name', slug: 'slug', description: 'description', color: 'color',
      status: 'status', purpose: 'purpose', brand: 'brand',
      writingVoice: 'writing_voice', targetAudience: 'target_audience',
      currentGoal: 'current_goal', icon: 'icon', logoPath: 'logo_path',
      owner: 'owner', tags: 'tags', repositoryLinks: 'repository_links',
      preferredExportFormats: 'preferred_export_formats',
      knowledgeDomains: 'knowledge_domains', isFavorite: 'is_favorite',
      isPinned: 'is_pinned', lastOpenedAt: 'last_opened_at',
    },
    jsonFields: ['tags', 'repositoryLinks', 'preferredExportFormats', 'knowledgeDomains'],
  },
  campaigns: {
    table: 'campaigns',
    fields: {
      title: 'title', objective: 'objective', status: 'status',
      platforms: 'platforms', durationWeeks: 'duration_weeks',
      projectId: 'project_id', workspaceId: 'project_id',
      missionStatement: 'mission_statement', successDefinition: 'success_definition',
      campaignType: 'campaign_type', lifecycleStatus: 'lifecycle_status',
      phase: 'phase', audience: 'audience', owner: 'owner',
      startAt: 'start_at', endAt: 'end_at', reviewCadence: 'review_cadence',
      completionCriteria: 'completion_criteria', brandVoice: 'brand_voice',
      publishingRhythm: 'publishing_rhythm', engineeringDomain: 'engineering_domain',
      tags: 'tags', color: 'color', bannerAssetId: 'banner_asset_id',
      coverAssetId: 'cover_asset_id', targetStoryCount: 'target_story_count',
      targetPublicationCount: 'target_publication_count', version: 'version',
      pauseReason: 'pause_reason', completionNote: 'completion_note',
      successAssessment: 'success_assessment', completedAt: 'completed_at',
      archivedAt: 'archived_at', archivedFromStatus: 'archived_from_status',
    },
    jsonFields: ['platforms', 'tags'],
  },
  stories: {
    table: 'stories',
    fields: {
      title: 'title', slug: 'slug', summary: 'summary', content: 'content',
      status: 'status', category: 'category', priority: 'priority',
      audience: 'audience', difficulty: 'difficulty', tags: 'tags',
      projectId: 'project_id', campaignId: 'campaign_id', evidenceScore: 'evidence_score',
      storyType: 'story_type', author: 'author', objective: 'objective',
      targetPlatforms: 'target_platforms', publishAt: 'publish_at',
      wordCount: 'word_count', estimatedReadMinutes: 'estimated_read_minutes',
      version: 'version', archivedAt: 'archived_at',
    },
    jsonFields: ['tags', 'targetPlatforms'],
  },
  evidence: {
    table: 'evidence',
    fields: {
      title: 'title', type: 'type', source: 'source', notes: 'notes',
      content: 'content', tags: 'tags', storyId: 'story_id',
      projectId: 'project_id', workspaceId: 'project_id', repository: 'repository',
      classification: 'classification', lifecycleStatus: 'lifecycle_status',
      reviewStatus: 'review_status', version: 'version', archivedAt: 'archived_at',
    },
    jsonFields: ['tags'],
  },
  assets: {
    table: 'assets',
    fields: {
      title: 'title', type: 'type', url: 'url', filePath: 'file_path',
      tags: 'tags', storyId: 'story_id', campaignId: 'campaign_id', projectId: 'project_id',
    },
    jsonFields: ['tags'],
  },
  knowledge: {
    table: 'knowledge',
    fields: {
      title: 'title', content: 'content', category: 'category',
      tags: 'tags', linkedPageIds: 'linked_page_ids', projectId: 'project_id',
      workspaceId: 'project_id', summary: 'summary', slug: 'slug', owner: 'owner',
      lifecycleStatus: 'lifecycle_status', reviewStatus: 'review_status',
      version: 'version', reviewedAt: 'reviewed_at', archivedAt: 'archived_at',
      supersedesKnowledgeId: 'supersedes_knowledge_id',
    },
    jsonFields: ['tags', 'linkedPageIds'],
  },
  templates: {
    table: 'templates',
    fields: {
      title: 'title', type: 'type', content: 'content', description: 'description',
      projectId: 'project_id',
    },
  },
} satisfies Record<string, EntityConfig>;

function hydrate(config: EntityConfig, row: Row): Row {
  const result: Row = {
    id: Number(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  for (const [apiField, databaseField] of Object.entries(config.fields)) {
    const value = row[databaseField];
    if (config.jsonFields?.includes(apiField)) {
      try {
        result[apiField] = typeof value === 'string' ? JSON.parse(value) : [];
      } catch {
        result[apiField] = [];
      }
    } else {
      result[apiField] = value;
    }
  }
  return result;
}

function serializeValue(config: EntityConfig, field: string, value: unknown): SQLInputValue {
  if (config.jsonFields?.includes(field)) return JSON.stringify(value ?? []);
  if (value === null || typeof value === 'string' || typeof value === 'number' || value instanceof Uint8Array) {
    return value;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  throw new TypeError(`Unsupported value for ${field}`);
}

export function listEntities(
  config: EntityConfig,
  options: { where?: string; params?: SQLInputValue[]; orderBy?: string; limit?: number } = {},
) {
  const where = options.where ? ` WHERE ${options.where}` : '';
  const order = options.orderBy ? ` ORDER BY ${options.orderBy}` : '';
  const limit = options.limit ? ` LIMIT ${options.limit}` : '';
  return all(`SELECT * FROM ${config.table}${where}${order}${limit}`, options.params).map((row) => hydrate(config, row));
}

export function getEntity(config: EntityConfig, id: number) {
  const row = get(`SELECT * FROM ${config.table} WHERE id = ?`, [id]);
  return row ? hydrate(config, row) : undefined;
}

export function createEntity(config: EntityConfig, data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([field, value]) => field in config.fields && value !== undefined);
  const columns = entries.map(([field]) => config.fields[field]);
  const params = entries.map(([field, value]) => serializeValue(config, field, value));
  const placeholders = entries.map(() => '?').join(', ');
  const result = run(
    `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders})`,
    params,
  );
  return getEntity(config, Number(result.lastInsertRowid));
}

export function updateEntity(config: EntityConfig, id: number, data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([field, value]) => field in config.fields && value !== undefined);
  if (!entries.length) return getEntity(config, id);
  const assignments = entries.map(([field]) => `${config.fields[field]} = ?`);
  const params = entries.map(([field, value]) => serializeValue(config, field, value));
  run(
    `UPDATE ${config.table} SET ${assignments.join(', ')}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    [...params, id],
  );
  return getEntity(config, id);
}

export function deleteEntity(config: EntityConfig, id: number) {
  const existing = getEntity(config, id);
  if (existing) run(`DELETE FROM ${config.table} WHERE id = ?`, [id]);
  return existing;
}
