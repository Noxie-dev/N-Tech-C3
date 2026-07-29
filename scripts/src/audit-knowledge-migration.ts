import { all, getVaultInfo } from "@workspace/db";

type CountRow = { count: number };
type IssueRow = {
  issue_code: string;
  severity: string;
  count: number;
  unresolved: number;
};

const scalarCount = (sql: string) =>
  Number((all(sql)[0] as CountRow | undefined)?.count ?? 0);

const issues = all(`
  SELECT
    issue_code,
    severity,
    count(*) AS count,
    sum(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS unresolved
  FROM knowledge_migration_audit
  GROUP BY issue_code, severity
  ORDER BY
    CASE severity WHEN 'ActionRequired' THEN 1 WHEN 'Warning' THEN 2 ELSE 3 END,
    issue_code
`) as IssueRow[];

const report = {
  generatedAt: new Date().toISOString(),
  vaultDatabase: getVaultInfo().database,
  knowledge: {
    total: scalarCount("SELECT count(*) AS count FROM knowledge"),
    assigned: scalarCount(
      "SELECT count(*) AS count FROM knowledge WHERE project_id IS NOT NULL",
    ),
    unassigned: scalarCount(
      "SELECT count(*) AS count FROM knowledge WHERE project_id IS NULL",
    ),
    active: scalarCount(
      "SELECT count(*) AS count FROM knowledge WHERE lifecycle_status != 'Archived'",
    ),
    archived: scalarCount(
      "SELECT count(*) AS count FROM knowledge WHERE lifecycle_status = 'Archived'",
    ),
  },
  governedRecords: {
    versions: scalarCount("SELECT count(*) AS count FROM knowledge_versions"),
    claims: scalarCount("SELECT count(*) AS count FROM knowledge_claims"),
    citations: scalarCount(
      "SELECT count(*) AS count FROM knowledge_claim_citations",
    ),
    typedRelationships: scalarCount(
      "SELECT count(*) AS count FROM knowledge_relationships",
    ),
  },
  compatibility: {
    legacyLinkPayloads: scalarCount(
      "SELECT count(*) AS count FROM knowledge WHERE linked_page_ids != '[]'",
    ),
  },
  audit: {
    unresolved: scalarCount(
      "SELECT count(*) AS count FROM knowledge_migration_audit WHERE resolved_at IS NULL",
    ),
    issues,
  },
};

console.log(JSON.stringify(report, null, 2));
