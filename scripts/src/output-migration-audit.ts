import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const OUTPUT_AUDIT_CONTRACT_VERSION = "1.0.0";
export const MINIMUM_OUTPUT_SCHEMA_VERSION = 4;

const ACCEPTED_STATUSES = new Set([
  "Draft",
  "Review",
  "Ready",
  "Published",
  "Archived",
]);
const ACCEPTED_FORMATS = new Set([
  "html",
  "markdown",
  "md",
  "pdf",
  "docx",
  "text",
  "txt",
]);

// Versioned with the report contract. These are capability definitions only;
// they never create Channels or Connections.
const CHANNEL_CANDIDATES: Record<string, string> = {
  blog: "Blog",
  linkedin: "LinkedIn",
  markdown: "Markdown",
  pdf: "PDF",
  presentation: "Presentation",
  website: "Website",
};

type Severity = "Info" | "Warning" | "ActionRequired";
type IssueCode =
  | "UnassignedWorkspace"
  | "MissingStory"
  | "CrossWorkspaceOwnership"
  | "UnknownStatus"
  | "AmbiguousGrouping"
  | "AmbiguousDestination"
  | "InvalidFormat"
  | "DuplicateCandidate"
  | "MissingTitle"
  | "MissingContent"
  | "DeterministicChannelCandidate";

type OutputRow = {
  id: number;
  story_id: number;
  type: string;
  title: string;
  status: string;
  content: string | null;
  format: string | null;
  destination: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  story_exists: number;
  workspace_id: number | null;
  output_workspace_id: number | null;
};

export type OutputAuditFinding = {
  outputId: number;
  issueCode: IssueCode;
  severity: Severity;
  originalFingerprint: string;
  originalValues: {
    type: string;
    title: string;
    status: string;
    format: string | null;
    destination: string | null;
    createdAt: string;
    updatedAt: string;
  };
  details: string;
  candidateMappings: Array<Record<string, string | number>>;
  deterministic: boolean;
  requiredResolution: string | null;
};

export type OutputAuditReport = {
  contractVersion: string;
  generatedAt: string;
  applicationRevision: string;
  schemaVersion: number;
  vaultFingerprint: string;
  inventory: {
    totalOutputs: number;
    workspaceAssigned: number;
    workspaceUnassigned: number;
    storyAssigned: number;
    storyMissing: number;
    countsByType: Record<string, number>;
    countsByStatus: Record<string, number>;
    countsByFormat: Record<string, number>;
    countsByDestination: Record<string, number>;
  };
  findings: OutputAuditFinding[];
  summary: {
    info: number;
    warning: number;
    actionRequired: number;
    deterministicallyMappable: number;
    userResolutionRequired: number;
  };
};

const hash = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");

const normalize = (value: string | null) => value?.trim().toLowerCase() ?? "";

const redactDestination = (value: string | null): string | null => {
  if (!value) return value;
  if (path.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value)) {
    return "[REDACTED_PATH]";
  }
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) {
      if (
        /token|secret|key|password|credential|auth|signature|sig/i.test(key)
      ) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    url.username = url.username ? "[REDACTED]" : "";
    url.password = url.password ? "[REDACTED]" : "";
    return url.toString();
  } catch {
    return /(?:token|secret|password|authorization)\s*[=:]/i.test(value)
      ? "[REDACTED_SECRET]"
      : value;
  }
};

const stableObject = (entries: Array<string | null>) =>
  entries.reduce<Record<string, number>>((result, value) => {
    const key = value?.trim() || "(empty)";
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});

const sortedCounts = (values: Array<string | null>) =>
  Object.fromEntries(
    Object.entries(stableObject(values)).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );

const fingerprintOutput = (row: OutputRow) =>
  hash(
    JSON.stringify([
      row.id,
      row.story_id,
      row.type,
      row.title,
      row.status,
      row.content,
      row.format,
      row.destination,
      row.published_at,
      row.created_at,
      row.updated_at,
      row.output_workspace_id,
    ]),
  );

export function resolveVaultDatabase(vault: string): string {
  const resolved = path.resolve(vault);
  return resolved.endsWith(".sqlite")
    ? resolved
    : path.join(resolved, "database", "ntc3.sqlite");
}

