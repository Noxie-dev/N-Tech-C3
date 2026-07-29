# Route 03 L3 Governance Decision

Status: **Accepted — L3 Governed**

Date: 2026-07-29

Route: 03 — Evidence

## Decision

Route 03 satisfies its accepted domain, contract, recovery, integrity,
experience, and conformance gates and is designated **L3 Governed**. Evidence is
Workspace-owned, source-versioned, provenance-bearing, recoverably ingested,
reversibly archived, deterministically verifiable, and exposed through governed
catalogue and inspector experiences.

This decision governs the Route 03 architecture on the declared Apple M1/8 GB
support baseline. It is change-controlled rather than permanently frozen.
Signing, notarization, and certification on additional hardware are release
operations and do not reopen the Evidence domain decision.

## Streamed preview conformance

`GET /evidence/{id}/sources/{sourceId}/content` is the canonical managed-content
delivery boundary. It verifies that the source belongs to the requested Evidence,
accepts only `ManagedFile` sources, resolves the path inside the Vault, and emits
private, non-cached binary responses.

Full responses return `200`; valid single-byte ranges return `206` with
`Accept-Ranges` and `Content-Range`; unsatisfiable ranges return `416`. Images,
PDFs, video, and audio use native browser consumers. File bytes are no longer
buffered into renderer IPC or encoded as data URLs.

## Compatibility retirement

- Canonical Evidence create/update input no longer accepts legacy `projectId` or
  singular `storyId`.
- Evidence Story filtering reads the `story_evidence` relationship table.
- Every canonical create writes immutable source version 1 in the same
  transaction, including inline text and external references.
- Generated React and Zod contracts reflect the canonical API.
- Physical legacy columns remain read-compatible for upgraded Vaults. Their later
  destructive removal requires a separately approved migration after an observed
  compatibility window; they are not canonical write authority.

## Performance evidence

Environment: Apple M1, 8 logical cores, 8 GB RAM, Darwin 25.5.0, Node 24.18.0.

Fixture: 50 Workspaces, 10,000 Stories, 10,000 Evidence records. Database
operations use 100 measured iterations; attachment workloads use bounded 1 MiB
stream chunks.

| Workload | Median | p95 | RSS growth |
| --- | ---: | ---: | ---: |
| Cold database initialization | 26.518 ms | — | — |
| Evidence save | 0.211 ms | 0.327 ms | — |
| FTS search | 0.051 ms | 0.058 ms | — |
| Evidence catalogue | 0.062 ms | 0.068 ms | — |
| Evidence detail query set | 0.048 ms | 0.063 ms | — |
| 1 MiB copy | 2.206 ms | 4.456 ms | — |
| 1 MiB SHA-256 | 0.943 ms | 1.146 ms | — |
| 1 MiB Integrity hash | 0.893 ms | 0.962 ms | — |
| 20 MiB SHA-256 | 15.084 ms | 18.971 ms | -4.66 MiB |
| 20 MiB copy | 58.253 ms | 79.149 ms | — |
| 100 MiB SHA-256 | 73.817 ms | 75.924 ms | 0.88 MiB |
| 100 MiB copy | 312.282 ms | 312.282 ms | — |

Negative RSS delta is ordinary garbage-collection noise between samples. The
important result is that RSS does not scale with file size, consistent with
bounded streaming. These results are evidence on named hardware, not universal
latency promises.

## Experience and packaging evidence

Three browser end-to-end workflows pass. The Evidence inspector workflow creates
canonical Workspace-owned Evidence, navigates to `/evidence/:id`, verifies
provenance and source presentation, invokes Integrity, and observes the expected
`Unverifiable` result and algorithm identity. It completes in 1.2 seconds within
the five-second local evidence budget.

The production React build and repository typecheck pass. Electron Builder
26.15.3 packages Electron 38.8.6 for macOS arm64 as an unpacked application.
This proves the implemented React/Electron integration and packaging surface;
signed distribution launch measurements remain release certification evidence.

## Backup and restore conformance

The portable archive round-trip test restores the database plus active, archived,
and staged Evidence bytes. The fixture database also preserves failed-ingest
metadata. Archive inspection rejects traversal and absolute paths before
extraction. Restore retains the existing recovery-copy and rollback behavior.

## Verification register

- OpenAPI generation: passed.
- Repository tests: 5 files, 31 assertions passed.
- Browser end-to-end: 3 workflows passed.
- Production build and TypeScript checks: passed.
- Electron unpacked packaging: passed.
- 10,000-Evidence and 20/100 MiB benchmark: passed.
- Markdown whitespace validation: passed at decision commit.

## Residual controlled work

The following items do not block Route 03 L3:

- signed/notarized distribution and cold-launch certification;
- additional supported-hardware baselines when that support matrix is declared;
- destructive removal of dormant legacy database columns after the compatibility
  observation window; and
- future multi-range delivery, source replacement, thumbnails, OCR, and semantic
  enrichment, each requiring its own approved scope.
