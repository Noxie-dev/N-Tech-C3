# Evidence Governed Operations Verification

Status: **Implemented and verified**

Date: 2026-07-29

Scope: Route 03 Pass 2C

## Implemented boundary

- Evidence metadata updates require `expectedVersion`, increment the aggregate
  version, and return `409` with the current version for stale clients.
- Source payload fields, Workspace ownership, and legacy singular Story ownership
  are absent from the canonical metadata-patch contract.
- Archived Evidence is read-only. Archive and restore are reversible,
  version-guarded commands; public permanent deletion returns `409`.
- Immutable source versions can be listed in descending version order.
- Evidence-to-Story relationships have canonical typed commands with role,
  relevance, optional notes, and optional source locator.
- Link mutations reject archived records and cross-Workspace relationships.
- Durable events cover metadata, review, link, unlink, archive, and restore
  transitions. Activity consumes them through its existing persisted checkpoint.
- The FTS5 Evidence projection is migration-rebuildable and transactionally removes
  archived records, then restores them when the aggregate is restored.

## Ordered migration

Migration 8, `governed_evidence_operations`, adds `role` and
`source_locator_id` to `story_evidence`, indexes the Evidence relationship
timeline, replaces the Evidence FTS triggers with lifecycle-aware triggers, and
rebuilds existing active Evidence search rows.

The source-locator foreign key is set to null if a locator is removed. Evidence
and Story identity remain protected by the existing composite primary key and
foreign keys.

## Compatibility policy

- Legacy `evidence.story_id`, `source`, and `content` remain readable.
- The older Story-side relationship endpoint now enforces active Evidence and
  emits the same durable Evidence relationship events.
- Existing `EvidenceDeleted` events remain historical vocabulary. The endpoint is
  deprecated and cannot create new deletion events.
- Source-version creation remains controlled by capture workflows. Pass 2C exposes
  governed reads but does not enable arbitrary source replacement.

## Verification

- OpenAPI 3.1 validation and Orval React/Zod regeneration passed.
- Repository TypeScript validation passed.
- 27 Vitest assertions passed across SQLite migration, API integration,
  recoverable filesystem ingestion, symlink containment, and UI capture utilities.
- Tests cover stale writes, archived read-only behavior, disabled deletion,
  source hydration, cross-Workspace link rejection, idempotent linking, durable
  link events, unlink, archive/restore, and lifecycle-aware search projection.

## Remaining boundary

Pass 2C does not create the Evidence detail route, expose locator authoring, add
source-version replacement, redesign preview delivery, or implement Evidence
Integrity. These remain Passes 3A and 3B.
