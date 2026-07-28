# Route 01/02 Constitutional Invariant Audit

Status: **Accepted evidence record**
Audit date: 2026-07-29
Scope: Workspaces and Stories
Specifications: 01, 02, 08, 10, 11, 12

## Executive result

| Classification | Count |
| --- | ---: |
| Conformant | 13 |
| Corrective work | 7 |
| Migration work | 5 |
| Accepted compatibility debt | 4 |

Route 01 and Route 02 have sound product boundaries and meaningful automated
coverage. Their largest constitutional gap is not UI behavior; it is the absence of
an atomic, durable domain-event substrate and versioned Intelligence provenance.

## Conformant invariants

| Invariant | Evidence |
| --- | --- |
| Workspace is a distinct operating context | Canonical `/workspaces` picker, overview, settings, filters, and scoped metrics |
| Workspace archive is reversible | Archive/restore API and UI |
| Story is a distinct intellectual product | Global/scoped catalogues and multi-section Story studio |
| Story content is canonical HTML | TipTap storage and README/index decision |
| Story relationships are links | Join tables for Evidence, Knowledge, Assets, Campaigns, and Stories |
| Story lifecycle is explicit | Canonical status enum and transition endpoint |
| Story archive replaces normal hard-delete UI | Story studio exposes archive/restore |
| Cross-Workspace Story links are rejected | Story link API returns `409` |
| Story save protects against stale writes | `expectedVersion` conflict returns `409` |
| Story versions are checkpointed | `story_versions` migration and timeline projection |
| Health is deterministic and explained | Workspace/Story component calculations and blocker output |
| OpenAPI-first workflow is enforced | Generated React Query/Zod output and passing typecheck |
| Migration behavior is tested | Fresh/idempotent/relationship migration tests |

## Corrective work

### C-01 — Archived Workspace is not transitively read-only

Severity: **High**

The Workspace API rejects mutations to an archived Workspace, but child Story,
Evidence, Asset, Knowledge, Campaign, and Template routes do not consistently check
the parent Workspace state.

Required correction:

- add one domain guard used by every child mutation;
- return `409` with a restore instruction;
- add API tests for each mutable child type.

### C-02 — Canonical Story creation does not require a Workspace

Severity: **High**

The UI requires a Workspace, but the compatibility API still permits an unassigned
Story. New canonical creation violates the accepted Domain Model.

Required correction:

- require `workspaceId` on the canonical create contract;
- retain an explicitly deprecated compatibility path only if existing integrations
  require it;
- report and resolve unassigned legacy Stories.

### C-03 — Lifecycle transition ordering is incomplete

Severity: **Medium**

Approval and publication blockers exist, but the API currently permits arbitrary
stage jumps.

Required correction:

- encode allowed transitions as a pure domain policy;
- permit documented backward transitions;
- test every allowed and rejected edge.

### C-04 — Output readiness can be asserted at creation

Severity: **Medium**

An Output may be created directly as `Ready` without readiness validation.

Required correction:

- create Outputs as Draft by default;
- add validated Output transitions;
- require format/destination rules appropriate to the Output type.

### C-05 — Story outline replacement is not explicitly transactional

Severity: **Medium**

Delete-and-reinsert is vulnerable to partial replacement if a later insert fails.

Required correction:

- wrap replacement in one SQLite transaction;
- preserve stable IDs or document replacement semantics;
- test rollback on invalid middle items.

### C-06 — Activity writes are intentionally lossy

Severity: **Medium**

This is acceptable only while Activity remains non-authoritative. Current code must
not be reused as the durable Event Architecture.

Required correction:

- project Activity from durable domain events;
- keep projection failure isolated;
- expose projection lag diagnostics.

### C-07 — Hard-delete APIs remain broadly callable

Severity: **Medium**

Normal UI behavior archives Workspaces/Stories, but destructive compatibility
endpoints remain available without a maintenance/recovery policy.

Required correction:

- mark destructive operations deprecated in OpenAPI;
- gate permanent deletion behind explicit maintenance semantics;
- add relationship and backup checks.

## Migration work

### M-01 — Durable domain event/outbox storage

Add `domain_events` and `event_consumers`, with atomic append and replay tests.

### M-02 — Intelligence result provenance

Add versioned result storage for scores, derived facts, relationship suggestions,
and recommendations.

### M-03 — Workspace terminology completion

Expose canonical `workspaceId` across remaining child contracts, then plan the
physical `projects`/`project_id` rename only after compatibility evidence.

### M-04 — Legacy Story relationship columns

Backfill and eventually remove single `campaign_id`, `evidence.story_id`, and
`assets.story_id` compatibility paths after graph-table consumers are complete.

### M-05 — Unassigned legacy entities

Provide a migration report and user-assisted assignment workflow rather than
silently choosing a Workspace.

## Accepted compatibility debt

| ID | Debt | Acceptance condition | Removal condition |
| --- | --- | --- | --- |
| D-01 | Physical `projects` table | Existing vault preservation | All public consumers use Workspace contracts and upgrade evidence exists |
| D-02 | Physical `project_id` columns | Existing foreign-key stability | Dedicated rename migration is benchmarked and recoverable |
| D-03 | Deprecated `/api/projects` | Existing integrations/bookmarks | One compatibility release plus usage confirmation |
| D-04 | Deprecated hard-delete Story endpoint | Test/maintenance compatibility | Maintenance deletion policy and archive migration complete |

No new feature may depend on or expand these compatibility interfaces.

## Intelligence conformance

Current Workspace and Story Health calculations are deterministic and explained,
but they lack:

- capability ID/version;
- input entity version or event watermark;
- stored provenance;
- invalidation record;
- event-driven recalculation.

They are accepted as the first candidates for EIE capability migration, not as final
constitutional conformance.

## Prioritized corrective backlog

1. M-01 durable events/outbox.
2. M-02 Intelligence result contracts.
3. C-01 archived Workspace child guard.
4. C-02 required Workspace for canonical Story creation.
5. C-03 lifecycle transition policy.
6. C-05 transactional outline replacement.
7. C-04 validated Output lifecycle.
8. C-06 Activity projection migration.
9. C-07 maintenance deletion policy.
10. M-03 through M-05 compatibility migrations.

## Audit conclusion

Routes 01 and 02 do not require redesign. They require platform consolidation:
durable events, explicit domain guards, versioned Intelligence provenance, and
controlled retirement of compatibility paths.
