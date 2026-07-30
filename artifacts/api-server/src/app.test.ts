import { mkdtempSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

process.env.NTC3_VAULT_PATH = mkdtempSync(
  path.join(tmpdir(), "ntc3-api-test-"),
);

let app: Awaited<typeof import("./app")>["default"];
let database: typeof import("@workspace/db");
let events: typeof import("./lib/events");

beforeAll(async () => {
  app = (await import("./app")).default;
  database = await import("@workspace/db");
  events = await import("./lib/events");
});

describe("local API", () => {
  it("reports health", async () => {
    const response = await request(app).get("/api/healthz").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("persists and returns a project through SQLite", async () => {
    const created = await request(app)
      .post("/api/projects")
      .send({ name: "Migration test", description: "API contract" })
      .expect(201);

    expect(created.body).toMatchObject({
      id: expect.any(Number),
      name: "Migration test",
      description: "API contract",
    });

    const listed = await request(app).get("/api/projects").expect(200);
    expect(listed.body).toContainEqual(created.body);
  });

  it("supports the canonical workspace lifecycle and overview", async () => {
    const created = await request(app)
      .post("/api/workspaces")
      .send({
        name: "Route 01",
        description: "Workspace architecture",
        purpose: "Product",
        tags: ["route-01"],
      })
      .expect(201);

    expect(created.body).toMatchObject({
      name: "Route 01",
      slug: "route-01",
      status: "Active",
      purpose: "Product",
      tags: ["route-01"],
    });
    expect(
      database.get(
        "SELECT event_type, event_version FROM domain_events WHERE aggregate_type = ? AND aggregate_id = ?",
        ["workspace", created.body.id],
      ),
    ).toEqual({ event_type: "WorkspaceCreated", event_version: 1 });
    expect(
      database.get(
        "SELECT source_event_id FROM activity WHERE entity_type = ? AND entity_id = ?",
        ["workspace", created.body.id],
      )?.source_event_id,
    ).toEqual(expect.any(Number));
    const activityCount = database.get(
      "SELECT count(*) count FROM activity WHERE entity_type = ? AND entity_id = ?",
      ["workspace", created.body.id],
    )?.count;
    events.projectDomainEventsToActivity();
    expect(
      database.get(
        "SELECT count(*) count FROM activity WHERE entity_type = ? AND entity_id = ?",
        ["workspace", created.body.id],
      )?.count,
    ).toBe(activityCount);

    const overview = await request(app)
      .get(`/api/workspaces/${created.body.id}`)
      .expect(200);
    expect(overview.body).toMatchObject({
      id: created.body.id,
      metrics: { stories: 0, evidence: 0, campaigns: 0 },
      health: { score: expect.any(Number), insufficientData: true },
      recentActivity: expect.any(Array),
    });
    expect(
      database.get(
        "SELECT classification FROM intelligence_results WHERE capability_id = ? AND subject_id = ?",
        ["workspace-health", created.body.id],
      ),
    ).toEqual({ classification: "deterministic" });

    await request(app)
      .patch(`/api/workspaces/${created.body.id}`)
      .send({ status: "Archived" })
      .expect(200);
    await request(app)
      .patch(`/api/workspaces/${created.body.id}`)
      .send({ description: "Blocked while archived" })
      .expect(409);
    await request(app)
      .patch(`/api/workspaces/${created.body.id}`)
      .send({ status: "Active" })
      .expect(200);
  });

  it("supports the Story Engine outline, graph, output, health, versions, and archive lifecycle", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Story Engine Workspace", purpose: "Product" })
      .expect(201);
    const story = await request(app)
      .post("/api/stories")
      .send({
        title: "Evidence-based architecture",
        workspaceId: workspace.body.id,
        storyType: "TechnicalDocumentation",
        status: "Idea",
        summary: "A supported engineering narrative",
      })
      .expect(201);
    expect(story.body).toMatchObject({
      workspaceId: workspace.body.id,
      storyType: "TechnicalDocumentation",
      version: 1,
    });
    expect(
      database.get(
        "SELECT event_type FROM domain_events WHERE aggregate_type = ? AND aggregate_id = ?",
        ["story", story.body.id],
      ),
    ).toEqual({ event_type: "StoryCreated" });

    const outline = await request(app)
      .put(`/api/stories/${story.body.id}/outline`)
      .send([
        { title: "Problem", completionStatus: "Complete" },
        { title: "Evidence", completionStatus: "InProgress" },
      ])
      .expect(200);
    expect(outline.body).toHaveLength(2);

    const evidence = await request(app)
      .post("/api/evidence")
      .send({
        title: "Architecture trace",
        type: "Diagram",
        workspaceId: workspace.body.id,
      })
      .expect(201);
    await request(app)
      .post(`/api/stories/${story.body.id}/links`)
      .send({ entityType: "evidence", entityId: evidence.body.id })
      .expect(201);
    const links = await request(app)
      .get(`/api/stories/${story.body.id}/links`)
      .expect(200);
    expect(links.body.evidence[0]).toMatchObject({
      id: evidence.body.id,
      title: "Architecture trace",
    });

    const output = await request(app)
      .post(`/api/stories/${story.body.id}/outputs`)
      .send({ title: "Architecture article", type: "Blog" })
      .expect(201);
    expect(output.body).toMatchObject({ status: "Draft", type: "Blog" });

    const health = await request(app)
      .get(`/api/stories/${story.body.id}/health`)
      .expect(200);
    expect(health.body).toMatchObject({
      score: expect.any(Number),
      blockers: expect.any(Array),
      components: expect.arrayContaining([
        expect.objectContaining({ key: "evidence" }),
      ]),
    });
    expect(
      database.get(
        "SELECT capability_version, classification FROM intelligence_results WHERE capability_id = ? AND subject_id = ?",
        ["story-health", story.body.id],
      ),
    ).toEqual({ capability_version: "1.0.0", classification: "deterministic" });

    const updated = await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({
        content: "<p>Engineering evidence supports this decision.</p>",
        expectedVersion: 1,
      })
      .expect(200);
    expect(updated.body.version).toBe(2);
    await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ content: "<p>Stale overwrite</p>", expectedVersion: 1 })
      .expect(409);

    await request(app)
      .post(`/api/stories/${story.body.id}/archive`)
      .send({ archived: true })
      .expect(200);
    await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ title: "Blocked edit" })
      .expect(409);
    await request(app)
      .post(`/api/stories/${story.body.id}/archive`)
      .send({ archived: false })
      .expect(200);

    const timeline = await request(app)
      .get(`/api/stories/${story.body.id}/timeline`)
      .expect(200);
    expect(timeline.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: "created" }),
        expect.objectContaining({ eventType: "version" }),
      ]),
    );
  });

  it("enforces Workspace ownership, parent archive guards, and lifecycle ordering", async () => {
    await request(app)
      .post("/api/stories")
      .send({ title: "Unassigned Story" })
      .expect(400);

    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Invariant Workspace", purpose: "Product" })
      .expect(201);
    const story = await request(app)
      .post("/api/stories")
      .send({ title: "Ordered lifecycle", workspaceId: workspace.body.id })
      .expect(201);

    await request(app)
      .post(`/api/stories/${story.body.id}/transition`)
      .send({ status: "Draft" })
      .expect(409);
    await request(app)
      .post(`/api/stories/${story.body.id}/outputs`)
      .send({ title: "Premature output", type: "Blog", status: "Ready" })
      .expect(409);

    await request(app)
      .patch(`/api/workspaces/${workspace.body.id}`)
      .send({ status: "Archived" })
      .expect(200);
    await request(app)
      .post("/api/evidence")
      .send({
        title: "Blocked child",
        type: "TerminalOutput",
        workspaceId: workspace.body.id,
      })
      .expect(409);
    await request(app)
      .patch(`/api/stories/${story.body.id}`)
      .send({ summary: "Blocked by archived parent" })
      .expect(409);
  });

  it("captures terminal evidence content", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Evidence capture workspace" })
      .expect(201);
    const response = await request(app)
      .post("/api/evidence")
      .send({
        title: "Build output",
        type: "TerminalOutput",
        content: "pnpm run build\\nDone",
        workspaceId: workspace.body.id,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      title: "Build output",
      type: "TerminalOutput",
      content: "pnpm run build\\nDone",
      workspaceId: workspace.body.id,
      classification: "FactualRecord",
      lifecycleStatus: "Active",
      reviewStatus: "Unreviewed",
      version: 1,
    });
    expect(
      database.get(
        "SELECT event_type FROM domain_events WHERE aggregate_type = ? AND aggregate_id = ?",
        ["evidence", response.body.id],
      ),
    ).toEqual({ event_type: "EvidenceCaptured" });
    expect(
      database.get(
        "SELECT source_event_id FROM activity WHERE entity_type = ? AND entity_id = ?",
        ["evidence", response.body.id],
      )?.source_event_id,
    ).toEqual(expect.any(Number));

    const search = await request(app)
      .get("/api/search")
      .query({ q: "build output" })
      .expect(200);
    expect(search.body[0]).toMatchObject({
      entityType: "evidence",
      title: "Build output",
      path: "/evidence",
    });
  });

  it("filters global search by project and entity type", async () => {
    const project = await request(app)
      .post("/api/projects")
      .send({ name: "Filtered project" })
      .expect(201);
    await request(app)
      .post("/api/evidence")
      .send({
        title: "Scoped telemetry record",
        type: "Benchmark",
        content: "unique-filter-token",
        workspaceId: project.body.id,
      })
      .expect(201);
    const otherProject = await request(app)
      .post("/api/projects")
      .send({ name: "Other filtered project" })
      .expect(201);
    await request(app)
      .post("/api/evidence")
      .send({
        title: "Other scoped telemetry record",
        type: "Benchmark",
        content: "unique-filter-token",
        workspaceId: otherProject.body.id,
      })
      .expect(201);

    const search = await request(app)
      .get("/api/search")
      .query({
        q: "unique filter token",
        entityType: "evidence",
        projectId: project.body.id,
      })
      .expect(200);

    expect(search.body).toHaveLength(1);
    expect(search.body[0].title).toBe("Scoped telemetry record");
  });

  it("requires canonical Workspace ownership for new Evidence", async () => {
    const response = await request(app)
      .post("/api/evidence")
      .send({
        title: "Unassigned Evidence",
        type: "Observation",
      })
      .expect(400);

    expect(response.body.error).toContain("workspaceId");
  });

  it("runs the managed-file Evidence ingest saga idempotently", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Recoverable ingest workspace" })
      .expect(201);
    const start = {
      workspaceId: workspace.body.id,
      originalName: "build-proof.png",
      mediaType: "image/png",
      idempotencyKey: "ingest-idempotency-proof-1",
      title: "Build proof",
      type: "Screenshot",
      classification: "FactualRecord",
    };
    const reserved = await request(app)
      .post("/api/evidence/ingests")
      .send(start)
      .expect(201);
    const repeated = await request(app)
      .post("/api/evidence/ingests")
      .send(start)
      .expect(200);
    expect(repeated.body.id).toBe(reserved.body.id);

    const checksum = "b".repeat(64);
    const staged = await request(app)
      .post(`/api/evidence/ingests/${reserved.body.id}/staged`)
      .send({ byteSize: 4096, sha256: checksum })
      .expect(200);
    expect(staged.body).toMatchObject({
      state: "Staged",
      byteSize: 4096,
      sha256: checksum,
      finalPath: expect.stringContaining(reserved.body.id),
    });

    const committed = await request(app)
      .post(`/api/evidence/ingests/${reserved.body.id}/complete`)
      .expect(200);
    expect(committed.body.ingest.state).toBe("MetadataCommitted");
    expect(committed.body.evidence).toMatchObject({
      title: "Build proof",
      workspaceId: workspace.body.id,
      lifecycleStatus: "CapturePending",
    });
    const repeatedCommit = await request(app)
      .post(`/api/evidence/ingests/${reserved.body.id}/complete`)
      .expect(200);
    expect(repeatedCommit.body.evidence.id).toBe(committed.body.evidence.id);
    expect(
      database.get(
        `
      SELECT source_kind, sha256, vault_path, capture_method
      FROM evidence_sources WHERE evidence_id = ?
    `,
        [committed.body.evidence.id],
      ),
    ).toEqual({
      source_kind: "ManagedFile",
      sha256: checksum,
      vault_path: staged.body.finalPath,
      capture_method: "DesktopFileImport",
    });

    const recoverable = await request(app)
      .get("/api/evidence/ingests")
      .expect(200);
    expect(recoverable.body).toContainEqual(
      expect.objectContaining({
        id: reserved.body.id,
        state: "MetadataCommitted",
      }),
    );

    const finalized = await request(app)
      .post(`/api/evidence/ingests/${reserved.body.id}/promoted`)
      .expect(200);
    expect(finalized.body).toMatchObject({
      ingest: { state: "Completed" },
      evidence: { lifecycleStatus: "Active", version: 2 },
    });
    await request(app)
      .post(`/api/evidence/ingests/${reserved.body.id}/promoted`)
      .expect(200);
    expect(
      database.all(
        `
      SELECT event_type FROM domain_events
      WHERE aggregate_type = 'evidence' AND aggregate_id = ?
      ORDER BY id
    `,
        [committed.body.evidence.id],
      ),
    ).toEqual([
      { event_type: "EvidenceCaptureRequested" },
      { event_type: "EvidenceCaptured" },
    ]);
  });

  it("compensates pre-metadata failure and rolls back invalid metadata atomically", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Failure boundary workspace" })
      .expect(201);
    const compensated = await request(app)
      .post("/api/evidence/ingests")
      .send({
        workspaceId: workspace.body.id,
        originalName: "partial.log",
        idempotencyKey: "ingest-compensation-proof-1",
        title: "Partial capture",
        type: "BuildLog",
      })
      .expect(201);
    await request(app)
      .post(`/api/evidence/ingests/${compensated.body.id}/fail`)
      .send({ errorCategory: "InjectedStageFailure", compensated: true })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({ state: "Failed", retryCount: 1 });
      });
    expect(
      database.get("SELECT count(*) count FROM evidence WHERE title = ?", [
        "Partial capture",
      ]),
    ).toEqual({ count: 0 });

    const invalid = await request(app)
      .post("/api/evidence/ingests")
      .send({
        workspaceId: workspace.body.id,
        originalName: "invalid-link.log",
        idempotencyKey: "ingest-rollback-proof-1",
        title: "Invalid linked capture",
        type: "BuildLog",
      })
      .expect(201);
    await request(app)
      .post(`/api/evidence/ingests/${invalid.body.id}/staged`)
      .send({ byteSize: 10, sha256: "c".repeat(64) })
      .expect(200);
    database.run(`CREATE TRIGGER inject_evidence_source_failure
      BEFORE INSERT ON evidence_sources
      WHEN NEW.capture_method = 'DesktopFileImport'
      BEGIN SELECT RAISE(ABORT, 'injected source failure'); END`);
    await request(app)
      .post(`/api/evidence/ingests/${invalid.body.id}/complete`)
      .expect(500);
    database.run("DROP TRIGGER inject_evidence_source_failure");
    expect(
      database.get(
        "SELECT state, evidence_id, source_id FROM evidence_ingests WHERE id = ?",
        [invalid.body.id],
      ),
    ).toEqual({ state: "Staged", evidence_id: null, source_id: null });
    expect(
      database.get("SELECT count(*) count FROM evidence WHERE title = ?", [
        "Invalid linked capture",
      ]),
    ).toEqual({ count: 0 });
  });

  it("governs Evidence metadata, lifecycle, sources, and typed Story links", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Governed Evidence workspace" })
      .expect(201);
    const otherWorkspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Other Evidence workspace" })
      .expect(201);
    const story = await request(app)
      .post("/api/stories")
      .send({ title: "Evidence consumer", workspaceId: workspace.body.id })
      .expect(201);
    const otherStory = await request(app)
      .post("/api/stories")
      .send({ title: "Foreign consumer", workspaceId: otherWorkspace.body.id })
      .expect(201);
    const evidence = await request(app)
      .post("/api/evidence")
      .send({
        title: "Governed build proof",
        type: "BuildLog",
        workspaceId: workspace.body.id,
        content: "replay safe search token",
      })
      .expect(201);

    const updated = await request(app)
      .patch(`/api/evidence/${evidence.body.id}`)
      .send({
        expectedVersion: evidence.body.version,
        notes: "Reviewed metadata",
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      version: evidence.body.version + 1,
      notes: "Reviewed metadata",
    });
    await request(app)
      .patch(`/api/evidence/${evidence.body.id}`)
      .send({ expectedVersion: evidence.body.version, notes: "Stale write" })
      .expect(409);

    database.run(
      `UPDATE evidence_sources SET source_kind = 'InlineText',
      inline_content = 'immutable source', capture_method = 'ApiTest',
      producer_metadata = '{"fixture":true}' WHERE evidence_id = ? AND version = 1`,
      [evidence.body.id],
    );
    const sources = await request(app)
      .get(`/api/evidence/${evidence.body.id}/sources`)
      .expect(200);
    expect(sources.body).toEqual([
      expect.objectContaining({
        evidenceId: evidence.body.id,
        version: 1,
        sourceKind: "InlineText",
        producerMetadata: { fixture: true },
      }),
    ]);
    const locator = await request(app)
      .post(
        `/api/evidence/${evidence.body.id}/sources/${sources.body[0].id}/locators`,
      )
      .send({
        kind: "TextRange",
        coordinates: { startLine: 1, endLine: 3 },
        label: "Relevant lines",
      })
      .expect(201);
    await request(app)
      .post(
        `/api/evidence/${evidence.body.id}/sources/${sources.body[0].id}/locators`,
      )
      .send({ kind: "Page", coordinates: { page: 0 } })
      .expect(400);
    const listedLocators = await request(app)
      .get(
        `/api/evidence/${evidence.body.id}/sources/${sources.body[0].id}/locators`,
      )
      .expect(200);
    expect(listedLocators.body).toEqual([
      expect.objectContaining({
        id: locator.body.id,
        kind: "TextRange",
        coordinates: { startLine: 1, endLine: 3 },
      }),
    ]);
    const integrity = await request(app)
      .post(`/api/evidence/${evidence.body.id}/verify`)
      .expect(200);
    expect(integrity.body).toMatchObject({
      state: "Unverifiable",
      capabilityId: "evidence-integrity",
      capabilityVersion: "1.0.0",
      components: expect.arrayContaining([
        expect.objectContaining({ key: "workspace", status: "Pass" }),
      ]),
    });
    await request(app)
      .get(`/api/evidence/${evidence.body.id}/integrity`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.inputWatermark).toBe(integrity.body.inputWatermark),
      );

    await request(app)
      .post(`/api/evidence/${evidence.body.id}/stories`)
      .send({ storyId: otherStory.body.id })
      .expect(409);
    await request(app)
      .post(`/api/evidence/${evidence.body.id}/stories`)
      .send({ storyId: story.body.id, role: "Primary", relevance: 95 })
      .expect(201);
    await request(app)
      .post(`/api/evidence/${evidence.body.id}/stories`)
      .send({ storyId: story.body.id, role: "Primary", relevance: 95 })
      .expect(201);
    const links = await request(app)
      .get(`/api/evidence/${evidence.body.id}/stories`)
      .expect(200);
    expect(links.body).toEqual([
      expect.objectContaining({
        evidenceId: evidence.body.id,
        storyId: story.body.id,
        role: "Primary",
        relevance: 95,
      }),
    ]);
    expect(
      database.get(
        `SELECT count(*) count FROM domain_events
      WHERE aggregate_type = 'evidence' AND aggregate_id = ? AND event_type = 'EvidenceLinkedToStory'`,
        [evidence.body.id],
      ),
    ).toEqual({ count: 1 });

    const archived = await request(app)
      .post(`/api/evidence/${evidence.body.id}/archive`)
      .send({ expectedVersion: updated.body.version })
      .expect(200);
    expect(archived.body).toMatchObject({
      lifecycleStatus: "Archived",
      version: updated.body.version + 1,
    });
    await request(app)
      .patch(`/api/evidence/${evidence.body.id}`)
      .send({ expectedVersion: archived.body.version, notes: "Forbidden" })
      .expect(409);
    await request(app)
      .post(
        `/api/evidence/${evidence.body.id}/sources/${sources.body[0].id}/locators`,
      )
      .send({ kind: "WholeArtifact", coordinates: {} })
      .expect(409);
    await request(app).delete(`/api/evidence/${evidence.body.id}`).expect(409);
    await request(app)
      .get(`/api/evidence/${evidence.body.id}/integrity`)
      .expect(404);
    expect(
      database.get(
        "SELECT count(*) count FROM global_search WHERE global_search MATCH 'replay'",
      ),
    ).toEqual({ count: 0 });

    const restored = await request(app)
      .post(`/api/evidence/${evidence.body.id}/restore`)
      .send({ expectedVersion: archived.body.version })
      .expect(200);
    expect(restored.body).toMatchObject({
      lifecycleStatus: "Active",
      version: archived.body.version + 1,
    });
    expect(
      database.get(
        "SELECT count(*) count FROM global_search WHERE global_search MATCH 'replay'",
      ),
    ).toEqual({ count: 1 });
    await request(app)
      .delete(`/api/evidence/${evidence.body.id}/stories/${story.body.id}`)
      .expect(204);
    await request(app)
      .delete(
        `/api/evidence/${evidence.body.id}/sources/${sources.body[0].id}/locators/${locator.body.id}`,
      )
      .expect(204);
  });

  it("detects valid, modified, and missing managed Evidence bytes", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Integrity verification workspace" })
      .expect(201);
    const evidence = await request(app)
      .post("/api/evidence")
      .send({
        title: "Integrity fixture",
        type: "BuildLog",
        workspaceId: workspace.body.id,
      })
      .expect(201);
    const relativePath = "evidence/integrity-fixture.bin";
    const original = Buffer.from("governed evidence bytes");
    writeFileSync(
      path.join(process.env.NTC3_VAULT_PATH!, relativePath),
      original,
    );
    database.run(
      `UPDATE evidence_sources SET source_kind = 'ManagedFile',
      byte_size = ?, sha256 = ?, vault_path = ?, capture_method = 'ApiTest',
      producer_metadata = '{"fixture":true}' WHERE evidence_id = ? AND version = 1`,
      [
        original.byteLength,
        createHash("sha256").update(original).digest("hex"),
        relativePath,
        evidence.body.id,
      ],
    );
    const source = database.get(
      "SELECT id FROM evidence_sources WHERE evidence_id = ?",
      [evidence.body.id],
    )!;
    await request(app)
      .get(`/api/evidence/${evidence.body.id}/sources/${source.id}/content`)
      .set("Range", "bytes=0-7")
      .expect(206)
      .expect("Accept-Ranges", "bytes")
      .expect("Content-Range", `bytes 0-7/${original.byteLength}`)
      .expect(({ body }) =>
        expect(Buffer.from(body).toString()).toBe("governed"),
      );

    await request(app)
      .post(`/api/evidence/${evidence.body.id}/verify`)
      .expect(200)
      .expect(({ body }) => expect(body.state).toBe("Valid"));
    writeFileSync(
      path.join(process.env.NTC3_VAULT_PATH!, relativePath),
      Buffer.from("changed bytes"),
    );
    await request(app)
      .post(`/api/evidence/${evidence.body.id}/verify`)
      .expect(200)
      .expect(({ body }) => expect(body.state).toBe("Modified"));
    unlinkSync(path.join(process.env.NTC3_VAULT_PATH!, relativePath));
    await request(app)
      .post(`/api/evidence/${evidence.body.id}/verify`)
      .expect(200)
      .expect(({ body }) => expect(body.state).toBe("Missing"));
  });

  it("governs Knowledge aggregates, claims, citations, relationships, versions, and archive", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Knowledge governance workspace" })
      .expect(201);
    const otherWorkspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Other Knowledge workspace" })
      .expect(201);
    await request(app)
      .post("/api/knowledge")
      .send({ title: "Unowned Knowledge" })
      .expect(400);
    const page = await request(app)
      .post("/api/knowledge")
      .send({
        title: "Transactional outbox",
        workspaceId: workspace.body.id,
        summary: "Why state and events commit together",
      })
      .expect(201);
    const related = await request(app)
      .post("/api/knowledge")
      .send({
        title: "Projection replay",
        workspaceId: workspace.body.id,
      })
      .expect(201);
    const crossWorkspace = await request(app)
      .post("/api/knowledge")
      .send({
        title: "Foreign page",
        workspaceId: otherWorkspace.body.id,
      })
      .expect(201);

    await request(app)
      .patch(`/api/knowledge/${page.body.id}`)
      .send({
        expectedVersion: 999,
        content: "<p>stale</p>",
      })
      .expect(409);
    const updated = await request(app)
      .patch(`/api/knowledge/${page.body.id}`)
      .send({
        expectedVersion: page.body.version,
        content: "<p>Use one SQLite transaction.</p>",
        changeSummary: "Author rationale",
      })
      .expect(200);
    expect(updated.body.version).toBe(2);

    await request(app)
      .post(`/api/knowledge/${page.body.id}/relationships`)
      .send({
        targetKnowledgeId: crossWorkspace.body.id,
        relationshipType: "RelatedTo",
      })
      .expect(409);
    const relationship = await request(app)
      .post(`/api/knowledge/${page.body.id}/relationships`)
      .send({
        targetKnowledgeId: related.body.id,
        relationshipType: "Explains",
      })
      .expect(201);
    expect(relationship.body.targetTitle).toBe("Projection replay");
    await request(app)
      .post(`/api/knowledge/${page.body.id}/relationships`)
      .send({
        targetKnowledgeId: related.body.id,
        relationshipType: "Supersedes",
      })
      .expect(201);
    await request(app)
      .post(`/api/knowledge/${related.body.id}/relationships`)
      .send({
        targetKnowledgeId: page.body.id,
        relationshipType: "Supersedes",
      })
      .expect(409);

    const evidence = await request(app)
      .post("/api/evidence")
      .send({
        title: "Outbox benchmark",
        type: "Benchmark",
        workspaceId: workspace.body.id,
        content: "Atomic rollback verified.",
      })
      .expect(201);
    const source = database.get(
      "SELECT id FROM evidence_sources WHERE evidence_id = ?",
      [evidence.body.id],
    )!;
    const claim = await request(app)
      .post(`/api/knowledge/${page.body.id}/claims`)
      .send({
        statement: "Domain state and its event commit atomically.",
      })
      .expect(201);
    await request(app)
      .post(`/api/knowledge/${page.body.id}/transition`)
      .send({
        expectedVersion: updated.body.version,
        lifecycleStatus: "Verified",
      })
      .expect(409);
    const citation = await request(app)
      .post(`/api/knowledge/${page.body.id}/claims/${claim.body.id}/citations`)
      .send({ evidenceId: evidence.body.id, sourceId: source.id })
      .expect(201);
    expect(citation.body.sourceVersion).toBe(1);
    const verifiedClaim = await request(app)
      .patch(`/api/knowledge/${page.body.id}/claims/${claim.body.id}`)
      .send({
        expectedVersion: claim.body.version,
        supportStatus: "Supported",
        reviewStatus: "HumanVerified",
        reviewer: "Local Owner",
      })
      .expect(200);
    expect(verifiedClaim.body.reviewStatus).toBe("HumanVerified");
    const verified = await request(app)
      .post(`/api/knowledge/${page.body.id}/transition`)
      .send({
        expectedVersion: updated.body.version,
        lifecycleStatus: "Verified",
      })
      .expect(200);
    const reviewed = await request(app)
      .patch(`/api/knowledge/${page.body.id}`)
      .send({
        expectedVersion: verified.body.version,
        owner: "Architecture Council",
        reviewStatus: "Approved",
        reviewedAt: new Date().toISOString(),
      })
      .expect(200);
    const canonical = await request(app)
      .post(`/api/knowledge/${page.body.id}/transition`)
      .send({
        expectedVersion: reviewed.body.version,
        lifecycleStatus: "Canonical",
      })
      .expect(200);
    expect(canonical.body.lifecycleStatus).toBe("Canonical");

    const versions = await request(app)
      .get(`/api/knowledge/${page.body.id}/versions`)
      .expect(200);
    expect(versions.body.length).toBeGreaterThanOrEqual(5);
    await request(app)
      .post(`/api/knowledge/${page.body.id}/archive`)
      .send({ expectedVersion: 1 })
      .expect(409);
    const archivedKnowledge = await request(app)
      .post(`/api/knowledge/${page.body.id}/archive`)
      .send({ expectedVersion: canonical.body.version })
      .expect(200);
    await request(app)
      .patch(`/api/knowledge/${page.body.id}`)
      .send({
        expectedVersion: canonical.body.version + 1,
        title: "Forbidden",
      })
      .expect(409);
    await request(app).delete(`/api/knowledge/${page.body.id}`).expect(409);
    await request(app)
      .get("/api/knowledge")
      .query({ search: "Transactional" })
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(0));
    await request(app)
      .post(`/api/knowledge/${page.body.id}/restore`)
      .send({ expectedVersion: archivedKnowledge.body.version })
      .expect(200);

    expect(
      Number(
        database.get(
          `SELECT count(*) count FROM domain_events
      WHERE aggregate_type = 'knowledge' AND aggregate_id = ?`,
          [page.body.id],
        )?.count,
      ),
    ).toBeGreaterThan(0);
    expect(
      Number(
        database.get(
          `SELECT count(*) count FROM activity
      WHERE entity_type = 'knowledge' AND entity_id = ? AND source_event_id IS NOT NULL`,
          [page.body.id],
        )?.count,
      ),
    ).toBeGreaterThan(0);
  });

  it("governs Campaign mission, lifecycle, phase, versions, archive, and Activity projection", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Campaign Governance", purpose: "Product" })
      .expect(201);

    await request(app)
      .post("/api/campaigns")
      .send({ title: "Unowned Campaign" })
      .expect(400);

    const created = await request(app)
      .post("/api/campaigns")
      .send({
        title: "Route 05 governed narrative",
        workspaceId: workspace.body.id,
        campaignType: "ProductDevelopment",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      workspaceId: workspace.body.id,
      lifecycleStatus: "Planning",
      phase: "Planning",
      version: 1,
      storyCount: 0,
    });

    await request(app)
      .patch(`/api/campaigns/${created.body.id}`)
      .send({ expectedVersion: 99, owner: "Wrong writer" })
      .expect(409);
    const defined = await request(app)
      .patch(`/api/campaigns/${created.body.id}`)
      .send({
        expectedVersion: 1,
        missionStatement: "Make Campaign governance visible.",
        successDefinition: "The mission has an auditable outcome.",
        owner: "Editorial Engineering",
        targetStoryCount: 1,
        changeSummary: "Activation contract completed",
      })
      .expect(200);
    expect(defined.body.version).toBe(2);

    const active = await request(app)
      .post(`/api/campaigns/${created.body.id}/transition`)
      .send({
        expectedVersion: defined.body.version,
        lifecycleStatus: "Active",
      })
      .expect(200);
    expect(active.body.lifecycleStatus).toBe("Active");

    const phased = await request(app)
      .post(`/api/campaigns/${created.body.id}/phase`)
      .send({ expectedVersion: active.body.version, phase: "Research" })
      .expect(200);
    expect(phased.body.phase).toBe("Research");

    await request(app)
      .post(`/api/campaigns/${created.body.id}/transition`)
      .send({ expectedVersion: phased.body.version, lifecycleStatus: "Paused" })
      .expect(409);
    const paused = await request(app)
      .post(`/api/campaigns/${created.body.id}/transition`)
      .send({
        expectedVersion: phased.body.version,
        lifecycleStatus: "Paused",
        reason: "Awaiting evidence review",
      })
      .expect(200);
    expect(paused.body.pauseReason).toBe("Awaiting evidence review");

    const completed = await request(app)
      .post(`/api/campaigns/${created.body.id}/complete`)
      .send({
        expectedVersion: paused.body.version,
        completionNote: "The governed Campaign contract is operational.",
        successAssessment: "Achieved",
      })
      .expect(200);
    expect(completed.body.lifecycleStatus).toBe("Completed");

    const reopened = await request(app)
      .post(`/api/campaigns/${created.body.id}/reopen`)
      .send({
        expectedVersion: completed.body.version,
        reason: "A new correction requires active work",
      })
      .expect(200);
    expect(reopened.body.lifecycleStatus).toBe("Active");

    await request(app)
      .post(`/api/campaigns/${created.body.id}/archive`)
      .send({ expectedVersion: 1 })
      .expect(409);
    const archived = await request(app)
      .post(`/api/campaigns/${created.body.id}/archive`)
      .send({ expectedVersion: reopened.body.version })
      .expect(200);
    expect(archived.body.lifecycleStatus).toBe("Archived");
    await request(app)
      .patch(`/api/campaigns/${created.body.id}`)
      .send({ expectedVersion: archived.body.version, title: "Forbidden" })
      .expect(409);
    await request(app).delete(`/api/campaigns/${created.body.id}`).expect(409);
    await request(app)
      .get("/api/campaigns")
      .query({ search: "Route 05 governed narrative" })
      .expect(200)
      .expect(({ body }) => expect(body).toHaveLength(0));

    const restored = await request(app)
      .post(`/api/campaigns/${created.body.id}/restore`)
      .send({ expectedVersion: archived.body.version })
      .expect(200);
    expect(restored.body.lifecycleStatus).toBe("Active");
    const versions = await request(app)
      .get(`/api/campaigns/${created.body.id}/versions`)
      .expect(200);
    expect(versions.body.length).toBeGreaterThanOrEqual(9);

    expect(
      Number(
        database.get(
          `SELECT count(*) count FROM domain_events
          WHERE aggregate_type = 'campaign' AND aggregate_id = ?`,
          [created.body.id],
        )?.count,
      ),
    ).toBeGreaterThan(0);
    expect(
      Number(
        database.get(
          `SELECT count(*) count FROM activity
          WHERE entity_type = 'campaign' AND entity_id = ? AND source_event_id IS NOT NULL`,
          [created.body.id],
        )?.count,
      ),
    ).toBeGreaterThan(0);
  });

  it("governs Campaign Story portfolios, backlinks, ordering, and milestones", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Campaign Portfolio Workspace", purpose: "Product" })
      .expect(201);
    const otherWorkspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Other Campaign Workspace", purpose: "Product" })
      .expect(201);
    const campaign = await request(app)
      .post("/api/campaigns")
      .send({
        title: "Portfolio Campaign",
        workspaceId: workspace.body.id,
      })
      .expect(201);
    const secondCampaign = await request(app)
      .post("/api/campaigns")
      .send({
        title: "Secondary Portfolio Campaign",
        workspaceId: workspace.body.id,
      })
      .expect(201);
    const anchorStory = await request(app)
      .post("/api/stories")
      .send({
        title: "Anchor portfolio Story",
        workspaceId: workspace.body.id,
        status: "Draft",
      })
      .expect(201);
    const supportingStory = await request(app)
      .post("/api/stories")
      .send({
        title: "Supporting portfolio Story",
        workspaceId: workspace.body.id,
        status: "Draft",
      })
      .expect(201);
    const legacyPointerAttempt = await request(app)
      .post("/api/stories")
      .send({
        title: "Legacy singular Campaign pointer attempt",
        workspaceId: workspace.body.id,
        status: "Draft",
        campaignId: campaign.body.id,
      })
      .expect(201);
    expect(
      database.get("SELECT campaign_id FROM stories WHERE id = ?", [
        legacyPointerAttempt.body.id,
      ])?.campaign_id,
    ).toBeNull();
    const crossWorkspaceStory = await request(app)
      .post("/api/stories")
      .send({
        title: "Cross Workspace Story",
        workspaceId: otherWorkspace.body.id,
        status: "Draft",
      })
      .expect(201);

    const anchor = await request(app)
      .post(`/api/campaigns/${campaign.body.id}/stories`)
      .send({
        expectedVersion: 1,
        storyId: anchorStory.body.id,
        role: "Anchor",
        isPrimary: true,
      })
      .expect(201);
    expect(anchor.body).toMatchObject({
      position: 0,
      role: "Anchor",
      isPrimary: true,
      version: 1,
    });
    await request(app)
      .post(`/api/campaigns/${campaign.body.id}/stories`)
      .send({
        expectedVersion: 1,
        storyId: supportingStory.body.id,
        role: "Supporting",
      })
      .expect(409);
    const supporting = await request(app)
      .post(`/api/campaigns/${campaign.body.id}/stories`)
      .send({
        expectedVersion: 2,
        storyId: supportingStory.body.id,
        role: "Supporting",
        contributionNote: "Explains the implementation boundary",
      })
      .expect(201);
    expect(supporting.body.position).toBe(1);
    await request(app)
      .post(`/api/campaigns/${campaign.body.id}/stories`)
      .send({
        expectedVersion: 3,
        storyId: crossWorkspaceStory.body.id,
        role: "Reference",
      })
      .expect(409);
    await request(app)
      .post(`/api/campaigns/${secondCampaign.body.id}/stories`)
      .send({
        expectedVersion: 1,
        storyId: anchorStory.body.id,
        role: "Anchor",
        isPrimary: true,
      })
      .expect(409);
    await request(app)
      .post(`/api/stories/${supportingStory.body.id}/links`)
      .send({
        entityType: "campaign",
        entityId: campaign.body.id,
      })
      .expect(409);

    const updatedMembership = await request(app)
      .patch(
        `/api/campaigns/${campaign.body.id}/stories/${supportingStory.body.id}`,
      )
      .send({
        expectedCampaignVersion: 3,
        expectedMembershipVersion: 1,
        role: "FollowUp",
      })
      .expect(200);
    expect(updatedMembership.body).toMatchObject({
      role: "FollowUp",
      version: 2,
    });
    const reorderedStories = await request(app)
      .put(`/api/campaigns/${campaign.body.id}/stories/order`)
      .send({
        expectedVersion: 4,
        storyIds: [supportingStory.body.id, anchorStory.body.id],
      })
      .expect(200);
    expect(
      reorderedStories.body.map((item: { storyId: number }) => item.storyId),
    ).toEqual([supportingStory.body.id, anchorStory.body.id]);

    const backlinks = await request(app)
      .get(`/api/stories/${anchorStory.body.id}/campaigns`)
      .expect(200);
    expect(backlinks.body).toContainEqual(
      expect.objectContaining({
        campaignId: campaign.body.id,
        role: "Anchor",
        isPrimary: true,
      }),
    );

    const discovery = await request(app)
      .post(`/api/campaigns/${campaign.body.id}/milestones`)
      .send({
        expectedVersion: 5,
        title: "Discovery accepted",
        targetDate: "2026-08-01",
      })
      .expect(201);
    const delivery = await request(app)
      .post(`/api/campaigns/${campaign.body.id}/milestones`)
      .send({
        expectedVersion: 6,
        title: "Portfolio operational",
      })
      .expect(201);
    await request(app)
      .patch(
        `/api/campaigns/${campaign.body.id}/milestones/${discovery.body.id}`,
      )
      .send({
        expectedCampaignVersion: 7,
        expectedMilestoneVersion: 1,
        status: "Completed",
      })
      .expect(409);
    const completed = await request(app)
      .patch(
        `/api/campaigns/${campaign.body.id}/milestones/${discovery.body.id}`,
      )
      .send({
        expectedCampaignVersion: 7,
        expectedMilestoneVersion: 1,
        status: "Completed",
        completionNote: "The portfolio contract was reviewed.",
      })
      .expect(200);
    expect(completed.body).toMatchObject({
      status: "Completed",
      version: 2,
    });
    const reorderedMilestones = await request(app)
      .put(`/api/campaigns/${campaign.body.id}/milestones/order`)
      .send({
        expectedVersion: 8,
        milestoneIds: [delivery.body.id, discovery.body.id],
      })
      .expect(200);
    expect(
      reorderedMilestones.body.map((item: { id: number }) => item.id),
    ).toEqual([delivery.body.id, discovery.body.id]);

    await request(app)
      .delete(
        `/api/campaigns/${campaign.body.id}/milestones/${delivery.body.id}`,
      )
      .send({ expectedVersion: 9 })
      .expect(204);
    const remainingMilestones = await request(app)
      .get(`/api/campaigns/${campaign.body.id}/milestones`)
      .expect(200);
    expect(remainingMilestones.body).toHaveLength(1);
    expect(remainingMilestones.body[0]).toMatchObject({
      id: discovery.body.id,
      position: 0,
    });

    await request(app)
      .delete(
        `/api/campaigns/${campaign.body.id}/stories/${supportingStory.body.id}`,
      )
      .send({ expectedVersion: 10 })
      .expect(204);
    await request(app)
      .get(`/api/stories/${supportingStory.body.id}`)
      .expect(200);
    const archived = await request(app)
      .post(`/api/campaigns/${campaign.body.id}/archive`)
      .send({ expectedVersion: 11 })
      .expect(200);
    await request(app)
      .post(`/api/campaigns/${campaign.body.id}/milestones`)
      .send({
        expectedVersion: archived.body.version,
        title: "Forbidden archived mutation",
      })
      .expect(409);

    expect(
      Number(
        database.get(
          `SELECT count(*) count FROM domain_events
          WHERE aggregate_type = 'campaign' AND aggregate_id = ?
            AND event_type IN (
              'StoryAddedToCampaign', 'CampaignStoryMembershipUpdated',
              'CampaignMilestoneCreated', 'CampaignMilestoneCompleted',
              'CampaignMilestonesReordered'
            )`,
          [campaign.body.id],
        )?.count,
      ),
    ).toBeGreaterThanOrEqual(5);
  });

  it("rolls back Campaign state and checkpoints when durable event append fails", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Campaign Recovery Workspace", purpose: "Product" })
      .expect(201);
    const campaign = await request(app)
      .post("/api/campaigns")
      .send({
        title: "Atomic Recovery Campaign",
        workspaceId: workspace.body.id,
      })
      .expect(201);

    database.run(`
      CREATE TRIGGER reject_campaign_milestone_event
      BEFORE INSERT ON domain_events
      WHEN new.aggregate_type = 'campaign'
        AND new.event_type = 'CampaignMilestoneCreated'
      BEGIN
        SELECT RAISE(ABORT, 'forced Campaign event failure');
      END
    `);
    try {
      await request(app)
        .post(`/api/campaigns/${campaign.body.id}/milestones`)
        .send({
          expectedVersion: 1,
          title: "Must roll back",
        })
        .expect(500);
    } finally {
      database.run("DROP TRIGGER reject_campaign_milestone_event");
    }

    const unchanged = await request(app)
      .get(`/api/campaigns/${campaign.body.id}`)
      .expect(200);
    expect(unchanged.body.version).toBe(1);
    const milestones = await request(app)
      .get(`/api/campaigns/${campaign.body.id}/milestones`)
      .expect(200);
    expect(milestones.body).toEqual([]);
    expect(
      Number(
        database.get(
          "SELECT count(*) count FROM campaign_versions WHERE campaign_id = ?",
          [campaign.body.id],
        )?.count,
      ),
    ).toBe(1);
  });

  it("governs the headless Publication lifecycle, provenance, search, and recovery", async () => {
    const workspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Publication Foundation", purpose: "Product" })
      .expect(201);
    const otherWorkspace = await request(app)
      .post("/api/workspaces")
      .send({ name: "Other Publication Workspace", purpose: "Product" })
      .expect(201);
    const story = await request(app)
      .post("/api/stories")
      .send({
        title: "Publication source Story",
        workspaceId: workspace.body.id,
      })
      .expect(201);

    await request(app)
      .post("/api/publications")
      .send({
        workspaceId: otherWorkspace.body.id,
        primaryStoryId: story.body.id,
        title: "Cross Workspace",
      })
      .expect(409);

    const created = await request(app)
      .post("/api/publications")
      .send({
        workspaceId: workspace.body.id,
        primaryStoryId: story.body.id,
        title: "Governed Publication",
        summary: "Route 06 foundation",
        content: "publication-search-token",
      })
      .expect(201);
    expect(created.body).toMatchObject({
      workspaceId: workspace.body.id,
      primaryStoryId: story.body.id,
      lifecycleStatus: "Draft",
      version: 1,
    });

    await request(app)
      .patch(`/api/publications/${created.body.id}`)
      .send({ expectedVersion: 99, title: "Conflict" })
      .expect(409);
    const updated = await request(app)
      .patch(`/api/publications/${created.body.id}`)
      .send({
        expectedVersion: 1,
        title: "Governed Publication Updated",
        changeSummary: "Editorial checkpoint",
      })
      .expect(200);
    expect(updated.body.version).toBe(2);

    const review = await request(app)
      .post(`/api/publications/${created.body.id}/transition`)
      .send({ expectedVersion: 2, lifecycleStatus: "InReview" })
      .expect(200);
    const approved = await request(app)
      .post(`/api/publications/${created.body.id}/transition`)
      .send({
        expectedVersion: review.body.version,
        lifecycleStatus: "Approved",
      })
      .expect(200);
    await request(app)
      .patch(`/api/publications/${created.body.id}`)
      .send({ expectedVersion: approved.body.version, title: "Blocked edit" })
      .expect(409);

    const search = await request(app)
      .get("/api/search")
      .query({ q: "publication-search-token", entityType: "publication" })
      .expect(200);
    expect(search.body[0]).toMatchObject({
      entityType: "publication",
      entityId: created.body.id,
      path: `/publications/${created.body.id}`,
    });

    const archived = await request(app)
      .post(`/api/publications/${created.body.id}/archive`)
      .send({
        expectedVersion: approved.body.version,
        reason: "Acceptance test",
      })
      .expect(200);
    expect(archived.body.lifecycleStatus).toBe("Archived");
    expect(
      (
        await request(app)
          .get("/api/search")
          .query({ q: "publication-search-token", entityType: "publication" })
          .expect(200)
      ).body,
    ).toEqual([]);

    const restored = await request(app)
      .post(`/api/publications/${created.body.id}/restore`)
      .send({ expectedVersion: archived.body.version })
      .expect(200);
    expect(restored.body).toMatchObject({
      lifecycleStatus: "Draft",
      version: archived.body.version + 1,
    });

    const versions = await request(app)
      .get(`/api/publications/${created.body.id}/versions`)
      .expect(200);
    expect(versions.body).toHaveLength(6);
    const backlinks = await request(app)
      .get(`/api/stories/${story.body.id}/publications`)
      .expect(200);
    expect(backlinks.body[0].id).toBe(created.body.id);
    const channels = await request(app).get("/api/channels").expect(200);
    expect(channels.body).toHaveLength(6);
    expect(
      Number(
        database.get(
          "SELECT count(*) count FROM domain_events WHERE aggregate_type = 'publication' AND aggregate_id = ?",
          [created.body.id],
        )?.count,
      ),
    ).toBe(6);
    expect(
      Number(database.get("SELECT count(*) count FROM story_outputs")?.count),
    ).toBeGreaterThanOrEqual(0);
  });
});
