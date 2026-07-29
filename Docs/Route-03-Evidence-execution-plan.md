# Route 03 — Evidence: RDF v1 Dossier and Execution Plan

Status: **Accepted — implementation authorized by staged pass**

Owner: Evidence Domain / Platform Architecture

Last reviewed: 2026-07-29

## Scope

This dossier covers only **Route 03 — Evidence** from
`N-Tech-C³-product architecture-design.md`. It defines the domain, contracts,
managed-file workflow, events, Intelligence boundary, experience, migration, and
verification required to turn the current capture screen into the canonical
Evidence Vault.

It does not implement OCR, embeddings, AI classification, repository watchers,
cryptographic signatures, generalized graph visualization, Knowledge claims, or
Publishing. Those capabilities may consume the contracts established here.

## Route Discovery Framework dossier

### Route DNA

| Field               | Decision                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Route ID            | `evidence`                                                                                                              |
| Canonical routes    | `/evidence`, `/evidence/:evidenceId`                                                                                    |
| Domain owner        | Evidence                                                                                                                |
| Mission             | Preserve provenance-bearing engineering artifacts as verifiable, reusable Evidence.                                     |
| Primary patterns    | Library, explorer, detail inspector, quick capture                                                                      |
| Current maturity    | L3 Governed — accepted 2026-07-29                                                                                        |
| Target maturity     | L3 Governed after this plan is implemented and verified                                                                 |
| Authoritative facts | Identity, Workspace ownership, source versions, provenance, classification, metadata, archive state, and explicit links |
| Derived facts       | Search rank, backlinks, integrity result, link counts, previews, duplicate suggestions, and recommendations             |
| Required services   | Vault, database, durable events, search, jobs, relationships, and EIE execution                                         |

The route is justified because Evidence has its own identity, immutable source
material, provenance, integrity, lifecycle, relationships, indexing, and recovery
requirements. It cannot be absorbed into a Story editor or generic file browser.

### Inputs and outputs

Inputs include pasted text, imported files, terminal/build output, repository
observations, external references, meeting records, screenshots, benchmarks, and
derived analyses. A capture produces an Evidence aggregate, at least one immutable
source version, provenance, a durable event, and optional typed links.

Outputs include searchable Evidence records, verified source versions, typed
relationships, integrity findings, precise source locators, previews, and
provenance-bearing references that Knowledge, Stories, and Publications may use.

### Route boundaries

- The Evidence domain owns Evidence facts; the filesystem is mediated by the Vault
  service.
- Search owns its rebuildable index, not Evidence identity.
- Relationship services own link operations; backlinks and counts are projections.
- The EIE may verify integrity and recommend links, but cannot silently change
  provenance, classification, review state, or relationships.
- A UI route is an adapter and contains no authoritative lifecycle logic.

## Audit of the current implementation

### Existing capability to retain

- `/evidence` supports title search, type filtering, manual capture, paste capture,
  drag/drop and file input.
- Electron IPC imports files into the portable vault, records a SHA-256 checksum,
  previews supported media, and reveals managed files.
- The API supports Workspace/Story filters and uses SQLite transactions.
- Evidence capture and update append durable events; Activity is projected from
  those events.
- Story-to-Evidence many-to-many links and FTS5 indexing exist.
- The two-click capture goal is substantially met.

### Corrective work

1. File IPC copies directly to its final path before the API creates the Evidence
   record. A failed API call or process crash may leave an orphan file.
2. SHA-256 is embedded in free-form notes rather than structured source metadata.
3. The mutable `source` and `content` columns combine origin, locator, and payload.
4. `DELETE /evidence/:id` hard-deletes the record and emits `EvidenceDeleted`;
   normal product behavior must archive without destroying provenance or links.
5. New Evidence may be unassigned or use legacy `projectId`; canonical creation
   must require `workspaceId`.
6. A legacy singular `storyId` coexists with the canonical many-to-many
   `story_evidence` relation.
