# Route 04 Knowledge Conformance and L3 Decision

Status: **Accepted — L3 Integrated**

Date: 2026-07-29

Route: 04 — Knowledge

## Decision

Route 04 Passes 1–3 satisfy the accepted aggregate, contract, traceability,
recovery, experience, performance, security, observability, and explainability
gates. Knowledge is designated **L3 Integrated** on the declared Apple M1/8 GB
support baseline.

The decision is change-controlled, not permanently frozen. It does not authorize
or claim Pass 4 Knowledge Intelligence, semantic/vector search, automatic
classification, automatic promotion, or graph visualization.

## Pass 1 — contracts, schema, and migration

OpenAPI now requires `workspaceId` for canonical Knowledge creation and exposes
governed lifecycle, review, ownership, optimistic version, claims, Evidence
citations, typed relationships/backlinks, archive/restore, transitions, and
version history. React Query and Zod clients are generated from that contract.

Ordered migration 11, `governed_knowledge_domain`, preserves legacy content,
category, tags, timestamps, and linked-ID payloads while adding:

- aggregate summary, slug, owner, lifecycle, review, version, archive, and
  supersession state;
- typed Knowledge relationships;
- ordered and versioned claims;
- citations to immutable Evidence source versions and optional locators;
- Knowledge checkpoints and migration-audit records; and
- active-only Knowledge FTS5 triggers.

Legacy Knowledge is never silently assigned to a Workspace. Valid same-Workspace
linked IDs are backfilled as `RelatedTo`; ambiguous, missing, self, unowned, and
cross-Workspace links remain compatibility data and are reported. The executable
`pnpm run audit:knowledge-migration` command reports ownership, governed record
counts, legacy payloads, and unresolved migration issues. A clean disposable Vault
reported zero unresolved issues; migration tests separately verify conservative
unowned/link backfill behavior.

## Pass 2 — governed domain

The API enforces active Workspace ownership, optimistic aggregate and claim
versions, archive read-only behavior, guarded lifecycle transitions, human review,
same-Workspace active relationships, acyclic `Supersedes` edges, and
same-Workspace Evidence/source/locator citation integrity.

Promotion to `Verified` requires a cited human-verified claim. Promotion from
`Verified` to `Canonical` requires an owner, approved review, and review date.
Every canonical Knowledge mutation appends a durable domain event in the same
SQLite transaction; Activity is projected from those events. Normal hard deletion
returns conflict and archive/restore is the supported lifecycle.

The Knowledge Studio exposes aggregate authoring, explicit save/version feedback,
claims, Evidence citations with current Integrity state, review/lifecycle
controls, typed relationships and backlinks, version history, and reversible
archive behavior. Archived editors are visibly disabled.

## Pass 3 — integrated experience

The Route 04 browser workflow creates Workspace-owned Knowledge, loads the Studio,
edits summary and owner, observes a version checkpoint, creates a claim, archives
into a read-only state, restores, and verifies persisted state. Initial Studio
content becomes visible within the five-second local experience budget. The run
also identified and corrected a React event-lifetime defect in asynchronous claim
creation.

The UI presents semantic headings, labelled/placeholder-addressable controls,
disabled read-only fields, visible lifecycle/review/version state, and alert
feedback for conflicts or invariant failures. Electron consumes the same built
React/API contract; unpacked desktop packaging is part of the final gate.

## Performance evidence

Environment: Apple M1, 8 logical cores, 8 GB RAM, Darwin 25.5.0, Node 24.18.0.

Fixture: 50 Workspaces, 10,000 Stories, 10,000 Evidence records, and 10,000
Knowledge records. Database workloads use 100 measured iterations.

| Knowledge workload                         |   Median |       p95 |
| ------------------------------------------ | -------: | --------: |
| Catalogue, 50 active records               | 6.961 ms |  8.175 ms |
| FTS5 search, 50 Knowledge hits             | 9.283 ms |  9.561 ms |
| Detail + claims + relationships + versions | 0.062 ms |  0.074 ms |
| Optimistic save + version checkpoint       | 9.316 ms | 10.456 ms |
| Claim + Evidence source citation           | 0.127 ms |  0.176 ms |

Cold database initialization measured 49.966 ms with the combined fixture.
These are named local measurements, not universal latency promises.

## Compatibility and recovery

- `project_id` remains the physical storage name; public Knowledge contracts use
  canonical `workspaceId`.
- `linked_page_ids` remains read-compatible but is no longer write authority.
- Normal delete is deprecated and rejected; archive/restore is canonical.
- Legacy unowned pages remain queryable for audit but are excluded from canonical
  catalogue mutation until a user assigns ownership.
- Aggregate state, checkpoints, and events share SQLite transactions; event-driven
  Activity remains rebuildable from durable events.
- Existing Vault backup/restore coverage includes the SQLite database that owns
  Knowledge, claim, citation, relationship, version, audit, and event state.

## Verification register

- OpenAPI code generation: passed.
- TypeScript workspace checks: passed.
- Repository tests: 5 files, 33 tests passed.
- Route 04 API conformance: ownership, conflicts, lifecycle, citation,
  relationship/cycle, versions, archive/search, events, and Activity passed.
- Browser end-to-end: 4 workflows passed, including governed Knowledge.
- 10,000-Knowledge named benchmark: passed.
- Clean-Vault migration audit command: passed with zero unresolved findings.
- Production build and TypeScript checks: passed.
- Electron Builder 26.15.3 unpacked macOS arm64 package with Electron 38.8.6:
  passed; signing was intentionally disabled for this local conformance build.

## Residual controlled work

The following does not block Route 04 L3:

- user-directed assignment/remediation of any legacy unowned or invalid-link rows
  reported in an upgraded personal Vault;
- destructive removal of dormant `linked_page_ids` and physical compatibility
  names after an observed compatibility window;
- richer keyboard shortcuts and visual graph exploration; and
- all Pass 4 Knowledge Intelligence capabilities, which require separate
  contracts, algorithms, evidence, authorization, and acceptance.
