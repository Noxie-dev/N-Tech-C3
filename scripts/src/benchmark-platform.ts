import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, platform, release, tmpdir, totalmem } from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const vault = mkdtempSync(path.join(tmpdir(), 'ntc3-benchmark-'));
process.env.NTC3_VAULT_PATH = vault;

const started = performance.now();
const database = await import('@workspace/db');
const startupMs = performance.now() - started;

const samples = async (count: number, work: (index: number) => void | Promise<void>) => {
  const values: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const before = performance.now();
    await work(index);
    values.push(performance.now() - before);
  }
  values.sort((left, right) => left - right);
  return {
    medianMs: Number(values[Math.floor(values.length / 2)].toFixed(3)),
    p95Ms: Number(values[Math.floor(values.length * 0.95)].toFixed(3)),
  };
};

const workspaceCount = Number(process.env.NTC3_BENCHMARK_WORKSPACES ?? 50);
const storiesPerWorkspace = Number(process.env.NTC3_BENCHMARK_STORIES_PER_WORKSPACE ?? 200);
const evidenceCount = Number(process.env.NTC3_BENCHMARK_EVIDENCE ?? 10_000);

for (let index = 0; index < workspaceCount; index += 1) {
  const workspace = database.run(
    'INSERT INTO projects (name, slug, description) VALUES (?, ?, ?)',
    [`Benchmark ${index}`, `benchmark-${index}`, 'Representative local-first workspace'],
  );
  for (let story = 0; story < storiesPerWorkspace; story += 1) {
    database.run(
      'INSERT INTO stories (title, summary, content, project_id) VALUES (?, ?, ?, ?)',
      [`Story ${index}-${story}`, 'architecture evidence', 'deterministic intelligence workflow', workspace.lastInsertRowid],
    );
  }
}

for (let index = 0; index < evidenceCount; index += 1) {
  database.run(
    `INSERT INTO evidence (title, type, content, project_id, classification)
      VALUES (?, 'Benchmark', ?, 1, 'FactualRecord')`,
    [`Evidence ${index}`, `deterministic integrity fixture ${index}`],
  );
}

const save = await samples(100, (index) => {
  database.transaction(() => {
    database.run(
      "INSERT INTO evidence (title, type, content, project_id) VALUES (?, 'Benchmark', ?, 1)",
      [`Save ${index}`, 'performance measurement'],
    );
  });
});
const search = await samples(100, () => {
  database.all("SELECT entity_id FROM global_search WHERE global_search MATCH 'architecture' LIMIT 20");
});
const workspaceLoad = await samples(100, () => {
  database.get('SELECT * FROM projects WHERE id = 1');
  database.get('SELECT count(*) count FROM stories WHERE project_id = 1');
  database.all('SELECT id, title, status FROM stories WHERE project_id = 1 ORDER BY updated_at DESC LIMIT 8');
});
const deterministicAnalysis = await samples(100, (index) => {
  const value = database.get('SELECT count(*) total FROM stories WHERE project_id = 1');
  database.run(`
    INSERT OR REPLACE INTO intelligence_results (
      result_key, capability_id, capability_version, result_kind, subject_type,
      subject_id, input_watermark, classification, value, explanation
    ) VALUES (?, 'benchmark-health', '1.0.0', 'health-score', 'workspace', 1, ?, 'deterministic', ?, ?)
  `, [`benchmark-health:${index}`, String(index), JSON.stringify(value), 'Deterministic benchmark']);
});

const sourceDirectory = path.join(vault, 'benchmark-source');
const evidenceDirectory = path.join(vault, 'evidence');
mkdirSync(sourceDirectory, { recursive: true });
const attachmentSource = path.join(sourceDirectory, 'attachment.bin');
writeFileSync(attachmentSource, Buffer.alloc(1024 * 1024, 0x43));
const attachmentCopy = await samples(50, (index) => {
  copyFileSync(attachmentSource, path.join(evidenceDirectory, `attachment-${index}.bin`));
});
const attachmentHash = await samples(50, () => {
  createHash('sha256').update(readFileSync(attachmentSource)).digest('hex');
});
const largeWorkspaceSearch = await samples(100, () => {
  database.all("SELECT entity_id FROM global_search WHERE global_search MATCH 'deterministic' LIMIT 50");
});
const evidenceCatalogue = await samples(100, () => {
  database.all(`SELECT id, title, classification, lifecycle_status, review_status
    FROM evidence WHERE project_id = 1 AND lifecycle_status = 'Active'
    ORDER BY created_at DESC LIMIT 50`);
});
const evidenceDetail = await samples(100, () => {
  database.get('SELECT * FROM evidence WHERE id = 1');
  database.all('SELECT * FROM evidence_sources WHERE evidence_id = 1 ORDER BY version DESC');
  database.all('SELECT * FROM story_evidence WHERE evidence_id = 1');
});
const evidenceIntegrityHash = await samples(50, () => {
  createHash('sha256').update(readFileSync(attachmentSource)).digest('hex');
});

const report = {
  measuredAt: new Date().toISOString(),
  fixture: {
    workspaces: workspaceCount,
    stories: workspaceCount * storiesPerWorkspace,
    evidence: evidenceCount,
    attachmentBytes: 1024 * 1024,
    measuredIterations: 100,
  },
  hardware: {
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCores: cpus().length,
    memoryGb: Number((totalmem() / 1024 ** 3).toFixed(1)),
    platform: `${platform()} ${release()}`,
    node: process.version,
  },
  timings: {
    coldDatabaseInitializationMs: Number(startupMs.toFixed(3)),
    save,
    search,
    workspaceLoad,
    deterministicAnalysis,
    attachmentCopy,
    attachmentHash,
    largeWorkspaceSearch,
    evidenceCatalogue,
    evidenceDetail,
    evidenceIntegrityHash,
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
rmSync(vault, { recursive: true, force: true });
