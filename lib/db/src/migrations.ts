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
