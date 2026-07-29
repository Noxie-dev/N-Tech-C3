import { all, getVaultInfo } from '@workspace/db';

type CountRow = { count: number };
type IssueRow = {
  issue_code: string;
  severity: string;
  count: number;
  unresolved: number;
};

const scalarCount = (sql: string) => Number((all(sql)[0] as CountRow | undefined)?.count ?? 0);

const issues = all(`
  SELECT
    issue_code,
    severity,
    count(*) AS count,
    sum(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) AS unresolved
  FROM evidence_migration_audit
  GROUP BY issue_code, severity
  ORDER BY
    CASE severity WHEN 'ActionRequired' THEN 1 WHEN 'Warning' THEN 2 ELSE 3 END,
    issue_code
`) as IssueRow[];

const flags = all(`
  SELECT flag_key, enabled, description, updated_at
  FROM feature_flags
  WHERE flag_key LIKE 'evidence.%'
  ORDER BY flag_key
`);

const report = {
  generatedAt: new Date().toISOString(),
  vaultDatabase: getVaultInfo().database,
  evidence: {
    total: scalarCount('SELECT count(*) AS count FROM evidence'),
    assigned: scalarCount('SELECT count(*) AS count FROM evidence WHERE project_id IS NOT NULL'),
    unassigned: scalarCount('SELECT count(*) AS count FROM evidence WHERE project_id IS NULL'),
    active: scalarCount("SELECT count(*) AS count FROM evidence WHERE lifecycle_status = 'Active'"),
  },
  sources: {
    total: scalarCount('SELECT count(*) AS count FROM evidence_sources'),
    managedFiles: scalarCount("SELECT count(*) AS count FROM evidence_sources WHERE source_kind = 'ManagedFile'"),
    inlineText: scalarCount("SELECT count(*) AS count FROM evidence_sources WHERE source_kind = 'InlineText'"),
    externalReferences: scalarCount("SELECT count(*) AS count FROM evidence_sources WHERE source_kind = 'ExternalReference'"),
    repositorySnapshots: scalarCount("SELECT count(*) AS count FROM evidence_sources WHERE source_kind = 'RepositorySnapshot'"),
    structuredChecksums: scalarCount('SELECT count(*) AS count FROM evidence_sources WHERE sha256 IS NOT NULL'),
  },
  audit: {
    unresolved: scalarCount('SELECT count(*) AS count FROM evidence_migration_audit WHERE resolved_at IS NULL'),
    issues,
  },
  rolloutFlags: flags,
};

console.log(JSON.stringify(report, null, 2));