export function createOutputMigrationAudit(input: {
  databasePath: string;
  applicationRevision: string;
  generatedAt?: string;
}): OutputAuditReport {
  // readOnly prevents schema initialization, migrations, journals, and audit writes.
  const database = new DatabaseSync(input.databasePath, { readOnly: true });
  try {
    database.exec("PRAGMA query_only = ON; PRAGMA foreign_keys = ON;");
    const schemaTable = database
      .prepare(
        "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
      )
      .get() as { present?: number } | undefined;
    if (!schemaTable?.present) {
      throw new Error("Vault has no schema_migrations table");
    }
    const schemaVersion = Number(
      (
        database
          .prepare("SELECT max(version) AS version FROM schema_migrations")
          .get() as { version?: number | null }
      ).version ?? 0,
    );
    if (schemaVersion < MINIMUM_OUTPUT_SCHEMA_VERSION) {
      throw new Error(
        `Vault schema ${schemaVersion} predates story_outputs (minimum ${MINIMUM_OUTPUT_SCHEMA_VERSION})`,
      );
    }
    const outputTable = database
      .prepare(
        "SELECT 1 AS present FROM sqlite_master WHERE type = 'table' AND name = 'story_outputs'",
      )
      .get() as { present?: number } | undefined;
    if (!outputTable?.present) {
      throw new Error("Vault schema is invalid: story_outputs is missing");
    }

    const outputColumns = new Set(
      (
        database.prepare("PRAGMA table_info(story_outputs)").all() as Array<{
          name: string;
        }>
      ).map((column) => column.name),
    );
    const legacyWorkspaceExpression = outputColumns.has("workspace_id")
      ? "output.workspace_id"
      : outputColumns.has("project_id")
        ? "output.project_id"
        : "NULL";
    const rows = database
      .prepare(
        `SELECT output.*,
          CASE WHEN story.id IS NULL THEN 0 ELSE 1 END AS story_exists,
          story.project_id AS workspace_id,
          ${legacyWorkspaceExpression} AS output_workspace_id
        FROM story_outputs output
        LEFT JOIN stories story ON story.id = output.story_id
        ORDER BY output.id`,
      )
      .all() as unknown as OutputRow[];

    const duplicateKeys = new Map<string, number[]>();
    for (const row of rows) {
      const key = JSON.stringify([
        row.story_id,
        normalize(row.title),
        normalize(row.type),
        normalize(row.destination),
      ]);
      duplicateKeys.set(key, [...(duplicateKeys.get(key) ?? []), row.id]);
    }

    const findings: OutputAuditFinding[] = [];
    const add = (
      row: OutputRow,
      issueCode: IssueCode,
      severity: Severity,
      details: string,
      deterministic: boolean,
      requiredResolution: string | null,
      candidateMappings: Array<Record<string, string | number>> = [],
    ) => {
      findings.push({
        outputId: row.id,
        issueCode,
        severity,
        originalFingerprint: fingerprintOutput(row),
        originalValues: {
          type: row.type,
          title: row.title,
          status: row.status,
          format: row.format,
          destination: redactDestination(row.destination),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        details,
        candidateMappings,
        deterministic,
        requiredResolution,
      });
    };

    for (const row of rows) {
      if (!row.story_exists) {
        add(
          row,
          "MissingStory",
          "ActionRequired",
          "The referenced Story does not exist.",
          false,
          "Select an existing Story before migration.",
        );
      } else if (row.workspace_id == null) {
        add(
          row,
          "UnassignedWorkspace",
          "ActionRequired",
          "The referenced Story has no Workspace owner.",
          false,
          "Assign the Story to a Workspace before migration.",
        );
      } else if (
        row.output_workspace_id != null &&
        row.output_workspace_id !== row.workspace_id
      ) {
        add(
          row,
          "CrossWorkspaceOwnership",
          "ActionRequired",
          "The legacy Output owner conflicts with its Story Workspace.",
          false,
          "Resolve Output and Story ownership before migration.",
        );
      }
      if (!ACCEPTED_STATUSES.has(row.status)) {
        add(
          row,
          "UnknownStatus",
          "ActionRequired",
          `Status "${row.status}" has no accepted compatibility meaning.`,
          false,
          "Map the status to an accepted Publication lifecycle state.",
        );
      }
      if (row.format && !ACCEPTED_FORMATS.has(normalize(row.format))) {
        add(
          row,
          "InvalidFormat",
          "Warning",
          `Format "${row.format}" is outside the accepted compatibility vocabulary.`,
          true,
          null,
        );
      }
      if (!row.title.trim()) {
        add(
          row,
          "MissingTitle",
          "Warning",
          "The Output has no usable display title.",
          true,
          null,
        );
      }
      if (!row.content?.trim()) {
        add(
          row,
          "MissingContent",
          "Warning",
          "The Output has no body content.",
          true,
          null,
        );
      }

      const destination = normalize(row.destination);
      const channel = CHANNEL_CANDIDATES[destination];
      if (destination && channel) {
        add(
          row,
          "DeterministicChannelCandidate",
          "Info",
          "The destination exactly matches an accepted provisional Channel definition.",
          true,
          null,
          [{ channel, mappingVersion: OUTPUT_AUDIT_CONTRACT_VERSION }],
        );
      } else if (destination) {
        add(
          row,
          "AmbiguousDestination",
          "ActionRequired",
          "The free-text destination cannot be mapped deterministically.",
          false,
          "Select a governed Channel during the separately authorized migration.",
        );
      }

      const duplicateKey = JSON.stringify([
        row.story_id,
        normalize(row.title),
        normalize(row.type),
        destination,
      ]);
      const similar = duplicateKeys.get(duplicateKey) ?? [];
      if (similar.length > 1) {
        add(
          row,
          "DuplicateCandidate",
          "Warning",
          "This Output resembles another record; both remain independent.",
          true,
          null,
          similar
            .filter((id) => id !== row.id)
            .map((outputId) => ({ outputId })),
        );
        add(
          row,
          "AmbiguousGrouping",
          "ActionRequired",
          "Similar Outputs might belong to one Publication but cannot be grouped automatically.",
          false,
          "Confirm grouping explicitly during the separately authorized migration.",
        );
      }
    }

    const issueOrder: IssueCode[] = [
      "UnassignedWorkspace",
      "MissingStory",
      "CrossWorkspaceOwnership",
      "UnknownStatus",
      "AmbiguousGrouping",
      "AmbiguousDestination",
      "InvalidFormat",
      "DuplicateCandidate",
      "MissingTitle",
      "MissingContent",
      "DeterministicChannelCandidate",
    ];
    findings.sort(
      (left, right) =>
        left.outputId - right.outputId ||
        issueOrder.indexOf(left.issueCode) -
          issueOrder.indexOf(right.issueCode),
    );

    const actionRequired = findings.filter(
      (finding) => finding.severity === "ActionRequired",
    ).length;
    const deterministicallyMappable = rows.filter(
      (row) =>
        row.story_exists &&
        row.workspace_id != null &&
        (row.output_workspace_id == null ||
          row.output_workspace_id === row.workspace_id) &&
        ACCEPTED_STATUSES.has(row.status) &&
        !findings.some(
          (finding) =>
            finding.outputId === row.id &&
            finding.severity === "ActionRequired",
        ),
    ).length;
    const vaultFingerprint = hash(
      JSON.stringify({
        schemaVersion,
        outputs: rows.map(fingerprintOutput),
      }),
    );

    return {
      contractVersion: OUTPUT_AUDIT_CONTRACT_VERSION,
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      applicationRevision: input.applicationRevision,
      schemaVersion,
      vaultFingerprint,
      inventory: {
        totalOutputs: rows.length,
        workspaceAssigned: rows.filter(
          (row) => row.story_exists && row.workspace_id != null,
        ).length,
        workspaceUnassigned: rows.filter(
          (row) => !row.story_exists || row.workspace_id == null,
        ).length,
        storyAssigned: rows.filter((row) => Boolean(row.story_exists)).length,
        storyMissing: rows.filter((row) => !row.story_exists).length,
        countsByType: sortedCounts(rows.map((row) => row.type)),
        countsByStatus: sortedCounts(rows.map((row) => row.status)),
        countsByFormat: sortedCounts(rows.map((row) => row.format)),
        countsByDestination: sortedCounts(
          rows.map((row) => redactDestination(row.destination)),
        ),
      },
      findings,
      summary: {
        info: findings.filter((finding) => finding.severity === "Info").length,
        warning: findings.filter((finding) => finding.severity === "Warning")
          .length,
        actionRequired,
        deterministicallyMappable,
        userResolutionRequired: new Set(
          findings
            .filter((finding) => finding.severity === "ActionRequired")
            .map((finding) => finding.outputId),
        ).size,
      },
    };
  } finally {
    database.close();
  }
}

export function databaseFileFingerprint(databasePath: string): string {
  return hash(readFileSync(databasePath));
}

export function outputAuditExitCode(report: OutputAuditReport): 0 | 2 {
  return report.summary.actionRequired > 0 ? 2 : 0;
}