7. There is no source version, provenance record, review state, structured
   locator, ingest recovery state, integrity result, or detail route.
8. The renderer passes complete file bytes through IPC and previews read bounded
   files into data URLs. This is unsuitable for large-file streaming.
9. Current events describe CRUD, not the full capture, link, archive, restore, and
   verification lifecycle.
10. Existing browser coverage can import globally without preserving the intended
    Workspace context.

### Compatibility debt

- The physical SQLite column remains `project_id` during the compatibility window
  but is exposed canonically as `workspaceId`.
- Existing `evidence.source`, `content`, `notes`, and `story_id` remain readable
  until migration evidence proves the new source and link tables complete.
- Existing vault paths under `evidence/` remain valid managed paths.
- `EvidenceDeleted` remains historical event vocabulary only; no new normal-flow
  event uses it.

## Domain decisions

### Canonical definition

> Evidence is a provenance-bearing artifact that supports, challenges, or
> contextualizes a claim.

Evidence may be a factual record, observation, testimony, derived analysis, or
external reference. Classification must be explicit. This definition amends the
word “factual” in System Design Book Specification 01. The amendment is accepted
and recorded in
`System-Design-Book/decisions/ADR-001-evidence-domain-definition.md`.

### Ownership and identity

- New Evidence belongs to exactly one Workspace.
- A source payload has stable identity within an Evidence source version.
- Binary content is stored once and linked to many domain objects.
- Cross-Workspace links are rejected by default.
- Changing title, tags, notes, review state, or links does not change provenance.
- Replacing source content creates a new immutable source version; it never
  overwrites the old source.

### Independent state dimensions

Do not model `Indexed`, `Linked`, or `Referenced` as lifecycle states: each is a
rebuildable or relational fact and may occur concurrently.

| Dimension      | Values                                                                              |
| -------------- | ----------------------------------------------------------------------------------- |
| Lifecycle      | `CapturePending`, `Active`, `Archived`, `IngestFailed`                              |
| Classification | `FactualRecord`, `Observation`, `Testimony`, `DerivedAnalysis`, `ExternalReference` |
| Review         | `Unreviewed`, `Reviewed`, `Disputed`                                                |
| Integrity      | `Pending`, `Valid`, `Missing`, `Modified`, `Unverifiable`                           |

Only lifecycle, classification, and review are authoritative Evidence facts.
Integrity is a versioned EIE result. Search/index status and link/reference counts
are projections.

### Archive and deletion

- Archive is the normal removal action and is reversible.
- Archived Evidence and source versions are read-only until restored.
- Permanent deletion is excluded from the normal UI and public product workflow.
- A future maintenance purge requires explicit authorization, dependency checks,
  recoverable backup evidence, and a durable audit event.
- Source files are not removed merely because one relationship is removed.

## Source, provenance, and locator contracts

### Source kinds

`ManagedFile`, `InlineText`, `ExternalReference`, and `RepositorySnapshot` are the
initial source kinds. Each source version records:

- stable ID, Evidence ID, and positive version number;
- source kind, media type, original name, byte size, and capture time;
- vault-relative managed path where applicable;
- SHA-256 where bytes are controlled or available;
- origin URI or repository/revision metadata where applicable;
- capture method and producing tool/command metadata after secret redaction; and
- immutable creation metadata.

URLs, commands, logs, and events must not contain credentials or secrets.

### Source locators

A locator identifies a precise portion of one source version. Version 1 supports:

| Kind             | Required coordinates                                      |
| ---------------- | --------------------------------------------------------- |
| `WholeArtifact`  | None                                                      |
| `TextRange`      | Start/end line or character offsets                       |
| `Page`           | Positive page number; optional rectangle                  |
| `Timestamp`      | Start/end milliseconds                                    |
| `ImageRegion`    | Normalized `x`, `y`, `width`, `height`                    |
| `RepositoryPath` | Relative path and immutable revision; optional line range |
| `JsonPointer`    | RFC 6901 pointer                                          |

