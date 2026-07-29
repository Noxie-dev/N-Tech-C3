# Evidence Explorer and Inspector Verification

Status: **Implemented and verified**

Date: 2026-07-29

Scope: Route 03 Pass 3A

## Delivered experience

- `/evidence` filters by Workspace, type, classification, review state, lifecycle, and title.
- `/evidence/:id` is the canonical Evidence inspector.
- The inspector presents authoritative state, artifact content, structured source
  versions, checksum and provenance, precise locators, Story relationships, and timestamps.
- Incomplete ingest state and error category are visible when recovery is pending.
- Archive/restore is available from the inspector. Archived records announce their
  read-only state and suppress locator and relationship mutations.
- Story backlinks navigate to the Story and managed files use the isolated reveal bridge.

Quick Capture continues to use the canonical Workspace-owned inline Evidence
contract because it has no filesystem failure boundary. File capture remains on
the Evidence explorer and already uses the recoverable staged-ingest workflow.

## Locator contracts

Canonical locator endpoints support Whole Artifact, Text Range, Page, Timestamp,
Image Region, Repository Path, and JSON Pointer coordinates. The API validates
each kind, confirms source ownership, rejects archived Evidence, and appends
durable locator events atomically.

Migration 9, `evidence_inspector_rollout`, makes locator identity unique per source,
kind, and coordinates, and enables the `evidence.source-versions` and
`evidence.detail-route` rollout flags.

## Verification

- OpenAPI validation and generated React/Zod clients passed.
- Repository TypeScript validation and production builds passed.
- All 28 Vitest assertions passed.
- Integration coverage includes locator validation, ownership, listing, archived
  read-only behavior, removal, and rollout flags.

Pass 3A does not implement streamed media previews, source-version replacement,
deterministic Evidence Integrity, or final performance/conformance workloads.
