import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { migrations, runMigrations } from './migrations';

describe('SQLite migrations', () => {
  it('applies pending migrations once and records their versions', () => {
    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');

    expect(runMigrations(database)).toEqual(migrations.map(({ version }) => version));
    expect(runMigrations(database)).toEqual([]);
    expect(database.prepare('SELECT version, name FROM schema_migrations').all()).toEqual(
      migrations.map(({ version, name }) => ({ version, name })),
    );
  });

  it('enforces V1 relationship foreign keys', () => {
    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    runMigrations(database);

    expect(() => {
      database.prepare(
        "INSERT INTO stories (title, project_id) VALUES ('Invalid relation', 999)",
      ).run();
    }).toThrow();
  });

  it('indexes new content through FTS triggers', () => {
    const database = new DatabaseSync(':memory:');
    runMigrations(database);
    database.prepare(
      "INSERT INTO evidence (title, type, content) VALUES (?, 'TerminalOutput', ?)",
    ).run('Build trace', 'renderer pipeline completed');

    const matches = database.prepare(
      "SELECT title FROM global_search WHERE global_search MATCH 'pipeline'",
    ).all();
    expect(matches).toEqual([{ title: 'Build trace' }]);
  });

  it('upgrades projects into the workspace domain without losing relationships', () => {
    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    runMigrations(database);
    const workspace = database.prepare(
      "INSERT INTO projects (name, slug, tags) VALUES ('N-Tech C3', 'n-tech-c3', '[\"platform\"]')",
    ).run();
    database.prepare(
      "INSERT INTO campaigns (title, project_id) VALUES ('Launch', ?)",
    ).run(workspace.lastInsertRowid);

    expect(database.prepare(
      'SELECT name, slug, status, purpose FROM projects WHERE id = ?',
    ).get(workspace.lastInsertRowid)).toEqual({
      name: 'N-Tech C3',
      slug: 'n-tech-c3',
      status: 'Active',
      purpose: 'Other',
    });
    expect(database.prepare(
      'SELECT project_id FROM campaigns WHERE title = ?',
    ).get('Launch')).toEqual({ project_id: workspace.lastInsertRowid });
  });

  it('migrates legacy story links into the Story Engine graph', () => {
    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    migrations.slice(0, 3).forEach((migration) => database.exec(migration.sql));
    const workspace = database.prepare("INSERT INTO projects (name, slug) VALUES ('Workspace', 'workspace')").run();
    const campaign = database.prepare("INSERT INTO campaigns (title, project_id) VALUES ('Campaign', ?)").run(workspace.lastInsertRowid);
    const story = database.prepare("INSERT INTO stories (title, project_id, campaign_id) VALUES ('Story', ?, ?)").run(workspace.lastInsertRowid, campaign.lastInsertRowid);
    const evidence = database.prepare("INSERT INTO evidence (title, story_id) VALUES ('Proof', ?)").run(story.lastInsertRowid);
    database.prepare("INSERT INTO assets (title, story_id) VALUES ('Diagram', ?)").run(story.lastInsertRowid);

    database.exec(migrations[3].sql);

    expect(database.prepare('SELECT story_id, campaign_id FROM story_campaigns').get()).toEqual({
      story_id: story.lastInsertRowid,
      campaign_id: campaign.lastInsertRowid,
    });
    expect(database.prepare('SELECT story_id, evidence_id FROM story_evidence').get()).toEqual({
      story_id: story.lastInsertRowid,
      evidence_id: evidence.lastInsertRowid,
    });
    expect(database.prepare('SELECT version, title FROM story_versions').get()).toEqual({
      version: 1,
      title: 'Story',
    });
  });

  it('creates durable event, projection checkpoint, and intelligence result stores', () => {
    const database = new DatabaseSync(':memory:');
    runMigrations(database);

    expect(database.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name IN (
        'domain_events', 'event_consumers', 'event_failures', 'intelligence_results'
      ) ORDER BY name
    `).all()).toEqual([
      { name: 'domain_events' },
      { name: 'event_consumers' },
      { name: 'event_failures' },
      { name: 'intelligence_results' },
    ]);
    expect(database.prepare('PRAGMA table_info(activity)').all())
      .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'source_event_id' })]));
  });

  it('migrates legacy Knowledge conservatively into governed relationships and versions', () => {
    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    migrations.slice(0, 10).forEach((migration) => database.exec(migration.sql));
    const workspace = database.prepare("INSERT INTO projects (name, slug) VALUES ('Knowledge Workspace', 'knowledge-workspace')").run();
    const first = database.prepare(`INSERT INTO knowledge (title, content, project_id)
      VALUES ('Architecture', 'Use an outbox.', ?)`).run(workspace.lastInsertRowid);
    const second = database.prepare(`INSERT INTO knowledge (title, linked_page_ids, project_id)
      VALUES ('Delivery', ?, ?)`).run(JSON.stringify([Number(first.lastInsertRowid), 999]), workspace.lastInsertRowid);
    const unassigned = database.prepare("INSERT INTO knowledge (title) VALUES ('Legacy orphan')").run();

    database.exec(migrations[10].sql);

    expect(database.prepare(`SELECT lifecycle_status, review_status, version
      FROM knowledge WHERE id = ?`).get(first.lastInsertRowid)).toEqual({
      lifecycle_status: 'Draft', review_status: 'Unreviewed', version: 1,
    });
    expect(database.prepare(`SELECT source_knowledge_id, target_knowledge_id, relationship_type
      FROM knowledge_relationships`).get()).toEqual({
      source_knowledge_id: second.lastInsertRowid,
      target_knowledge_id: first.lastInsertRowid,
      relationship_type: 'RelatedTo',
    });
    expect(database.prepare('SELECT version, title FROM knowledge_versions WHERE knowledge_id = ?')
      .get(first.lastInsertRowid)).toEqual({ version: 1, title: 'Architecture' });
    expect(database.prepare(`SELECT issue_code, severity FROM knowledge_migration_audit
      WHERE knowledge_id = ?`).get(unassigned.lastInsertRowid)).toEqual({
      issue_code: 'UnassignedWorkspace', severity: 'ActionRequired',
    });
    expect(database.prepare(`SELECT issue_code FROM knowledge_migration_audit
      WHERE knowledge_id = ? AND issue_code = 'InvalidLegacyLink'`).get(second.lastInsertRowid))
      .toEqual({ issue_code: 'InvalidLegacyLink' });
  });

  it('backfills legacy Evidence conservatively and records migration exceptions', () => {
    const database = new DatabaseSync(':memory:');
    database.exec('PRAGMA foreign_keys = ON');
    migrations.slice(0, 5).forEach((migration) => database.exec(migration.sql));

    const workspace = database.prepare(
      "INSERT INTO projects (name, slug) VALUES ('Evidence Workspace', 'evidence-workspace')",
    ).run();
    const story = database.prepare(
      "INSERT INTO stories (title, project_id) VALUES ('Evidence Story', ?)",
    ).run(workspace.lastInsertRowid);
    const checksum = 'a'.repeat(64);
    const managed = database.prepare(`
      INSERT INTO evidence (title, type, source, notes, story_id, project_id)
      VALUES ('Managed proof', 'Screenshot', 'evidence/proof.png', ?, ?, ?)
    `).run(`SHA-256: ${checksum}`, story.lastInsertRowid, workspace.lastInsertRowid);
    const unassigned = database.prepare(`
      INSERT INTO evidence (title, type, content)
      VALUES ('Unassigned notes', 'MeetingNotes', 'A witnessed observation')
    `).run();
    const missing = database.prepare(`
      INSERT INTO evidence (title, type)
      VALUES ('Unknown legacy evidence', 'Other')
    `).run();

    database.exec(migrations[5].sql);

    expect(database.prepare(`
      SELECT classification, lifecycle_status, review_status, version
      FROM evidence WHERE id = ?
    `).get(unassigned.lastInsertRowid)).toEqual({
      classification: 'Testimony',
      lifecycle_status: 'Active',
      review_status: 'Unreviewed',
      version: 1,
    });
    expect(database.prepare(`
      SELECT source_kind, sha256, vault_path, capture_method
      FROM evidence_sources WHERE evidence_id = ?
    `).get(managed.lastInsertRowid)).toEqual({
      source_kind: 'ManagedFile',
      sha256: checksum,
      vault_path: 'evidence/proof.png',
      capture_method: 'LegacyMigration',
    });
    expect(database.prepare(`
      SELECT source_kind, inline_content
      FROM evidence_sources WHERE evidence_id = ?
    `).get(unassigned.lastInsertRowid)).toEqual({
      source_kind: 'InlineText',
      inline_content: 'A witnessed observation',
    });
    expect(database.prepare(`
      SELECT issue_code, severity FROM evidence_migration_audit
      WHERE evidence_id = ? ORDER BY issue_code
    `).all(missing.lastInsertRowid)).toEqual([
      { issue_code: 'ChecksumUnavailable', severity: 'Warning' },
      { issue_code: 'MissingSource', severity: 'ActionRequired' },
      { issue_code: 'UnassignedWorkspace', severity: 'ActionRequired' },
    ]);
    expect(database.prepare(
      'SELECT story_id, evidence_id FROM story_evidence WHERE story_id = ? AND evidence_id = ?',
    ).get(story.lastInsertRowid, managed.lastInsertRowid)).toEqual({
      story_id: story.lastInsertRowid,
      evidence_id: managed.lastInsertRowid,
    });
    expect(database.prepare(
      "SELECT enabled FROM feature_flags WHERE flag_key = 'evidence.canonical-contracts'",
    ).get()).toEqual({ enabled: 1 });
    expect(database.prepare(
      "SELECT enabled FROM feature_flags WHERE flag_key = 'evidence.recoverable-ingest'",
    ).get()).toEqual({ enabled: 0 });
  });

  it('persists recovery payloads and enables recoverable Evidence ingestion', () => {
    const database = new DatabaseSync(':memory:');
    runMigrations(database);

    expect(database.prepare('PRAGMA table_info(evidence_ingests)').all())
      .toEqual(expect.arrayContaining([expect.objectContaining({
        name: 'capture_payload',
        notnull: 1,
      })]));
    expect(database.prepare(
      "SELECT enabled FROM feature_flags WHERE flag_key = 'evidence.recoverable-ingest'",
    ).get()).toEqual({ enabled: 1 });
  });

  it('keeps archived Evidence out of the rebuildable search projection', () => {
    const database = new DatabaseSync(':memory:');
    runMigrations(database);
    const evidence = database.prepare(`
      INSERT INTO evidence (title, type, content, lifecycle_status)
      VALUES ('Governed proof', 'BuildLog', 'unique replay token', 'Active')
    `).run();

    expect(database.prepare(
      "SELECT count(*) count FROM global_search WHERE global_search MATCH 'replay'",
    ).get()).toEqual({ count: 1 });

    database.prepare("UPDATE evidence SET lifecycle_status = 'Archived' WHERE id = ?")
      .run(evidence.lastInsertRowid);
    expect(database.prepare(
      "SELECT count(*) count FROM global_search WHERE global_search MATCH 'replay'",
    ).get()).toEqual({ count: 0 });

    database.prepare("UPDATE evidence SET lifecycle_status = 'Active' WHERE id = ?")
      .run(evidence.lastInsertRowid);
    expect(database.prepare(
      "SELECT count(*) count FROM global_search WHERE global_search MATCH 'replay'",
    ).get()).toEqual({ count: 1 });
  });

  it('enables the governed Evidence inspector and source-version reads', () => {
    const database = new DatabaseSync(':memory:');
    runMigrations(database);
    expect(database.prepare(`
      SELECT flag_key, enabled FROM feature_flags
      WHERE flag_key IN ('evidence.detail-route', 'evidence.source-versions')
      ORDER BY flag_key
    `).all()).toEqual([
      { flag_key: 'evidence.detail-route', enabled: 1 },
      { flag_key: 'evidence.source-versions', enabled: 1 },
    ]);
    expect(database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'evidence_integrity_jobs'",
    ).get()).toEqual({ name: 'evidence_integrity_jobs' });
  });
});
