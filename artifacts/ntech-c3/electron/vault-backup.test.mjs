import { describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createVaultBackup,
  extractVaultBackup,
  validateArchiveListing,
} from "./vault-backup.mjs";

describe("Vault backup conformance", () => {
  it("round-trips database and Evidence lifecycle/recovery fixtures", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "ntc3-backup-source-"));
    const restored = await mkdtemp(
      path.join(tmpdir(), "ntc3-backup-restored-"),
    );
    await mkdir(path.join(root, "database"), { recursive: true });
    await mkdir(path.join(root, "evidence", ".staging"), { recursive: true });
    await writeFile(
      path.join(root, "database", "ntc3.sqlite"),
      "active archived failed ingest metadata campaign aggregate portfolio membership milestone checkpoint durable event",
    );
    await writeFile(path.join(root, "evidence", "active.bin"), "active");
    await writeFile(path.join(root, "evidence", "archived.bin"), "archived");
    await writeFile(
      path.join(root, "evidence", ".staging", "pending.part"),
      "staged",
    );
    const archive = path.join(tmpdir(), `ntc3-backup-${Date.now()}.tar.gz`);

    await createVaultBackup({ root, destination: archive });
    const entries = await extractVaultBackup({
      archive,
      destination: restored,
    });
    expect(entries).toEqual(
      expect.arrayContaining([
        "./database/ntc3.sqlite",
        "./evidence/active.bin",
        "./evidence/archived.bin",
        "./evidence/.staging/pending.part",
      ]),
    );
    expect(
      await readFile(path.join(restored, "database", "ntc3.sqlite"), "utf8"),
    ).toContain("active archived failed ingest");
    expect(
      await readFile(path.join(restored, "database", "ntc3.sqlite"), "utf8"),
    ).toContain(
      "campaign aggregate portfolio membership milestone checkpoint durable event",
    );
  });

  it("rejects traversal and absolute archive entries", () => {
    expect(() =>
      validateArchiveListing("./database/ntc3.sqlite\n../escape"),
    ).toThrow("Unsafe");
    expect(() => validateArchiveListing("/absolute/file")).toThrow("Unsafe");
  });
});
