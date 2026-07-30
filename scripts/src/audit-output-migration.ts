import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createOutputMigrationAudit,
  outputAuditExitCode,
  resolveVaultDatabase,
} from "./output-migration-audit";

const args = process.argv.slice(2);
const valueFor = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const vault = valueFor("--vault");
const jsonPath = valueFor("--json");

if (!vault || !jsonPath) {
  console.error(
    "Usage: pnpm run audit:output-migration -- --vault <vault-or-sqlite> --json <report-path>",
  );
  process.exitCode = 1;
} else {
  try {
    const applicationRevision =
      process.env.NTC3_APPLICATION_REVISION ??
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: path.resolve(import.meta.dirname, "../.."),
        encoding: "utf8",
      }).trim();
    const report = createOutputMigrationAudit({
      databasePath: resolveVaultDatabase(vault),
      applicationRevision,
    });
    const target = path.resolve(jsonPath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: "utf8",
      flag: "w",
    });
    console.log(
      `Output migration audit wrote ${report.inventory.totalOutputs} records to ${target}`,
    );
    process.exitCode = outputAuditExitCode(report);
  } catch (error) {
    console.error(
      `Output migration audit failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}