Locators are validated against source kind and bounds when those bounds are known.
Future claim citations reference `sourceVersionId + locator`; they do not point at
mutable titles or previews.

## Target data model

Append a new ordered SQLite migration; do not rewrite historical migrations.

### Extend `evidence`

- `workspace_id` compatibility mapping to physical `project_id`
- `classification TEXT NOT NULL`
- `lifecycle_status TEXT NOT NULL DEFAULT 'Active'`
- `review_status TEXT NOT NULL DEFAULT 'Unreviewed'`
- `version INTEGER NOT NULL DEFAULT 1`
- `archived_at TEXT`

Keep title, type, notes, tags, and timestamps as mutable metadata. Deprecate direct
mutation of `source`, `content`, and singular `story_id`.

### Add `evidence_sources`

Store `id`, `evidence_id`, `version`, `source_kind`, `media_type`,
`original_name`, `byte_size`, `sha256`, `vault_path`, `inline_content`,
`origin_uri`, `repository_id`, `repository_revision`, `capture_method`,
`producer_metadata`, `created_at`, and integrity constraints.

`(evidence_id, version)` is unique. Managed paths and checksums are indexed, but a
matching checksum does not automatically merge separate Evidence records.

### Add `evidence_ingests`

Store the recoverable workflow identity, Workspace, staged and final relative
paths, original metadata, size, checksum, state, retry count, error category,
Evidence/source IDs when allocated, and timestamps.

Allowed states are `Staged`, `MetadataCommitted`, `Promoted`, `Completed`,
`Compensating`, and `Failed`. State transitions are compare-and-set and
idempotent.

### Add `evidence_source_locators`

Store `id`, `source_id`, locator kind, validated JSON coordinates, label, and
timestamps. The serialized contract is versioned.

### Relationships

`story_evidence` remains the first canonical typed relationship and gains optional
role, relevance, notes, and locator ID. Later Knowledge and Publication citations
must reuse source-version and locator identity rather than add singular foreign
keys to Evidence.

## Recoverable capture workflow

Database and filesystem operations cannot share a native transaction. Managed-file
capture therefore uses a persisted saga:

1. Validate Workspace, file authorization, name, type, and configured size limit.
2. Stream the source into a managed staging path while calculating SHA-256.
3. Persist an `evidence_ingests` row with a non-guessable ingest token.
4. In one database transaction create `CapturePending` Evidence and its source
   metadata, transition the ingest to `MetadataCommitted`, and append
   `EvidenceCaptureRequested`.
5. Atomically promote the staged file to its final vault-relative path.
6. In one transaction activate Evidence, complete the ingest, and append
   `EvidenceCaptured`.
7. On failure, retain a visible retryable state, compensate safely, and append
   `EvidenceIngestFailed`. A restart worker reconciles incomplete ingests.

Inline and external-reference capture use the same domain command but skip file
promotion. The normal catalogue hides incomplete capture by default while exposing
a recovery view. Every command carries an idempotency key.

Large files must stream through the trusted Electron/Vault boundary rather than
materialize as renderer `ArrayBuffer` values. Preview remains bounded and derived.

## Canonical API

