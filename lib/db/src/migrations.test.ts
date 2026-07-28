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
});
