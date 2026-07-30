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
  FROM campaign_migration_audit
  GROUP BY issue_code, severity
  ORDER BY
    CASE severity WHEN 'ActionRequired' THEN 1 WHEN 'Warning' THEN 2 ELSE 3 END,
    issue_code
`) as IssueRow[];

const report = {
  generatedAt: new Date().toISOString(),
  vaultDatabase: getVaultInfo().database,
  campaigns: {
    total: scalarCount("SELECT count(*) AS count FROM campaigns"),
    assigned: scalarCount(
      "SELECT count(*) AS count FROM campaigns WHERE project_id IS NOT NULL",
    ),
    unassigned: scalarCount(
      "SELECT count(*) AS count FROM campaigns WHERE project_id IS NULL",
    ),
    activeRecords: scalarCount(
      "SELECT count(*) AS count FROM campaigns WHERE lifecycle_status != 'Archived'",
    ),
    archived: scalarCount(
      "SELECT count(*) AS count FROM campaigns WHERE lifecycle_status = 'Archived'",
    ),
  },
  governedRecords: {
    versions: scalarCount("SELECT count(*) AS count FROM campaign_versions"),
    memberships: scalarCount("SELECT count(*) AS count FROM story_campaigns"),
    primaryMemberships: scalarCount(
      "SELECT count(*) AS count FROM story_campaigns WHERE is_primary = 1",
    ),
    milestones: scalarCount(
      "SELECT count(*) AS count FROM campaign_milestones",
    ),
    terminalMilestones: scalarCount(
      `SELECT count(*) AS count FROM campaign_milestones
       WHERE status IN ('Completed', 'Skipped')`,
    ),
    durableEvents: scalarCount(
      "SELECT count(*) AS count FROM domain_events WHERE aggregate_type = 'campaign'",
    ),
  },
  projectionObservability: {
    unprojectedDurableEvents: scalarCount(
      `SELECT count(*) AS count
       FROM domain_events event
       LEFT JOIN activity projection ON projection.source_event_id = event.id
       WHERE event.aggregate_type = 'campaign' AND projection.id IS NULL`,
    ),
    recordedProjectionFailures: scalarCount(
      `SELECT count(*) AS count
       FROM event_failures failure
       JOIN domain_events event ON event.id = failure.event_id
       WHERE event.aggregate_type = 'campaign'`,
    ),
  },
  compatibility: {
    legacyPlatformPayloads: scalarCount(
      "SELECT count(*) AS count FROM campaigns WHERE platforms != '[]'",
    ),
    legacyStatusMismatches: scalarCount(
      "SELECT count(*) AS count FROM campaigns WHERE status != lifecycle_status",
    ),
    legacySingularStoryPointers: scalarCount(
      "SELECT count(*) AS count FROM stories WHERE campaign_id IS NOT NULL",
    ),
  },
  audit: {
    unresolved: scalarCount(
      "SELECT count(*) AS count FROM campaign_migration_audit WHERE resolved_at IS NULL",
    ),
    issues,
  },
};

console.log(JSON.stringify(report, null, 2));
