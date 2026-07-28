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
});
