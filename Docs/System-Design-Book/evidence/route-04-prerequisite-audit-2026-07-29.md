# Route 04 Knowledge Prerequisite Audit

Status: **Accepted**

Date: 2026-07-29

## Decision

Route 04 may advance to its first implementation pass. Route 03 is L3 Governed
and supplies stable Workspace-owned Evidence identity, immutable source versions,
precise locators, provenance, integrity state, archive behavior, and canonical
contracts.

The accepted platform specifications supply transactional migrations, durable
events, Workspace mutation guards, rebuildable projections, performance methods,
and engineering standards. No unresolved prerequisite requires reopening Route
03.

## Current seed audit

| Area | Current evidence | Disposition |
| --- | --- | --- |
| Routes | `/knowledge` and `/knowledge/:id` Library/editor exist | Retain and evolve |
| Storage | SQLite title/content/category/tags and physical `project_id` | Migrate append-only |
| Ownership | `workspaceId` is not required by API/UI | Blocking Pass 1 correction |
| Lifecycle | No lifecycle/review/version/archive fields | Add in Pass 1 |
| Deletion | Public API/UI permanently delete | Replace with archive/restore |
| Concurrency | Updates have no expected version | Add optimistic conflict |
| Events | Create records Activity directly; update/delete are not durable events | Atomic event append + projection |
| Search | FTS5 exists but includes every row | Rebuild active-only projection |
| Page links | Untyped JSON `linked_page_ids` | Preserve, audit, migrate to typed edges |
| Story links | Join table exists | Retain; apply same-Workspace/archive invariants |
| Claims/citations | Not implemented | Pass 2 after aggregate governance |
| Versions/reviews | Not implemented | Pass 2 |
| Intelligence | Not implemented | Correctly deferred until after L3 |

## Dependency conformance

| Prerequisite | State | Evidence |
| --- | --- | --- |
| Knowledge domain owner and Workspace rule | Satisfied | Specification 01 |
| Append-only SQLite migration discipline | Satisfied | Specification 02 and migration tests |
| Transactional domain-event runtime | Satisfied | Specifications 02/08 and existing Story/Evidence execution |
| Archived-Workspace mutation guard | Satisfied platform capability | Shared API guard; Knowledge must apply canonical ownership |
| Evidence identity/source versions/locators | Satisfied | Route 03 L3 decision |
| Evidence integrity and visible degraded states | Satisfied | `evidence-integrity@1.0.0` |
| FTS5 and performance baseline method | Satisfied | Specifications 02/09 and benchmark script |
| Filesystem work | Not required for Pass 1 | Knowledge content remains SQLite HTML |

## Compatibility debt

- Physical `knowledge.project_id` is retained while public contracts move to
  `workspaceId`.
- Unassigned legacy Knowledge is reported and remains visible for remediation; no
  Workspace is guessed.
- `linked_page_ids` remains readable until typed-edge migration evidence is
  accepted. Invalid or ambiguous IDs produce audit findings.
- Existing hard-delete clients receive an explicit compatibility decision during
  Pass 1; the product UI moves to archive immediately.

## Authorized boundary

`Docs/Route-04-Knowledge-execution-plan.md` defines and accepts Route 04 at L1.
Only **Pass 1 — Aggregate contracts and schema** is authorized next. Claims,
citations, Intelligence, animated graphs, semantic search, and automatic canonical
promotion are outside that boundary.
