import {
  copyFileSync,
  createReadStream,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { cpus, platform, release, tmpdir, totalmem } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const vault = mkdtempSync(path.join(tmpdir(), "ntc3-benchmark-"));
process.env.NTC3_VAULT_PATH = vault;

const started = performance.now();
const database = await import("@workspace/db");
const startupMs = performance.now() - started;

const samples = async (
  count: number,
  work: (index: number) => unknown | Promise<unknown>,
) => {
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

const streamHash = async (filePath: string) => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath, {
    highWaterMark: 1024 * 1024,
  }))
    hash.update(chunk);
  return hash.digest("hex");
};

const workspaceCount = Number(process.env.NTC3_BENCHMARK_WORKSPACES ?? 50);
const storiesPerWorkspace = Number(
  process.env.NTC3_BENCHMARK_STORIES_PER_WORKSPACE ?? 200,
);
const evidenceCount = Number(process.env.NTC3_BENCHMARK_EVIDENCE ?? 10_000);
const knowledgeCount = Number(process.env.NTC3_BENCHMARK_KNOWLEDGE ?? 10_000);
const campaignCount = Number(process.env.NTC3_BENCHMARK_CAMPAIGNS ?? 10_000);

for (let index = 0; index < workspaceCount; index += 1) {
  const workspace = database.run(
    "INSERT INTO projects (name, slug, description) VALUES (?, ?, ?)",
    [
      `Benchmark ${index}`,
      `benchmark-${index}`,
      "Representative local-first workspace",
    ],
  );
  for (let story = 0; story < storiesPerWorkspace; story += 1) {
    database.run(
      "INSERT INTO stories (title, summary, content, project_id) VALUES (?, ?, ?, ?)",
      [
        `Story ${index}-${story}`,
        "architecture evidence",
        "deterministic intelligence workflow",
        workspace.lastInsertRowid,
      ],
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
database.run(`INSERT INTO evidence_sources (
  evidence_id, version, source_kind, origin_uri, capture_method, producer_metadata
) VALUES (1, 1, 'InlineText', 'benchmark:inline:1', 'BenchmarkFixture', '{"fixture":true}')`);

for (let index = 0; index < knowledgeCount; index += 1) {
  database.run(
    `INSERT INTO knowledge (title, summary, content, project_id, owner, lifecycle_status)
      VALUES (?, ?, ?, 1, 'Benchmark Owner', 'Draft')`,
    [
      `Knowledge ${index}`,
      `architecture knowledge ${index}`,
      `deterministic governed understanding ${index}`,
    ],
  );
}

database.transaction(() => {
  for (let index = 0; index < campaignCount; index += 1) {
    const campaign = database.run(
      `INSERT INTO campaigns (
        title, objective, project_id, mission_statement, success_definition,
        campaign_type, lifecycle_status, phase, owner, target_story_count
      ) VALUES (?, ?, ?, ?, ?, 'ProductDevelopment', 'Planning', 'Planning',
        'Benchmark Owner', 1)`,
      [
        `Campaign ${index}`,
        `architecture Campaign objective ${index}`,
        (index % workspaceCount) + 1,
        `deterministic Campaign mission ${index}`,
        `measurable Campaign outcome ${index}`,
      ],
    );
    const workspaceIndex = index % workspaceCount;
    const storyIndex = Math.floor(index / workspaceCount) % storiesPerWorkspace;
    const storyId = workspaceIndex * storiesPerWorkspace + storyIndex + 1;
    database.run(
      `INSERT INTO story_campaigns (
        story_id, campaign_id, role, position, contribution_note
      ) VALUES (?, ?, 'Supporting', 0, 'Benchmark portfolio membership')`,
      [storyId, campaign.lastInsertRowid],
    );
  }
  for (let position = 1; position < 200; position += 1) {
    database.run(
      `INSERT INTO story_campaigns (
        story_id, campaign_id, role, position, contribution_note
      ) VALUES (?, 1, 'Reference', ?, 'Representative large portfolio')`,
      [position + 1, position],
    );
  }
  for (let position = 0; position < 50; position += 1) {
    database.run(
      `INSERT INTO campaign_milestones (
        campaign_id, title, description, position, status
      ) VALUES (1, ?, 'Representative governed milestone', ?, 'Planned')`,
      [`Milestone ${position}`, position],
    );
  }
});

const save = await samples(100, (index) => {
  database.transaction(() => {
    database.run(
      "INSERT INTO evidence (title, type, content, project_id) VALUES (?, 'Benchmark', ?, 1)",
      [`Save ${index}`, "performance measurement"],
    );
  });
});
const search = await samples(100, () => {
  database.all(
    "SELECT entity_id FROM global_search WHERE global_search MATCH 'architecture' LIMIT 20",
  );
});
const workspaceLoad = await samples(100, () => {
  database.get("SELECT * FROM projects WHERE id = 1");
  database.get("SELECT count(*) count FROM stories WHERE project_id = 1");
  database.all(
    "SELECT id, title, status FROM stories WHERE project_id = 1 ORDER BY updated_at DESC LIMIT 8",
  );
});
const deterministicAnalysis = await samples(100, (index) => {
  const value = database.get(
    "SELECT count(*) total FROM stories WHERE project_id = 1",
  );
  database.run(
    `
    INSERT OR REPLACE INTO intelligence_results (
      result_key, capability_id, capability_version, result_kind, subject_type,
      subject_id, input_watermark, classification, value, explanation
    ) VALUES (?, 'benchmark-health', '1.0.0', 'health-score', 'workspace', 1, ?, 'deterministic', ?, ?)
  `,
    [
      `benchmark-health:${index}`,
      String(index),
      JSON.stringify(value),
      "Deterministic benchmark",
    ],
  );
});

const sourceDirectory = path.join(vault, "benchmark-source");
const evidenceDirectory = path.join(vault, "evidence");
mkdirSync(sourceDirectory, { recursive: true });
const attachmentSource = path.join(sourceDirectory, "attachment.bin");
writeFileSync(attachmentSource, Buffer.alloc(1024 * 1024, 0x43));
const attachmentCopy = await samples(50, (index) => {
  copyFileSync(
    attachmentSource,
    path.join(evidenceDirectory, `attachment-${index}.bin`),
  );
});
const attachmentHash = await samples(50, () => {
  createHash("sha256").update(readFileSync(attachmentSource)).digest("hex");
});
const largeWorkspaceSearch = await samples(100, () => {
  database.all(
    "SELECT entity_id FROM global_search WHERE global_search MATCH 'deterministic' LIMIT 50",
  );
});
const evidenceCatalogue = await samples(100, () => {
  database.all(`SELECT id, title, classification, lifecycle_status, review_status
    FROM evidence WHERE project_id = 1 AND lifecycle_status = 'Active'
    ORDER BY created_at DESC LIMIT 50`);
});
const evidenceDetail = await samples(100, () => {
  database.get("SELECT * FROM evidence WHERE id = 1");
  database.all(
    "SELECT * FROM evidence_sources WHERE evidence_id = 1 ORDER BY version DESC",
  );
  database.all("SELECT * FROM story_evidence WHERE evidence_id = 1");
});
const evidenceIntegrityHash = await samples(50, () => {
  createHash("sha256").update(readFileSync(attachmentSource)).digest("hex");
});
const knowledgeCatalogue = await samples(100, () => {
  database.all(`SELECT id, title, summary, lifecycle_status, review_status, version
    FROM knowledge WHERE project_id = 1 AND lifecycle_status != 'Archived'
    ORDER BY updated_at DESC LIMIT 50`);
});
const knowledgeSearch = await samples(100, () => {
  database.all(
    "SELECT entity_id FROM global_search WHERE global_search MATCH 'architecture' AND entity_type = 'knowledge' LIMIT 50",
  );
});
const knowledgeDetail = await samples(100, () => {
  database.get("SELECT * FROM knowledge WHERE id = 1");
  database.all(
    "SELECT * FROM knowledge_claims WHERE knowledge_id = 1 ORDER BY position, id",
  );
  database.all(`SELECT r.* FROM knowledge_relationships r
    WHERE r.source_knowledge_id = 1 OR r.target_knowledge_id = 1`);
  database.all(
    "SELECT * FROM knowledge_versions WHERE knowledge_id = 1 ORDER BY version DESC",
  );
});
const knowledgeSave = await samples(100, (index) => {
  database.transaction(() => {
    database.run(
      `UPDATE knowledge SET summary = ?, version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`,
      [`Knowledge save benchmark ${index}`],
    );
    database.run(`INSERT INTO knowledge_versions
      (knowledge_id, version, title, summary, content, metadata, change_summary)
      SELECT id, version, title, summary, content, '{}', 'Benchmark save' FROM knowledge WHERE id = 1`);
  });
});
const knowledgeCitation = await samples(100, (index) => {
  database.transaction(() => {
    const claim = database.run(
      `INSERT INTO knowledge_claims (knowledge_id, position, statement)
        VALUES (1, ?, ?)`,
      [index, `Benchmark claim ${index}`],
    );
    const source = database.get(
      "SELECT id FROM evidence_sources WHERE evidence_id = 1 ORDER BY version DESC LIMIT 1",
    ) as { id: number };
    database.run(
      `INSERT INTO knowledge_claim_citations (claim_id, evidence_id, source_id)
      VALUES (?, 1, ?)`,
      [claim.lastInsertRowid, source.id],
    );
  });
});
const campaignCatalogue = await samples(100, () => {
  database.all(`SELECT id, title, lifecycle_status, phase, owner, version
    FROM campaigns WHERE project_id = 1 AND lifecycle_status != 'Archived'
    ORDER BY updated_at DESC LIMIT 50`);
});
const campaignSearch = await samples(100, () => {
  database.all(
    "SELECT entity_id FROM global_search WHERE global_search MATCH 'architecture' AND entity_type = 'campaign' LIMIT 50",
  );
});
const campaignDetail = await samples(100, () => {
  database.get("SELECT * FROM campaigns WHERE id = 1");
  database.all(
    "SELECT * FROM story_campaigns WHERE campaign_id = 1 ORDER BY position",
  );
  database.all(
    "SELECT * FROM campaign_milestones WHERE campaign_id = 1 ORDER BY position",
  );
  database.all(
    "SELECT * FROM campaign_versions WHERE campaign_id = 1 ORDER BY version DESC",
  );
});
const campaignSave = await samples(100, (index) => {
  database.transaction(() => {
    database.run(
      `UPDATE campaigns SET objective = ?, version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 1`,
      [`Campaign save benchmark ${index}`],
    );
    database.run(`INSERT INTO campaign_versions (
      campaign_id, version, title, mission_statement, success_definition,
      metadata, change_summary
    ) SELECT id, version, title, mission_statement, success_definition,
      '{}', 'Benchmark save' FROM campaigns WHERE id = 1`);
  });
});
const campaignPortfolio = await samples(100, () => {
  database.all(`SELECT membership.*, story.title, story.status
    FROM story_campaigns membership
    JOIN stories story ON story.id = membership.story_id
    WHERE membership.campaign_id = 1
    ORDER BY membership.position`);
});
const campaignMilestones = await samples(100, (index) => {
  database.transaction(() => {
    database.run(
      `UPDATE campaign_milestones SET target_date = ?, version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE campaign_id = 1 AND id = 1`,
      [`2026-12-${String((index % 28) + 1).padStart(2, "0")}`],
    );
  });
});
const campaignReorder = await samples(100, () => {
  database.transaction(() => {
    const rows = database.all(
      `SELECT story_id, position FROM story_campaigns
       WHERE campaign_id = 1 AND position IN (0, 1) ORDER BY position`,
    ) as Array<{ story_id: number; position: number }>;
    database.run(
      "UPDATE story_campaigns SET position = 100000 WHERE campaign_id = 1 AND story_id = ?",
      [rows[0].story_id],
    );
    database.run(
      "UPDATE story_campaigns SET position = 100001 WHERE campaign_id = 1 AND story_id = ?",
      [rows[1].story_id],
    );
    database.run(
      "UPDATE story_campaigns SET position = 1, version = version + 1 WHERE campaign_id = 1 AND story_id = ?",
      [rows[0].story_id],
    );
    database.run(
      "UPDATE story_campaigns SET position = 0, version = version + 1 WHERE campaign_id = 1 AND story_id = ?",
      [rows[1].story_id],
    );
  });
});
const largeFiles = [];
for (const sizeMiB of [20, 100]) {
  const source = path.join(sourceDirectory, `attachment-${sizeMiB}mib.bin`);
  writeFileSync(source, Buffer.alloc(sizeMiB * 1024 * 1024, 0x43));
  const beforeRss = process.memoryUsage().rss;
  const hash = await samples(sizeMiB === 100 ? 3 : 10, () =>
    streamHash(source),
  );
  const afterHashRss = process.memoryUsage().rss;
  const copy = await samples(sizeMiB === 100 ? 2 : 5, (index) => {
    copyFileSync(
      source,
      path.join(evidenceDirectory, `large-${sizeMiB}-${index}.bin`),
    );
  });
  largeFiles.push({
    sizeMiB,
    hash,
    copy,
    rssGrowthMiB: Number(((afterHashRss - beforeRss) / 1024 ** 2).toFixed(2)),
  });
}

const report = {
  measuredAt: new Date().toISOString(),
  fixture: {
    workspaces: workspaceCount,
    stories: workspaceCount * storiesPerWorkspace,
    evidence: evidenceCount,
    knowledge: knowledgeCount,
    campaigns: campaignCount,
    campaignPortfolioMemberships: 200,
    campaignMilestones: 50,
    attachmentBytes: 1024 * 1024,
    measuredIterations: 100,
  },
  hardware: {
    cpu: cpus()[0]?.model ?? "unknown",
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
    knowledgeCatalogue,
    knowledgeSearch,
    knowledgeDetail,
    knowledgeSave,
    knowledgeCitation,
    campaignCatalogue,
    campaignSearch,
    campaignDetail,
    campaignSave,
    campaignPortfolio,
    campaignMilestones,
    campaignReorder,
    largeFiles,
  },
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
rmSync(vault, { recursive: true, force: true });
