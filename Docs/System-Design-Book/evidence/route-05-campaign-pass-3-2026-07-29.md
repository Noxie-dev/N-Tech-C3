# Route 05 Campaign Pass 3 Conformance and L3 Decision

Status: **Accepted — L3 Integrated**

Date: 2026-07-29

Route: 05 — Campaigns

## Decision

Route 05 Passes 1–3 satisfy the aggregate, contract, traceability, recovery,
experience, performance, security, observability, compatibility, and desktop
conformance gates. Campaign is designated **L3 Integrated** on the declared Apple
M1/8 GB support baseline.

The decision is change-controlled, not permanently frozen. It does not authorize
Publications, Channels, scheduling, analytics, provider connections, external
publishing, or Campaign Intelligence.

## Integrated experience and accessibility

The browser workflow creates a Workspace-owned Campaign and Story, loads Mission
Control, saves governed mission fields, adds an Anchor portfolio membership with
a contribution note, creates a milestone, activates, archives into read-only
state, restores, and verifies persistence and the Story backlink.

The UI exposes semantic route headings, labelled controls, keyboard-focusable
commands, disabled archive state, visible lifecycle/version state, explicit
unlink confirmations, and a live alert for optimistic conflicts. The conformance
workflow forces a concurrent update and observes `Campaign version conflict`
without overwriting the concurrent writer.

## Recovery and observability

A forced SQLite failure on `CampaignMilestoneCreated` event append produces a
failed command while leaving the milestone absent, Campaign version unchanged,
and checkpoint count unchanged. This proves state, checkpoint, and durable event
share the transaction boundary.

The executable Campaign migration audit reports:

- aggregate versions, memberships, primary memberships, milestones, terminal
  milestones, and durable events;
- unprojected durable Campaign events and recorded projection failures;
- legacy platform/status payloads and singular Story pointers; and
- unresolved migration findings grouped by severity and issue code.

The clean disposable Vault reported zero unresolved findings, zero unprojected
Campaign events, and zero recorded projection failures.

## Compatibility-retirement evidence

Canonical Story creation and patch contracts no longer accept `campaignId`.
Generic Story-side Campaign link/unlink returns conflict. Campaign-owned
`story_campaigns` commands are the sole relationship write authority; an API test
proves a submitted legacy singular pointer is not persisted.

The physical `stories.campaign_id`, Campaign `platforms`, legacy `status`,
`project_id`, and related compatibility columns remain read/audit-compatible
through the observed migration window. Removing them is a later
change-controlled migration. No compatibility value is interpreted as a
Publication, Channel, Deployment, connection, or schedule.

## Performance evidence

Environment: Apple M1, 8 logical cores, 8 GB RAM, Darwin 25.5.0, Node 24.18.0.

Fixture: 50 Workspaces, 10,000 Stories, 10,000 Evidence, 10,000 Knowledge,
10,000 Campaigns, a representative 200-Story Campaign portfolio, and 50 Campaign
milestones. Database workloads use 100 measured iterations.

| Campaign workload                          |    Median |       p95 |
| ------------------------------------------ | --------: | --------: |
| Catalogue, 50 active records               |  0.237 ms |  0.252 ms |
| FTS5 search, 50 Campaign hits              | 19.265 ms | 24.470 ms |
| Detail + portfolio + milestones + versions |  0.396 ms |  0.646 ms |
| Optimistic save + version checkpoint       | 12.788 ms | 13.373 ms |
| Portfolio read, 200 Story memberships      |  0.326 ms |  0.356 ms |
| Milestone versioned update                 |  0.071 ms |  0.094 ms |
| Atomic membership reorder                  |  0.113 ms |  0.125 ms |

Cold database initialization measured 58.621 ms for the combined fixture. These
are named local measurements, not universal latency promises.

## Backup and desktop conformance

Vault backup coverage explicitly round-trips database content representing the
Campaign aggregate, portfolio membership, milestone, version checkpoint, and
durable event. The same archive tests retain traversal and absolute-path
rejection.

Electron Builder 26.15.3 produced the unpacked macOS arm64 application with
Electron 38.8.6. Signing was intentionally disabled for this local conformance
build.

## Verification register

- OpenAPI client/Zod generation: passed.
- Workspace TypeScript checks: passed.
- Production build: passed.
- Repository suite: 5 files, 38 tests passed.
- Ordered migrations: 13 tests passed.
- API conformance: 16 workflows passed, including forced event failure rollback.
- Browser conformance: 5 workflows passed, including keyboard focus and visible
  concurrent-write conflict.
- A post-package all-suite rerun observed one 21.7-second Campaign route-load
  outlier while the page still rendered correctly; the isolated workflow
  immediately passed in 2.3 seconds. This is retained as environmental
  observation evidence rather than hidden or promoted to a universal guarantee.
- Named 10,000-Campaign/portfolio benchmark: passed.
- Clean-Vault audit: zero unresolved, unprojected, or projection-failure findings.
- Backup round-trip and archive safety: passed.
- Unpacked macOS arm64 Electron package: passed.
- Markdown whitespace validation: passed.

## Residual controlled work

The following does not block Route 05 L3:

- user-directed remediation of legacy audit findings in personal Vaults;
- destructive removal of retained physical compatibility columns after the
  observed migration window;
- pagination/virtualization if future measured Campaign catalogue sizes require
  it; and
- all Publication/Channel integration, scheduling, analytics, external provider,
  and Campaign Intelligence work, which remains separately gated and
  unauthorized.
