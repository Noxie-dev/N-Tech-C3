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
  {
    version: 5,
    name: 'durable_events_and_intelligence_results',
    sql: `
      ALTER TABLE activity ADD COLUMN source_event_id INTEGER;

      CREATE TABLE domain_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        aggregate_type TEXT NOT NULL,
        aggregate_id INTEGER NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX domain_events_aggregate_idx
        ON domain_events(aggregate_type, aggregate_id, id);

      CREATE TABLE event_consumers (
        consumer_name TEXT PRIMARY KEY,
        last_event_id INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE event_failures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consumer_name TEXT NOT NULL,
        event_id INTEGER NOT NULL REFERENCES domain_events(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        failed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (consumer_name, event_id)
      );

      CREATE UNIQUE INDEX activity_source_event_idx
        ON activity(source_event_id) WHERE source_event_id IS NOT NULL;

      CREATE TABLE intelligence_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        result_key TEXT NOT NULL UNIQUE,
        capability_id TEXT NOT NULL,
        capability_version TEXT NOT NULL,
        result_kind TEXT NOT NULL,
        subject_type TEXT NOT NULL,
        subject_id INTEGER NOT NULL,
        input_watermark TEXT NOT NULL,
        classification TEXT NOT NULL,
        value TEXT NOT NULL,
        explanation TEXT NOT NULL,
        evidence_refs TEXT NOT NULL DEFAULT '[]',
        confidence REAL,
        calculated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        invalidated_at TEXT
      );
      CREATE INDEX intelligence_results_subject_idx
        ON intelligence_results(subject_type, subject_id, calculated_at DESC);
      CREATE INDEX intelligence_results_capability_idx
        ON intelligence_results(capability_id, capability_version);
    `,
  },
  {
    version: 6,
    name: 'evidence_contracts_and_legacy_backfill',
    sql: `
      ALTER TABLE evidence ADD COLUMN classification TEXT NOT NULL DEFAULT 'FactualRecord'
        CHECK (classification IN ('FactualRecord', 'Observation', 'Testimony', 'DerivedAnalysis', 'ExternalReference'));
      ALTER TABLE evidence ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'Active'
        CHECK (lifecycle_status IN ('CapturePending', 'Active', 'Archived', 'IngestFailed'));
      ALTER TABLE evidence ADD COLUMN review_status TEXT NOT NULL DEFAULT 'Unreviewed'
        CHECK (review_status IN ('Unreviewed', 'Reviewed', 'Disputed'));
      ALTER TABLE evidence ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);
      ALTER TABLE evidence ADD COLUMN archived_at TEXT;

      UPDATE evidence
      SET classification = CASE
        WHEN type = 'RepositoryAudit' THEN 'DerivedAnalysis'
        WHEN type = 'MeetingNotes' THEN 'Testimony'
        WHEN type = 'Other' THEN 'ExternalReference'
        ELSE 'FactualRecord'
      END;

      CREATE TABLE evidence_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE RESTRICT,
        version INTEGER NOT NULL CHECK (version > 0),
        source_kind TEXT NOT NULL
          CHECK (source_kind IN ('ManagedFile', 'InlineText', 'ExternalReference', 'RepositorySnapshot')),
        media_type TEXT,
        original_name TEXT,
        byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
        sha256 TEXT CHECK (
          sha256 IS NULL OR (
            length(sha256) = 64
            AND sha256 = lower(sha256)
            AND sha256 NOT GLOB '*[^0-9a-f]*'
          )
        ),
        vault_path TEXT,
        inline_content TEXT,
        origin_uri TEXT,
        repository_id INTEGER,
        repository_revision TEXT,
        capture_method TEXT NOT NULL,
        producer_metadata TEXT NOT NULL DEFAULT '{}'
          CHECK (json_valid(producer_metadata)),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (evidence_id, version),
        CHECK (vault_path IS NULL OR (
          vault_path NOT LIKE '/%'
          AND vault_path NOT LIKE '%..%'
          AND vault_path NOT LIKE '%\\%'
        ))
      );

      CREATE TABLE evidence_ingests (
        id TEXT PRIMARY KEY,
        workspace_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
        staged_path TEXT,
        final_path TEXT,
        original_name TEXT NOT NULL,
        media_type TEXT,
        byte_size INTEGER CHECK (byte_size IS NULL OR byte_size >= 0),
        sha256 TEXT CHECK (
          sha256 IS NULL OR (
            length(sha256) = 64
            AND sha256 = lower(sha256)
            AND sha256 NOT GLOB '*[^0-9a-f]*'
          )
        ),
        state TEXT NOT NULL DEFAULT 'Staged'
          CHECK (state IN ('Staged', 'MetadataCommitted', 'Promoted', 'Completed', 'Compensating', 'Failed')),
        retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
        error_category TEXT,
        evidence_id INTEGER REFERENCES evidence(id) ON DELETE SET NULL,
        source_id INTEGER REFERENCES evidence_sources(id) ON DELETE SET NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (staged_path IS NULL OR (
          staged_path NOT LIKE '/%'
          AND staged_path NOT LIKE '%..%'
          AND staged_path NOT LIKE '%\\%'
        )),
        CHECK (final_path IS NULL OR (
          final_path NOT LIKE '/%'
          AND final_path NOT LIKE '%..%'
          AND final_path NOT LIKE '%\\%'
        ))
      );

      CREATE TABLE evidence_source_locators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL REFERENCES evidence_sources(id) ON DELETE CASCADE,
        locator_version INTEGER NOT NULL DEFAULT 1 CHECK (locator_version > 0),
        kind TEXT NOT NULL
          CHECK (kind IN ('WholeArtifact', 'TextRange', 'Page', 'Timestamp', 'ImageRegion', 'RepositoryPath', 'JsonPointer')),
        coordinates TEXT NOT NULL DEFAULT '{}'
          CHECK (json_valid(coordinates)),
        label TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE evidence_migration_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
        issue_code TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('Info', 'Warning', 'ActionRequired')),
        details TEXT NOT NULL,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (evidence_id, issue_code)
      );

      CREATE TABLE feature_flags (
        flag_key TEXT PRIMARY KEY,
        enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
        description TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      INSERT INTO feature_flags (flag_key, enabled, description) VALUES
        ('evidence.canonical-contracts', 1, 'Require canonical Workspace ownership and expose governed Evidence metadata'),
        ('evidence.source-versions', 0, 'Read and write immutable Evidence source versions through canonical endpoints'),
        ('evidence.recoverable-ingest', 0, 'Use staged, compensating managed-file ingestion'),
        ('evidence.detail-route', 0, 'Expose the canonical Evidence inspector route');

      INSERT INTO evidence_sources (
        evidence_id,
        version,
        source_kind,
        original_name,
        sha256,
        vault_path,
        inline_content,
        origin_uri,
        repository_revision,
        capture_method,
        producer_metadata,
        created_at
      )
      SELECT
        id,
        1,
        CASE
          WHEN type = 'RepositoryAudit' THEN 'RepositorySnapshot'
          WHEN source IS NOT NULL
            AND (lower(source) LIKE 'http://%' OR lower(source) LIKE 'https://%')
            THEN 'ExternalReference'
          WHEN source IS NOT NULL THEN 'ManagedFile'
          WHEN content IS NOT NULL THEN 'InlineText'
          ELSE 'ExternalReference'
        END,
        CASE
          WHEN source IS NOT NULL
            AND lower(source) NOT LIKE 'http://%'
            AND lower(source) NOT LIKE 'https://%'
            AND instr(source, '/') = 0
            THEN source
          ELSE NULL
        END,
        CASE
          WHEN length(notes) = 73
            AND substr(notes, 1, 9) = 'SHA-256: '
            AND lower(substr(notes, 10, 64)) NOT GLOB '*[^0-9a-f]*'
            THEN lower(substr(notes, 10, 64))
          ELSE NULL
        END,
        CASE
          WHEN source IS NOT NULL
            AND lower(source) NOT LIKE 'http://%'
            AND lower(source) NOT LIKE 'https://%'
            THEN source
          ELSE NULL
        END,
        content,
        CASE
          WHEN source IS NOT NULL
            AND (lower(source) LIKE 'http://%' OR lower(source) LIKE 'https://%')
            THEN source
          ELSE NULL
        END,
        CASE WHEN type = 'RepositoryAudit' THEN repository ELSE NULL END,
        'LegacyMigration',
        json_object(
          'legacyType', type,
          'legacyRepository', repository,
          'legacySourcePreserved', source IS NOT NULL,
          'legacyContentPreserved', content IS NOT NULL
        ),
        created_at
      FROM evidence;

      INSERT INTO evidence_migration_audit (evidence_id, issue_code, severity, details)
        SELECT id, 'UnassignedWorkspace', 'ActionRequired',
          'Legacy Evidence has no Workspace. User assignment is required; no Workspace was inferred.'
        FROM evidence WHERE project_id IS NULL;

      INSERT INTO evidence_migration_audit (evidence_id, issue_code, severity, details)
        SELECT id, 'MissingSource', 'ActionRequired',
          'Legacy Evidence has neither source nor inline content. A placeholder source version was preserved without inventing provenance.'
        FROM evidence WHERE source IS NULL AND content IS NULL;

      INSERT INTO evidence_migration_audit (evidence_id, issue_code, severity, details)
        SELECT id, 'ChecksumUnavailable', 'Warning',
          'No exact legacy SHA-256 note was available. Integrity remains pending until source verification.'
        FROM evidence
        WHERE NOT (
          coalesce(length(notes), 0) = 73
          AND substr(notes, 1, 9) = 'SHA-256: '
          AND lower(substr(notes, 10, 64)) NOT GLOB '*[^0-9a-f]*'
        );

      INSERT INTO evidence_migration_audit (evidence_id, issue_code, severity, details)
        SELECT id, 'ChecksumRecovered', 'Info',
          'An exact legacy SHA-256 note was copied into structured source metadata.'
        FROM evidence
        WHERE length(notes) = 73
          AND substr(notes, 1, 9) = 'SHA-256: '
          AND lower(substr(notes, 10, 64)) NOT GLOB '*[^0-9a-f]*';

      INSERT OR IGNORE INTO story_evidence (story_id, evidence_id)
        SELECT story_id, id FROM evidence WHERE story_id IS NOT NULL;

      CREATE INDEX evidence_workspace_lifecycle_idx
        ON evidence(project_id, lifecycle_status, created_at DESC);
      CREATE INDEX evidence_classification_review_idx
        ON evidence(classification, review_status);
      CREATE INDEX evidence_sources_evidence_version_idx
        ON evidence_sources(evidence_id, version DESC);
      CREATE INDEX evidence_sources_sha256_idx
        ON evidence_sources(sha256) WHERE sha256 IS NOT NULL;
      CREATE INDEX evidence_sources_vault_path_idx
        ON evidence_sources(vault_path) WHERE vault_path IS NOT NULL;
      CREATE INDEX evidence_ingests_state_updated_idx
        ON evidence_ingests(state, updated_at);
      CREATE INDEX evidence_locators_source_idx
        ON evidence_source_locators(source_id, created_at);
      CREATE INDEX evidence_migration_audit_issue_idx
        ON evidence_migration_audit(issue_code, severity);
    `,
  },
  {
    version: 7,
    name: 'recoverable_evidence_ingest_payload',
    sql: `
      ALTER TABLE evidence_ingests ADD COLUMN capture_payload TEXT NOT NULL DEFAULT '{}'
        CHECK (json_valid(capture_payload));

      UPDATE feature_flags
      SET enabled = 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE flag_key = 'evidence.recoverable-ingest';
    `,
  },
  {
    version: 8,
    name: 'governed_evidence_operations',
    sql: `
      ALTER TABLE story_evidence ADD COLUMN role TEXT NOT NULL DEFAULT 'Supporting'
        CHECK (role IN ('Supporting', 'Contradicting', 'Context', 'Primary'));
      ALTER TABLE story_evidence ADD COLUMN source_locator_id INTEGER
        REFERENCES evidence_source_locators(id) ON DELETE SET NULL;

      CREATE INDEX story_evidence_timeline_idx
        ON story_evidence(evidence_id, linked_at DESC);

      DROP TRIGGER IF EXISTS evidence_search_insert;
      DROP TRIGGER IF EXISTS evidence_search_update;
      DROP TRIGGER IF EXISTS evidence_search_delete;

      DELETE FROM global_search WHERE entity_type = 'evidence';
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'evidence', id, title,
          coalesce(notes, '') || ' ' || coalesce(content, '') || ' ' || coalesce(source, ''),
          tags
        FROM evidence
        WHERE lifecycle_status = 'Active';

      CREATE TRIGGER evidence_search_insert AFTER INSERT ON evidence
      WHEN new.lifecycle_status = 'Active'
      BEGIN
        INSERT INTO global_search VALUES (
          'evidence', new.id, new.title,
          coalesce(new.notes, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(new.source, ''),
          new.tags
        );
      END;

      CREATE TRIGGER evidence_search_update AFTER UPDATE ON evidence
      BEGIN
        DELETE FROM global_search WHERE entity_type = 'evidence' AND entity_id = old.id;
        INSERT INTO global_search(entity_type, entity_id, title, body, tags)
          SELECT 'evidence', new.id, new.title,
            coalesce(new.notes, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(new.source, ''),
            new.tags
          WHERE new.lifecycle_status = 'Active';
      END;

      CREATE TRIGGER evidence_search_delete AFTER DELETE ON evidence
      BEGIN
        DELETE FROM global_search WHERE entity_type = 'evidence' AND entity_id = old.id;
      END;
    `,
  },
  {
    version: 9,
    name: 'evidence_inspector_rollout',
    sql: `
      CREATE UNIQUE INDEX evidence_locator_identity_idx
        ON evidence_source_locators(source_id, kind, coordinates);

      UPDATE feature_flags
      SET enabled = 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE flag_key IN ('evidence.source-versions', 'evidence.detail-route');
    `,
  },
  {
    version: 10,
    name: 'evidence_integrity_jobs',
    sql: `
      CREATE TABLE evidence_integrity_jobs (
        id TEXT PRIMARY KEY,
        evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
        state TEXT NOT NULL CHECK (state IN ('Queued', 'Running', 'Completed', 'Failed', 'Cancelled')),
        input_watermark TEXT,
        error_category TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        started_at TEXT,
        completed_at TEXT
      );
      CREATE INDEX evidence_integrity_jobs_subject_idx
        ON evidence_integrity_jobs(evidence_id, created_at DESC);
    `,
  },
  {
    version: 11,
    name: 'governed_knowledge_domain',
    sql: `
      ALTER TABLE knowledge ADD COLUMN summary TEXT;
      ALTER TABLE knowledge ADD COLUMN slug TEXT;
      ALTER TABLE knowledge ADD COLUMN owner TEXT;
      ALTER TABLE knowledge ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'Draft'
        CHECK (lifecycle_status IN ('Idea', 'Research', 'Draft', 'Verified', 'Canonical', 'Archived'));
      ALTER TABLE knowledge ADD COLUMN review_status TEXT NOT NULL DEFAULT 'Unreviewed'
        CHECK (review_status IN ('Unreviewed', 'InReview', 'ChangesRequested', 'Approved'));
      ALTER TABLE knowledge ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE knowledge ADD COLUMN reviewed_at TEXT;
      ALTER TABLE knowledge ADD COLUMN archived_at TEXT;
      ALTER TABLE knowledge ADD COLUMN supersedes_knowledge_id INTEGER
        REFERENCES knowledge(id) ON DELETE SET NULL;

      CREATE TABLE knowledge_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        target_knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        relationship_type TEXT NOT NULL
          CHECK (relationship_type IN ('RelatedTo', 'DependsOn', 'Explains', 'Contradicts', 'Supersedes', 'DerivedFrom')),
        notes TEXT,
        created_by TEXT NOT NULL DEFAULT 'Local Owner',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        CHECK (source_knowledge_id != target_knowledge_id),
        UNIQUE (source_knowledge_id, target_knowledge_id, relationship_type)
      );

      CREATE TABLE knowledge_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        statement TEXT NOT NULL,
        claim_kind TEXT NOT NULL DEFAULT 'Assertion'
          CHECK (claim_kind IN ('Assertion', 'Decision', 'Definition', 'Procedure', 'Observation')),
        support_status TEXT NOT NULL DEFAULT 'Unsupported'
          CHECK (support_status IN ('Unsupported', 'PartiallySupported', 'Supported', 'Corroborated', 'Conflicting', 'Stale')),
        review_status TEXT NOT NULL DEFAULT 'Unreviewed'
          CHECK (review_status IN ('Unreviewed', 'InReview', 'ChangesRequested', 'HumanVerified')),
        reviewer TEXT,
        reviewed_at TEXT,
        version INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );

      CREATE TABLE knowledge_claim_citations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL REFERENCES knowledge_claims(id) ON DELETE CASCADE,
        evidence_id INTEGER NOT NULL REFERENCES evidence(id) ON DELETE RESTRICT,
        source_id INTEGER NOT NULL REFERENCES evidence_sources(id) ON DELETE RESTRICT,
        locator_id INTEGER REFERENCES evidence_source_locators(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (claim_id, source_id, locator_id)
      );

      CREATE TABLE knowledge_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        change_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (knowledge_id, version)
      );

      CREATE TABLE knowledge_migration_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL REFERENCES knowledge(id) ON DELETE CASCADE,
        issue_code TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('Info', 'Warning', 'ActionRequired')),
        detail TEXT NOT NULL,
        resolved_at TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE (knowledge_id, issue_code, detail)
      );

      INSERT INTO knowledge_versions (
        knowledge_id, version, title, summary, content, metadata, change_summary
      )
      SELECT id, 1, title, summary, content,
        json_object('category', category, 'tags', json(tags), 'lifecycleStatus', 'Draft'),
        'Legacy Knowledge migration'
      FROM knowledge;

      INSERT OR IGNORE INTO knowledge_migration_audit (knowledge_id, issue_code, severity, detail)
      SELECT id, 'UnassignedWorkspace', 'ActionRequired',
        'Assign this Knowledge page to a Workspace before canonical mutation.'
      FROM knowledge WHERE project_id IS NULL;

      INSERT OR IGNORE INTO knowledge_relationships (
        source_knowledge_id, target_knowledge_id, relationship_type, created_by
      )
      SELECT source.id, CAST(link.value AS INTEGER), 'RelatedTo', 'LegacyMigration'
      FROM knowledge source, json_each(
        CASE WHEN json_valid(source.linked_page_ids) THEN source.linked_page_ids ELSE '[]' END
      ) link
      JOIN knowledge target ON target.id = CAST(link.value AS INTEGER)
      WHERE CAST(link.value AS INTEGER) != source.id
        AND source.project_id IS NOT NULL
        AND target.project_id = source.project_id;

      INSERT OR IGNORE INTO knowledge_migration_audit (knowledge_id, issue_code, severity, detail)
      SELECT source.id, 'InvalidLegacyLink', 'Warning',
        'Legacy linked page ID ' || CAST(link.value AS TEXT) || ' was not migrated.'
      FROM knowledge source, json_each(
        CASE WHEN json_valid(source.linked_page_ids) THEN source.linked_page_ids ELSE '[]' END
      ) link
      LEFT JOIN knowledge target ON target.id = CAST(link.value AS INTEGER)
      WHERE target.id IS NULL
        OR target.id = source.id
        OR source.project_id IS NULL
        OR target.project_id IS NULL
        OR target.project_id != source.project_id;

      CREATE INDEX knowledge_lifecycle_workspace_idx
        ON knowledge(project_id, lifecycle_status, updated_at DESC);
      CREATE UNIQUE INDEX knowledge_workspace_slug_idx
        ON knowledge(project_id, slug) WHERE slug IS NOT NULL;
      CREATE INDEX knowledge_relationship_target_idx
        ON knowledge_relationships(target_knowledge_id, created_at DESC);
      CREATE INDEX knowledge_claim_position_idx
        ON knowledge_claims(knowledge_id, position, id);
      CREATE INDEX knowledge_citation_evidence_idx
        ON knowledge_claim_citations(evidence_id, source_id);
      CREATE INDEX knowledge_versions_subject_idx
        ON knowledge_versions(knowledge_id, version DESC);
      CREATE INDEX knowledge_audit_open_idx
        ON knowledge_migration_audit(knowledge_id, resolved_at);

      DROP TRIGGER IF EXISTS knowledge_search_insert;
      DROP TRIGGER IF EXISTS knowledge_search_update;
      DROP TRIGGER IF EXISTS knowledge_search_delete;
      DELETE FROM global_search WHERE entity_type = 'knowledge';
      INSERT INTO global_search(entity_type, entity_id, title, body, tags)
        SELECT 'knowledge', id, title,
          coalesce(summary, '') || ' ' || coalesce(content, '') || ' ' || coalesce(category, ''),
          tags
        FROM knowledge WHERE lifecycle_status != 'Archived';

      CREATE TRIGGER knowledge_search_insert AFTER INSERT ON knowledge
      WHEN new.lifecycle_status != 'Archived'
      BEGIN
        INSERT INTO global_search VALUES (
          'knowledge', new.id, new.title,
          coalesce(new.summary, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(new.category, ''),
          new.tags
        );
      END;
      CREATE TRIGGER knowledge_search_update AFTER UPDATE ON knowledge
      BEGIN
        DELETE FROM global_search WHERE entity_type = 'knowledge' AND entity_id = old.id;
        INSERT INTO global_search(entity_type, entity_id, title, body, tags)
          SELECT 'knowledge', new.id, new.title,
            coalesce(new.summary, '') || ' ' || coalesce(new.content, '') || ' ' || coalesce(new.category, ''),
            new.tags
          WHERE new.lifecycle_status != 'Archived';
      END;
      CREATE TRIGGER knowledge_search_delete AFTER DELETE ON knowledge
      BEGIN
        DELETE FROM global_search WHERE entity_type = 'knowledge' AND entity_id = old.id;
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
