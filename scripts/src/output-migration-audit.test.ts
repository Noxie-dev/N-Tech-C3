import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { runMigrations } from "../../lib/db/src/migrations";
import {
  createOutputMigrationAudit,
  databaseFileFingerprint,
  outputAuditExitCode,
  resolveVaultDatabase,
} from "./output-migration-audit";

const temporaryDirectories: string[] = [];

const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), "ntc3-output-audit-"));
  temporaryDirectories.push(root);
  const databasePath = path.join(root, "ntc3.sqlite");
  const database = new DatabaseSync(databasePath);
  runMigrations(database);
  return { root, databasePath, database };
};

const audit = (databasePath: string) =>
  createOutputMigrationAudit({
    databasePath,
    applicationRevision: "test-revision",
    generatedAt: "2026-07-30T00:00:00.000Z",
  });

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Output migration audit contract 1.0.0", () => {
  it("reports an empty Vault deterministically without writing to it", () => {
    const { databasePath, database } = fixture();
    database.close();
    const before = databaseFileFingerprint(databasePath);

    const first = audit(databasePath);
    const second = audit(databasePath);

    expect(first).toEqual(second);
    expect(first.inventory.totalOutputs).toBe(0);
    expect(first.findings).toEqual([]);
    expect(outputAuditExitCode(first)).toBe(0);
    expect(databaseFileFingerprint(databasePath)).toBe(before);
  });

  it("finds ownership, status, format, grouping, and destination issues", () => {
    const { databasePath, database } = fixture();
    database
      .prepare("INSERT INTO projects (id, name) VALUES (1, 'Workspace')")
      .run();
    database
      .prepare(
        "INSERT INTO stories (id, title, project_id) VALUES (1, 'Owned', 1), (2, 'Unowned', NULL)",
      )
      .run();
    const insert = database.prepare(
      `INSERT INTO story_outputs
        (story_id, type, title, status, content, format, destination)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    insert.run(1, "Blog", "Release", "Draft", "body", "html", "LinkedIn");
    insert.run(1, "Blog", "Release", "Draft", "body", "html", "LinkedIn");
    insert.run(
      2,
      "Other",
      "",
      "Mystery",
      "",
      "binary",
      "https://example.test/publish?token=top-secret&view=public",
    );
    database.close();

    const report = audit(databasePath);
    const codes = report.findings.map((finding) => finding.issueCode);

    expect(codes).toContain("UnassignedWorkspace");
    expect(codes).toContain("UnknownStatus");
    expect(codes).toContain("InvalidFormat");
    expect(codes).toContain("MissingTitle");
    expect(codes).toContain("MissingContent");
    expect(codes).toContain("DuplicateCandidate");
    expect(codes).toContain("AmbiguousGrouping");
    expect(codes).toContain("DeterministicChannelCandidate");
    expect(codes).toContain("AmbiguousDestination");
    expect(JSON.stringify(report)).not.toContain("top-secret");
    expect(JSON.stringify(report)).not.toContain('"content"');
    expect(outputAuditExitCode(report)).toBe(2);
  });

  it("detects a missing Story in a legacy database with disabled foreign keys", () => {
    const { databasePath, database } = fixture();
    database.exec("PRAGMA foreign_keys = OFF");
    database
      .prepare(
        `INSERT INTO story_outputs
          (story_id, type, title, status, content)
         VALUES (999, 'Blog', 'Orphan', 'Draft', 'body')`,
      )
      .run();
    database.close();

    const report = audit(databasePath);
    expect(report.inventory.storyMissing).toBe(1);
    expect(report.findings[0]?.issueCode).toBe("MissingStory");
    expect(outputAuditExitCode(report)).toBe(2);
  });

  it("detects cross-Workspace ownership in a legacy extended Output table", () => {
    const { databasePath, database } = fixture();
    database.exec("ALTER TABLE story_outputs ADD COLUMN project_id INTEGER");
    database
      .prepare(
        "INSERT INTO projects (id, name) VALUES (1, 'Story Workspace'), (2, 'Output Workspace')",
      )
      .run();
    database
      .prepare(
        "INSERT INTO stories (id, title, project_id) VALUES (1, 'Owned', 1)",
      )
      .run();
    database
      .prepare(
        `INSERT INTO story_outputs
          (story_id, type, title, status, content, project_id)
         VALUES (1, 'Blog', 'Conflict', 'Draft', 'body', 2)`,
      )
      .run();
    database.close();

    const report = audit(databasePath);
    expect(report.findings[0]?.issueCode).toBe("CrossWorkspaceOwnership");
    expect(report.summary.deterministicallyMappable).toBe(0);
    expect(outputAuditExitCode(report)).toBe(2);
  });

  it("redacts absolute paths and secret-like free text", () => {
    const { databasePath, database } = fixture();
    database
      .prepare("INSERT INTO projects (id, name) VALUES (1, 'Workspace')")
      .run();
    database
      .prepare(
        "INSERT INTO stories (id, title, project_id) VALUES (1, 'Owned', 1)",
      )
      .run();
    const insert = database.prepare(
      `INSERT INTO story_outputs
        (story_id, type, title, status, content, destination)
       VALUES (1, 'Blog', ?, 'Draft', 'body', ?)`,
    );
    insert.run("Path", "/Users/private/export");
    insert.run("Secret", "authorization=Bearer private-value");
    database.close();

    const serialized = JSON.stringify(audit(databasePath));
    expect(serialized).toContain("[REDACTED_PATH]");
    expect(serialized).toContain("[REDACTED_SECRET]");
    expect(serialized).not.toContain("/Users/private/export");
    expect(serialized).not.toContain("private-value");
  });

  it("rejects schemas that predate story_outputs", () => {
    const { databasePath, database } = fixture();
    database.prepare("DELETE FROM schema_migrations WHERE version >= 4").run();
    database.close();

    expect(() => audit(databasePath)).toThrow(/predates story_outputs/);
  });

  it("resolves either a Vault root or a direct SQLite path", () => {
    expect(resolveVaultDatabase("/tmp/example")).toBe(
      "/tmp/example/database/ntc3.sqlite",
    );
    expect(resolveVaultDatabase("/tmp/example.sqlite")).toBe(
      "/tmp/example.sqlite",
    );
  });
});
