# Evidence Integrity and Conformance Report

Status: **Implemented and verified**

Date: 2026-07-29

Capability: `evidence-integrity@1.0.0`

## Deterministic contract

Evidence Integrity evaluates source presence, Vault containment, managed-byte
SHA-256, provenance completeness, Workspace ownership, and authoritative source
references. It returns exactly one of `Pending`, `Valid`, `Missing`, `Modified`,
or `Unverifiable`.

The result records capability/version, a SHA-256 input watermark, calculation
time, component outcomes, explanation, evidence references, and repair guidance.
It does not judge whether a claim is true and does not change Evidence review
state.

Verification streams managed bytes in 1 MiB chunks. A persisted job moves through
Queued, Running, and Completed or Failed. A second active verification is rejected.
Metadata, lifecycle, and locator mutations invalidate the current derived result;
the inspector distinguishes a missing/stale result from an authoritative fact.

## Conformance evidence

- Workspace-required creation, source ownership, cross-Workspace relationship
  rejection, optimistic concurrency, archive/restore, and archived read-only
  behavior are covered by API integration tests.
- Managed bytes are verified as Valid, then detected as Modified and Missing.
- Inline sources without a trusted checksum are classified Unverifiable rather
  than receiving an invented hash.
- Locator shape validation, immutable source reads, idempotent ingest, crash
  boundaries, compensation, search projection, and durable event projection are
  covered by the repository test suite.

## Measured baseline

Hardware: Apple M1, 8 logical cores, 8 GB RAM, macOS Darwin 25.5.0, Node 24.18.0.

Fixture: 50 Workspaces, 10,000 Stories, 10,000 Evidence records, 1 MiB managed
attachment, 100 timed database iterations and 50 attachment iterations.

| Workload | Median | p95 |
| --- | ---: | ---: |
| Cold database initialization | 32.294 ms | — |
| Evidence save | 0.217 ms | 0.551 ms |
| FTS search | 0.054 ms | 0.059 ms |
| Evidence catalogue query | 0.061 ms | 0.068 ms |
| Evidence detail query set | 0.046 ms | 0.056 ms |
| Deterministic analysis persistence | 0.106 ms | 0.147 ms |
| 1 MiB attachment copy | 2.309 ms | 4.169 ms |
| 1 MiB attachment SHA-256 | 0.907 ms | 1.037 ms |
| 1 MiB Evidence Integrity hash | 0.891 ms | 1.025 ms |

These are measured baselines on named hardware, not universal guarantees.
Electron cold launch, React route-render, 20 MiB/100 MiB files, memory high-water
mark, lower-tier hardware, and full backup/restore remain release-closure evidence.

## Decision

The deterministic Integrity capability and Tier 1–2 contract evidence are
accepted. Route 03 is functionally governed, but final L3 closure remains
conditional on the Pass 3C experience/performance evidence listed above and
compatibility retirement evidence.
