# Route 03 Pass 2B — Recoverable Evidence Ingest Evidence

Status: **Accepted implementation evidence**

Date: 2026-07-29

## Implemented protocol

Managed-file capture is a persisted saga:

```text
Reserve idempotent ingest
  → stream + hash into evidence/.staging
  → record structured size/checksum/final path
  → commit CapturePending Evidence + source + requested event
  → atomically rename staged file
  → activate Evidence + complete ingest + captured event
```

The renderer no longer reads each file into an `ArrayBuffer`. Electron preload uses
the trusted `webUtils.getPathForFile` boundary, and Electron main streams from that
authorized path with a bounded size policy. Absolute source paths do not enter the
HTTP contract, domain events, Evidence metadata, or renderer state.

## Persistence and provenance

Migration 7 adds the persisted capture payload required to resume after a process
restart and enables `evidence.recoverable-ingest`.

Every successful managed capture stores:

- Workspace and ingest identity;
- idempotency key;
- original filename and media type;
- byte size and SHA-256;
- staged and final Vault-relative paths;
- immutable source version 1;
- `DesktopFileImport` capture method;
- producer metadata containing safe ingest identity;
- `EvidenceCaptureRequested` before promotion; and
- `EvidenceCaptured` after promotion and activation.

No checksum is written into free-form notes by the new desktop path.

## Failure-boundary matrix

| Boundary | Injected/verified result |
| --- | --- |
| Before stream | No managed write; reserved ingest can be failed/reconciled |
| During stream | Partial staging file removed |
| After stream, before metadata acknowledgement | Staged file is compensatable; ingest failure remains auditable |
| Metadata transaction | Invalid relationship rolls back Evidence, source, event, and ingest transition atomically |
| Before atomic rename | Staged file remains available for restart retry |
| After rename, before API acknowledgement | Final file exists; restart reconciliation finalizes idempotently |
| Duplicate reservation | Same request/key returns the existing ingest |
| Reused key with different request | Rejected with conflict |
| Duplicate metadata completion | Returns the same Evidence/source |
| Duplicate finalization | Returns the same completed ingest without duplicate terminal events |
| Missing file during restart | Evidence becomes visibly `IngestFailed`; no success is invented |

## Restart reconciliation

Electron invokes reconciliation after the local API becomes healthy:

- `Staged` with complete checksum metadata and a staged file resumes metadata
  commit, promotion, and finalization.
- interrupted incomplete staging is compensated and recorded failed.
- `MetadataCommitted` with a staged file retries atomic promotion.
- `MetadataCommitted` with a final file completes activation.
- missing staged/final bytes produce an explicit failure record and
  `EvidenceIngestFailed` where Evidence metadata already exists.

Reconciliation is idempotent and failures are isolated per ingest.

## Verification

- Filesystem tests use real temporary files and deterministic failures before and
  during streaming and before and after promotion.
- API integration tests verify reservation, conflict, staging metadata, atomic
  metadata commit, source provenance, restart visibility, finalization, terminal
  event uniqueness, compensation, and transaction rollback.
- Migration tests verify recovery payload persistence and rollout activation.
- Repository typecheck and production builds cover API, renderer, scripts, and
  generated OpenAPI/Zod clients.
- All 25 Vitest assertions pass across migration, API integration, filesystem
  ingestion, symlink containment, and capture utility suites.

## Remaining limitations

- The configured file ceiling remains 100 MiB; larger-file workloads require
  measured product policy before increasing it.
- Inline preview remains separately bounded at 20 MiB and still materializes a data
  URL; preview streaming is not part of Pass 2B.
- Pass 2C must add governed source read endpoints, archive/restore, optimistic
  Evidence metadata updates, typed relationship commands, and projection
  diagnostics.
- End-to-end packaged Electron crash tests remain part of the later Tier 3 release
  gate even though filesystem and API crash boundaries are executable in this
  pass.