| Method            | Route                                   | Purpose                                                                                                                    |
| ----------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GET`             | `/evidence`                             | Cursor-paginated catalogue with Workspace, lifecycle, classification, review, integrity, type, tag, link, and text filters |
| `POST`            | `/evidence`                             | Create inline text or external-reference Evidence in a required Workspace                                                  |
| `POST`            | `/evidence/ingests`                     | Start or register a managed-file capture                                                                                   |
| `POST`            | `/evidence/ingests/{ingestId}/complete` | Idempotently coordinate metadata commit and promotion                                                                      |
| `GET`             | `/evidence/{evidenceId}`                | Return aggregate metadata and derived summaries                                                                            |
| `PATCH`           | `/evidence/{evidenceId}`                | Update mutable metadata with expected version                                                                              |
| `GET`             | `/evidence/{evidenceId}/sources`        | List immutable source versions                                                                                             |
| `POST`            | `/evidence/{evidenceId}/sources`        | Add a replacement source version through the capture workflow                                                              |
| `GET/POST`        | `/evidence/{evidenceId}/locators`       | List/create validated locators                                                                                             |
| `GET/POST/DELETE` | `/evidence/{evidenceId}/stories`        | Manage typed Story links                                                                                                   |
| `GET`             | `/evidence/{evidenceId}/integrity`      | Return the latest provenance-bearing integrity result                                                                      |
| `POST`            | `/evidence/{evidenceId}/verify`         | Queue a bounded integrity verification                                                                                     |
| `POST`            | `/evidence/{evidenceId}/archive`        | Archive without deleting sources or relationships                                                                          |
| `POST`            | `/evidence/{evidenceId}/restore`        | Restore archived Evidence                                                                                                  |
| `GET`             | `/evidence/{evidenceId}/timeline`       | Return relevant durable domain events                                                                                      |

Canonical requests use `workspaceId`; `projectId` and singular `storyId` are
deprecated compatibility fields. Existing CRUD remains for one compatibility
release, but `DELETE` is deprecated immediately.

## Durable events and projections

Initial version-1 events:

- `EvidenceCaptureRequested`
- `EvidenceCaptured`
- `EvidenceIngestFailed`
- `EvidenceMetadataUpdated`
- `EvidenceSourceVersionAdded`
- `EvidenceLinkedToStory`
- `EvidenceUnlinkedFromStory`
- `EvidenceReviewChanged`
- `EvidenceArchived`
- `EvidenceRestored`
- `EvidenceSourceVerified`

Domain state and event append commit atomically. Activity, FTS5 documents,
backlinks, link counts, and integrity summaries are idempotent projections with
checkpoints, quarantine, and replay support. Event payloads carry IDs and safe
metadata, never file bytes or secrets.

## Evidence Integrity capability

Implement deterministic `evidence-integrity@1.0.0` through the existing EIE
contract. It evaluates:

- source presence and managed-path containment;
- checksum match for managed bytes;
- provenance completeness;
- source/locator contract validity;
- required Workspace ownership; and
- broken authoritative references.

The result records algorithm version, source/input watermark, calculation time,
components, explanation, evidence references, invalidation rule, and one categorical
integrity state. It does not decide whether a claim is true and does not mutate
review state. Verification work is cancellable, bounded, and persisted as a job
when it cannot complete within an interaction request.

## Experience plan

### `/evidence`

Use one responsive explorer for global and Workspace-filtered reading. Creation
always requires a Workspace. The first release adds:

- search plus Workspace, type, classification, lifecycle, review, integrity, and
  linked/unlinked filters;
- list and gallery views using the same query contract;
- visible capture progress, failure recovery, checksum/integrity state, and source
  type;
- quick paste and drag/drop without exceeding the two-click capture goal; and
- archive instead of delete.

### `/evidence/:evidenceId`

The detail inspector shows immutable source versions, preview/reveal, provenance,
checksum and latest verification, metadata, typed links, locators, and timeline.
It clearly separates authoritative metadata from derived integrity and search
information. Archived records are read-only until restored.

Animated graphs, OCR editing, semantic similarity, AI conclusions, and bulk
repository ingestion are not part of the first Route 03 release.

## Legacy migration and recovery

1. Add new schema with nullable compatibility fields.
2. Backfill each existing row into source version 1:
   - file paths become `ManagedFile`;
   - `content` becomes `InlineText`;
   - URL-like source values become `ExternalReference`;
   - unclassifiable rows become `ExternalReference` with a migration warning.
3. Extract a checksum only from the exact legacy `SHA-256: <64 hex>` note pattern;
   otherwise set integrity to `Pending`/`Unverifiable` without inventing a hash.
4. Preserve notes verbatim and never discard the original source field during the
   compatibility window.
5. Report unassigned Evidence for user-directed Workspace assignment; do not
   silently choose a Workspace.
6. Reconcile singular `story_id` with `story_evidence` idempotently.
7. Scan managed paths for missing files and orphans and produce a recoverable
   migration report.

The migration must be idempotent in effect, backed up before destructive cleanup,
and able to run with existing vault paths unchanged.

## Staged execution

### Pass 2A — Contracts and schema

Status: **Implemented and verified 2026-07-29**

- Amend Specification 01 Evidence language and accept this dossier.
- Add source, ingest, locator, lifecycle, classification, version, and archive
  contracts through OpenAPI-first code generation.
- Append and test the compatibility migration and legacy audit report.
- Add feature flags for canonical capture and detail route rollout.

Execution evidence:

- ordered SQLite migration 6,
  `evidence_contracts_and_legacy_backfill`;
- generated OpenAPI React client and Zod contracts;
- `Docs/System-Design-Book/evidence/evidence-migration-audit-2026-07-29.md`;
- `pnpm audit:evidence-migration` for selected-Vault reporting; and
- migration, API compatibility, UI utility, typecheck, and build verification.

### Pass 2B — Vault capture foundation

Status: **Implemented and verified 2026-07-29**

- Implement streaming staging, SHA-256, atomic promotion, idempotent reconciliation,
  compensation, and restart recovery.
- Enforce path/symlink containment and bounded resource policy.
- Replace checksum-in-notes writes while retaining legacy reads.

Execution evidence:

- migration 7 persists recovery capture payloads and enables the rollout flag;
- Electron preload converts authorized `File` objects to trusted paths without
  renderer buffering;
- `electron/evidence-ingest.mjs` supplies bounded streaming, hashing, containment,
  atomic promotion, compensation, and restart-state inspection;
- the local API owns idempotent ingest, metadata, source, lifecycle, and durable
  event transitions; and
- `System-Design-Book/evidence/evidence-ingest-recovery-2026-07-29.md` records the
  failure-boundary matrix.

### Pass 2C — Domain API, events, and relationships

Status: **Implemented and verified 2026-07-29**

- Implement canonical commands, optimistic concurrency, archive/restore, link
  commands, events, and replay-safe projections.
- Disable normal-flow hard deletion and enforce archived-Workspace behavior.

Execution evidence:

- migration 8 adds typed Story relationship metadata and lifecycle-aware,
  rebuildable Evidence search triggers;
- metadata/archive/restore commands enforce aggregate versions and archived
  read-only behavior;
- immutable sources and typed Story relationships have canonical read/command
  endpoints;
- hard deletion is deprecated and disabled while durable Evidence lifecycle and
  relationship events project idempotently to Activity; and
- `System-Design-Book/evidence/evidence-governed-operations-2026-07-29.md`
  records compatibility decisions and verification.

### Pass 3A — Explorer and inspector

Status: **Implemented and verified 2026-07-29**

- Migrate quick capture to the recoverable workflow.
- Add catalogue filters, detail route, source/provenance panels, recovery feedback,
  locators, archive/restore, and accessibility states.

Execution evidence:

- `/evidence/:id` is the canonical inspector with provenance, sources, locators,
  relationships, recovery state, and governed lifecycle controls;
- catalogue filtering covers authoritative Evidence dimensions;
- canonical locator endpoints validate kind-specific coordinates and preserve
  archived read-only behavior;
- migration 9 enables source-version reads and the detail-route rollout; and
- `System-Design-Book/evidence/evidence-inspector-experience-2026-07-29.md`
  records experience verification.

### Pass 3B — Integrity and measured evidence

Status: **Implemented and verified 2026-07-29**

- Register `evidence-integrity@1.0.0`.
- Add verification jobs, invalidation, integrity projections, diagnostics, and
  repair guidance.
- Run the conformance and performance matrices and record results in the System
  Design Book evidence register.

Execution evidence:

- migration 10 adds persisted bounded verification jobs;
- `evidence-integrity@1.0.0` deterministically checks ownership, provenance,
  containment, source presence, SHA-256, locators, and references;
- results carry watermarks, components, explanations, evidence references, and
  repair guidance and are invalidated by authoritative mutations;
- the inspector exposes current/stale state and explicit verification; and
- `System-Design-Book/evidence/evidence-integrity-conformance-2026-07-29.md`
  records contract evidence and the 10,000-Evidence measured baseline.

### Pass 3C — Streaming and L3 closure

Status: **Implemented, verified, and accepted 2026-07-29**

- Deliver managed-file previews through bounded HTTP range streams.
- Measure 20 MiB and 100 MiB copy/hash workloads and process RSS.
- Exercise the React inspector through browser end-to-end tests and package the
  Electron application.
- Prove portable backup/restore conformance for active, archived, staged, and
  failed-ingest state.
- Retire legacy Evidence write/filter compatibility and record the final L3
  governance decision.

Execution evidence:

- `GET /evidence/{id}/sources/{sourceId}/content` validates source ownership and
  Vault containment, supports full and single-range responses, and never sends
  file bytes through renderer IPC or base64;
- generated clients no longer expose `projectId` or singular `storyId` as
  canonical Evidence input, Story filtering uses the relationship table, and
  every canonical create appends source version 1 transactionally;
- the Apple M1/8 GB baseline measures 20 MiB and 100 MiB streaming hash/copy
  workloads with bounded RSS growth;
- backup/restore round trips database and managed/staged bytes and rejects
  traversal and absolute archive entries;
- all three browser workflows, 31 repository tests, production build, typecheck,
  code generation, and unpacked Electron packaging pass; and
- `System-Design-Book/evidence/route-03-l3-governance-decision-2026-07-29.md`
  records the complete evidence and Accepted decision.

## Verification and conformance

### Tier 1 — Domain and contract

- Workspace-required creation and cross-Workspace link rejection.
- Immutable source versions and optimistic metadata version conflicts.
- Legal lifecycle, archive, restore, and read-only behavior.
- Locator validation and provenance retention.
- OpenAPI, generated-client, and migration compatibility tests.

### Tier 2 — Platform integration

- Transactional domain event append and idempotent replay.
- Failure injection before/after staging, metadata commit, promotion, and final
  activation.
- Restart reconciliation, orphan detection, and safe compensation.
- Path traversal, symlink escape, case collision, size limits, secret-redaction,
  duplicate checksum, missing file, and modified file tests.
- Backup/restore with active, staged, archived, and failed ingests.

### Tier 3 — Experience and performance

- Two-click paste and file capture in a selected Workspace.
- Keyboard, focus, screen-reader, error, empty, loading, and recovery states.
- End-to-end import, preview/reveal, link/unlink, archive/restore, and restart.
- Named workloads at 10,000 Evidence records and 1 MiB, 20 MiB, and configured
  maximum-size files: catalogue query, FTS5 search, detail load, stream/copy/hash,
  verification, memory high-water mark, and crash recovery.
- Electron launch and React route-render measurements on named baseline and
  lower-tier supported hardware.

The named Apple M1/8 GB measurements are the accepted Route 03 baseline, not
universal performance promises. Signing, notarization, and certification on
additional hardware remain product-release operations.

## Exit criteria

Route 03 reaches L3 Governed only when:

- the dossier and required constitutional amendment are Accepted;
- all new Evidence is Workspace-owned and source-versioned;
- managed-file capture is recoverable across every injected failure boundary;
- archive replaces normal deletion;
- provenance, locators, integrity, events, and projection replay are executable;
- legacy migration produces no silent data loss;
- Tier 1–3 evidence is recorded; and
- the Source of Truth and README accurately distinguish implemented capability
  from future work.

## Approval gate

This dossier completed TNB3 Pass 1 and was accepted with ADR-001 on 2026-07-29.
Passes 2A–3C are implemented and verified. The final Pass 3C decision accepts
Route 03 at L3 Governed; further Evidence work requires a new change-controlled
pass or corrective-work record.
