import type { DatabaseSync } from 'node:sqlite';

export type Migration = {
  version: number;
  name: string;
  sql: string;
};

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_vault_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        objective TEXT,
        status TEXT NOT NULL DEFAULT 'Planning',
        platforms TEXT NOT NULL DEFAULT '[]',
        duration_weeks INTEGER,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS stories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT,
        summary TEXT,
        content TEXT,
        status TEXT NOT NULL DEFAULT 'Idea',
        category TEXT,
        priority TEXT,
        audience TEXT,
        difficulty TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        evidence_score INTEGER,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS evidence (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Other',
        source TEXT,
        notes TEXT,
        content TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        repository TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Other',
        url TEXT,
        file_path TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        story_id INTEGER REFERENCES stories(id) ON DELETE SET NULL,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS knowledge (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        category TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        linked_page_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'Other',
        content TEXT,
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        entity_title TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS stories_status_idx ON stories(status);
      CREATE INDEX IF NOT EXISTS evidence_type_idx ON evidence(type);
      CREATE INDEX IF NOT EXISTS activity_created_idx ON activity(created_at DESC);
    `,
  },
  {
    version: 2,
    name: 'global_full_text_search',
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS global_search USING fts5(
        entity_type UNINDEXED,
        entity_id UNINDEXED,
        title,
        body,
        tags,
        tokenize = 'porter unicode61'
      );

      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'story', id, title, coalesce(summary, '') || ' ' || coalesce(content, ''), tags FROM stories;
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'evidence', id, title, coalesce(notes, '') || ' ' || coalesce(content, '') || ' ' || coalesce(repository, ''), tags FROM evidence;
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'knowledge', id, title, coalesce(content, ''), tags FROM knowledge;
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'campaign', id, title, coalesce(objective, ''), platforms FROM campaigns;
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'asset', id, title, coalesce(url, '') || ' ' || coalesce(file_path, ''), tags FROM assets;
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'template', id, title, coalesce(description, '') || ' ' || coalesce(content, ''), '' FROM templates;
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'project', id, name, coalesce(description, ''), '' FROM projects;

      CREATE TRIGGER IF NOT EXISTS stories_search_insert AFTER INSERT ON stories BEGIN
        INSERT INTO global_search VALUES ('story', new.id, new.title, coalesce(new.summary, '') || ' ' || coalesce(new.content, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS stories_search_update AFTER UPDATE ON stories BEGIN
        DELETE FROM global_search WHERE entity_type = 'story' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('story', new.id, new.title, coalesce(new.summary, '') || ' ' || coalesce(new.content, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS stories_search_delete AFTER DELETE ON stories BEGIN
        DELETE FROM global_search WHERE entity_type = 'story' AND entity_id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS evidence_search_insert AFTER INSERT ON evidence BEGIN
        INSERT INTO global_search VALUES ('evidence', new.id, new.title, coalesce(new.notes, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(new.repository, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS evidence_search_update AFTER UPDATE ON evidence BEGIN
        DELETE FROM global_search WHERE entity_type = 'evidence' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('evidence', new.id, new.title, coalesce(new.notes, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(new.repository, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS evidence_search_delete AFTER DELETE ON evidence BEGIN
        DELETE FROM global_search WHERE entity_type = 'evidence' AND entity_id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS knowledge_search_insert AFTER INSERT ON knowledge BEGIN
        INSERT INTO global_search VALUES ('knowledge', new.id, new.title, coalesce(new.content, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS knowledge_search_update AFTER UPDATE ON knowledge BEGIN
        DELETE FROM global_search WHERE entity_type = 'knowledge' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('knowledge', new.id, new.title, coalesce(new.content, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS knowledge_search_delete AFTER DELETE ON knowledge BEGIN
        DELETE FROM global_search WHERE entity_type = 'knowledge' AND entity_id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS campaigns_search_insert AFTER INSERT ON campaigns BEGIN
        INSERT INTO global_search VALUES ('campaign', new.id, new.title, coalesce(new.objective, ''), new.platforms);
      END;
      CREATE TRIGGER IF NOT EXISTS campaigns_search_update AFTER UPDATE ON campaigns BEGIN
        DELETE FROM global_search WHERE entity_type = 'campaign' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('campaign', new.id, new.title, coalesce(new.objective, ''), new.platforms);
      END;
      CREATE TRIGGER IF NOT EXISTS campaigns_search_delete AFTER DELETE ON campaigns BEGIN
        DELETE FROM global_search WHERE entity_type = 'campaign' AND entity_id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS assets_search_insert AFTER INSERT ON assets BEGIN
        INSERT INTO global_search VALUES ('asset', new.id, new.title, coalesce(new.url, '') || ' ' || coalesce(new.file_path, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS assets_search_update AFTER UPDATE ON assets BEGIN
        DELETE FROM global_search WHERE entity_type = 'asset' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('asset', new.id, new.title, coalesce(new.url, '') || ' ' || coalesce(new.file_path, ''), new.tags);
      END;
      CREATE TRIGGER IF NOT EXISTS assets_search_delete AFTER DELETE ON assets BEGIN
        DELETE FROM global_search WHERE entity_type = 'asset' AND entity_id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS templates_search_insert AFTER INSERT ON templates BEGIN
        INSERT INTO global_search VALUES ('template', new.id, new.title, coalesce(new.description, '') || ' ' || coalesce(new.content, ''), '');
      END;
      CREATE TRIGGER IF NOT EXISTS templates_search_update AFTER UPDATE ON templates BEGIN
        DELETE FROM global_search WHERE entity_type = 'template' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('template', new.id, new.title, coalesce(new.description, '') || ' ' || coalesce(new.content, ''), '');
      END;
      CREATE TRIGGER IF NOT EXISTS templates_search_delete AFTER DELETE ON templates BEGIN
        DELETE FROM global_search WHERE entity_type = 'template' AND entity_id = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS projects_search_insert AFTER INSERT ON projects BEGIN
        INSERT INTO global_search VALUES ('project', new.id, new.name, coalesce(new.description, ''), '');
      END;
      CREATE TRIGGER IF NOT EXISTS projects_search_update AFTER UPDATE ON projects BEGIN
        DELETE FROM global_search WHERE entity_type = 'project' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('project', new.id, new.name, coalesce(new.description, ''), '');
      END;
      CREATE TRIGGER IF NOT EXISTS projects_search_delete AFTER DELETE ON projects BEGIN
        DELETE FROM global_search WHERE entity_type = 'project' AND entity_id = old.id;
      END;
    `,
  },
  {
    version: 3,
    name: 'workspace_domain_model',
    sql: `
      ALTER TABLE projects ADD COLUMN slug TEXT;
      ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'Active';
      ALTER TABLE projects ADD COLUMN purpose TEXT NOT NULL DEFAULT 'Other';
      ALTER TABLE projects ADD COLUMN brand TEXT;
      ALTER TABLE projects ADD COLUMN writing_voice TEXT;
      ALTER TABLE projects ADD COLUMN target_audience TEXT;
      ALTER TABLE projects ADD COLUMN current_goal TEXT;
      ALTER TABLE projects ADD COLUMN icon TEXT;
      ALTER TABLE projects ADD COLUMN logo_path TEXT;
      ALTER TABLE projects ADD COLUMN owner TEXT NOT NULL DEFAULT 'Local Owner';
      ALTER TABLE projects ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE projects ADD COLUMN repository_links TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE projects ADD COLUMN preferred_export_formats TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE projects ADD COLUMN knowledge_domains TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE projects ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE projects ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE projects ADD COLUMN last_opened_at TEXT;

      ALTER TABLE campaigns ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
      ALTER TABLE knowledge ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
      ALTER TABLE templates ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;

      UPDATE projects
      SET slug = lower(trim(replace(replace(replace(name, ' ', '-'), '_', '-'), '--', '-'))) || '-' || id,
          last_opened_at = updated_at
      WHERE slug IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_idx ON projects(slug);
      CREATE INDEX IF NOT EXISTS projects_status_updated_idx ON projects(status, updated_at DESC);
      CREATE INDEX IF NOT EXISTS campaigns_project_idx ON campaigns(project_id);
      CREATE INDEX IF NOT EXISTS knowledge_project_idx ON knowledge(project_id);
      CREATE INDEX IF NOT EXISTS templates_project_idx ON templates(project_id);
      CREATE INDEX IF NOT EXISTS stories_project_idx ON stories(project_id);
      CREATE INDEX IF NOT EXISTS evidence_project_idx ON evidence(project_id);
      CREATE INDEX IF NOT EXISTS assets_project_idx ON assets(project_id);

      DELETE FROM global_search WHERE entity_type = 'project';
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'workspace', id, name, coalesce(description, ''), tags FROM projects;

      DROP TRIGGER IF EXISTS projects_search_insert;
      DROP TRIGGER IF EXISTS projects_search_update;
      DROP TRIGGER IF EXISTS projects_search_delete;
      CREATE TRIGGER projects_search_insert AFTER INSERT ON projects BEGIN
        INSERT INTO global_search VALUES ('workspace', new.id, new.name, coalesce(new.description, ''), new.tags);
      END;
      CREATE TRIGGER projects_search_update AFTER UPDATE ON projects BEGIN
        DELETE FROM global_search WHERE entity_type = 'workspace' AND entity_id = old.id;
        INSERT INTO global_search VALUES ('workspace', new.id, new.name, coalesce(new.description, ''), new.tags);
      END;
      CREATE TRIGGER projects_search_delete AFTER DELETE ON projects BEGIN
        DELETE FROM global_search WHERE entity_type = 'workspace' AND entity_id = old.id;
      END;
    `,
  },
  {
    version: 4,
    name: 'story_engine',
    sql: `
      ALTER TABLE stories ADD COLUMN story_type TEXT NOT NULL DEFAULT 'Other';
      ALTER TABLE stories ADD COLUMN author TEXT;
      ALTER TABLE stories ADD COLUMN objective TEXT;
      ALTER TABLE stories ADD COLUMN target_platforms TEXT NOT NULL DEFAULT '[]';
      ALTER TABLE stories ADD COLUMN publish_at TEXT;
      ALTER TABLE stories ADD COLUMN word_count INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE stories ADD COLUMN estimated_read_minutes INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE stories ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE stories ADD COLUMN archived_at TEXT;

      CREATE TABLE story_outline_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES story_outline_items(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        title TEXT NOT NULL,
        notes TEXT,
        completion_status TEXT NOT NULL DEFAULT 'Planned',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE story_evidence (
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
        relevance INTEGER NOT NULL DEFAULT 100,
        notes TEXT,
        position INTEGER NOT NULL DEFAULT 0,
        linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (story_id, evidence_id)
      );
      CREATE TABLE story_knowledge (
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL DEFAULT 'Reference',
        notes TEXT,
        linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (story_id, knowledge_id)
      );
      CREATE TABLE story_assets (
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'Supporting',
        position INTEGER NOT NULL DEFAULT 0,
        linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (story_id, asset_id)
      );
      CREATE TABLE story_campaigns (
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        is_primary INTEGER NOT NULL DEFAULT 0,
        linked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (story_id, campaign_id)
      );
      CREATE TABLE story_relations (
        source_story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        target_story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL DEFAULT 'Related',
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        PRIMARY KEY (source_story_id, target_story_id),
        CHECK (source_story_id != target_story_id)
      );
      CREATE TABLE story_outputs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Draft',
        content TEXT,
        format TEXT,
        destination TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE story_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        change_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (story_id, version)
      );
      CREATE TABLE story_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL DEFAULT 'Local Owner',
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      INSERT OR IGNORE INTO story_campaigns (story_id, campaign_id, is_primary)
        SELECT id, campaign_id, 1 FROM stories WHERE campaign_id IS NOT NULL;
      INSERT OR IGNORE INTO story_evidence (story_id, evidence_id)
        SELECT story_id, id FROM evidence WHERE story_id IS NOT NULL;
      INSERT OR IGNORE INTO story_assets (story_id, asset_id)
        SELECT story_id, id FROM assets WHERE story_id IS NOT NULL;
      INSERT OR IGNORE INTO story_versions (story_id, version, title, summary, content, metadata, change_summary)
        SELECT id, 1, title, summary, content,
          json_object('status', status, 'priority', priority, 'tags', json(tags)),
          'Migrated into Story Engine'
        FROM stories;

      CREATE INDEX story_outline_story_position_idx ON story_outline_items(story_id, position);
      CREATE INDEX story_evidence_evidence_idx ON story_evidence(evidence_id);
      CREATE INDEX story_knowledge_knowledge_idx ON story_knowledge(knowledge_id);
      CREATE INDEX story_assets_asset_idx ON story_assets(asset_id);
      CREATE INDEX story_campaigns_campaign_idx ON story_campaigns(campaign_id);
      CREATE INDEX story_relations_target_idx ON story_relations(target_story_id);
      CREATE INDEX story_outputs_story_status_idx ON story_outputs(story_id, status);
      CREATE INDEX story_versions_story_version_idx ON story_versions(story_id, version DESC);
      CREATE INDEX story_events_story_created_idx ON story_events(story_id, created_at DESC);
      CREATE INDEX stories_type_status_idx ON stories(story_type, status);
    `,
  },
];

export function runMigrations(database: DatabaseSync): number[] {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
  `);
  const applied = new Set(
    (database.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>)
      .map((row) => Number(row.version)),
  );
  const completed: number[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    database.exec('BEGIN IMMEDIATE');
    try {
      database.exec(migration.sql);
      database.prepare(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      ).run(migration.version, migration.name);
      database.exec('COMMIT');
      completed.push(migration.version);
    } catch (error) {
      database.exec('ROLLBACK');
      throw new Error(`SQLite migration ${migration.version} (${migration.name}) failed`, { cause: error });
    }
  }
  return completed;
}
