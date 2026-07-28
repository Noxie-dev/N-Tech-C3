import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { runMigrations } from './migrations';

const VAULT_DIRECTORIES = [
  'stories',
  'campaigns',
  'knowledge',
  'evidence',
  'assets',
  'exports',
  'drafts',
  'templates',
  'backups',
  'logs',
  'settings',
] as const;

const vaultRoot = path.resolve(
  process.env.NTC3_VAULT_PATH ?? path.join(process.cwd(), 'vault'),
);

for (const directory of VAULT_DIRECTORIES) {
  mkdirSync(path.join(vaultRoot, directory), { recursive: true });
}
mkdirSync(path.join(vaultRoot, 'database'), { recursive: true });

export const databasePath = path.join(vaultRoot, 'database', 'ntc3.sqlite');
export const db = new DatabaseSync(databasePath);

db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
runMigrations(db);
export { migrations, runMigrations } from './migrations';

export type Row = Record<string, unknown>;

export function all(sql: string, params: SQLInputValue[] = []): Row[] {
  return db.prepare(sql).all(...params) as Row[];
}

export function get(sql: string, params: SQLInputValue[] = []): Row | undefined {
  return db.prepare(sql).get(...params) as Row | undefined;
}

export function run(sql: string, params: SQLInputValue[] = []) {
  return db.prepare(sql).run(...params);
}

export function importVaultFile(input: {
  name: string;
  bytes: Uint8Array;
}): { source: string; checksum: string } {
  const safeName = path.basename(input.name).replace(/[^a-zA-Z0-9._-]+/g, '-');
  const checksum = createHash('sha256').update(input.bytes).digest('hex');
  const relativePath = path.join('evidence', `${Date.now()}-${checksum.slice(0, 10)}-${safeName}`);
  writeFileSync(path.join(vaultRoot, relativePath), input.bytes, { flag: 'wx' });
  return { source: relativePath, checksum };
}

export function getVaultInfo() {
  return { root: vaultRoot, database: databasePath };
}
