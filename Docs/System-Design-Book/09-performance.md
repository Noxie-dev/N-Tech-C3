# Specification 09 — Performance

Status: **Accepted**
Owner: Performance Engineering
Last reviewed: 2026-07-30

## Purpose

Treat performance as measured product behavior with named workloads, hardware,
percentiles, and regression evidence.

## Measurement rules

- Every result names hardware, OS, runtime, application revision, dataset, operation,
  iteration count, and warm/cold state.
- Median and p95 are minimum reported percentiles for repeated interaction work.
- One machine does not establish a universal budget.
- Database primitives, service workflows, UI rendering, Electron launch, file
  operations, and external delivery are measured separately.
- Benchmarks use disposable Vaults and MUST NOT mutate user data.
- Proposed targets become accepted budgets only after representative measurements
  on baseline and lower-tier supported hardware.

## Workload classes

| Class        | Representative operations                                                 |
| ------------ | ------------------------------------------------------------------------- |
| Startup      | Database open/migrations, API ready, Electron interactive                 |
| Interaction  | Route navigation, list render, editor open, Inspector response            |
| Persistence  | Save, event append, projection, version checkpoint                        |
| Search       | FTS5 query and result render                                              |
| Workspace    | Overview, metrics, Health, recent work                                    |
| Intelligence | Deterministic capability execution and cache hit                          |
| Filesystem   | Copy, hash, preview, export, backup, restore                              |
| Publication  | Catalogue, detail, draft save, validation, and rendition preview          |
| Delivery     | Pipeline/Calendar projections, schedule commands, durable job checkpoints |
| Scale        | Large Vault startup, search, graph traversal, integrity scan              |

## Initial proposed budgets

These are review thresholds, not yet universal release guarantees:

| Operation                                 | Proposed p95 |
| ----------------------------------------- | -----------: |
| Warm local API read                       |       100 ms |
| Simple local save                         |       150 ms |
| FTS5 query                                |       100 ms |
| Workspace overview service work           |       200 ms |
| Deterministic Health calculation          |       100 ms |
| Primary route usable after navigation     |       500 ms |
| Application interactive after cold launch |     3,000 ms |

Route 06 adds the following proposed local-service thresholds:

| Operation                                            | Proposed p95 |
| ---------------------------------------------------- | -----------: |
| Publication catalogue query                          |       100 ms |
| Publication detail with version and relationships    |       150 ms |
| Publication draft save, checkpoint, and event append |       150 ms |
| Deterministic Publication validation                 |       200 ms |
| Pipeline or Calendar projection query                |       200 ms |
| Schedule or reschedule command                       |       150 ms |
| Durable delivery-job claim or checkpoint             |       100 ms |
| Small local Rendition preview first result           |       500 ms |

Budgets exclude explicitly asynchronous large-file and external-network work.
Exceeding a threshold requires investigation, not benchmark manipulation.

Provider latency, queue wait, adapter work, local service work, and projection lag
MUST be reported separately. No universal provider-network latency target is
accepted. Large Renditions MUST use an asynchronous, bounded workflow rather than
holding a request or renderer open.

## UI and background work

- Long work MUST expose progress, cancellation, and a non-blocking UI.
- Route-level code splitting is preserved where it materially improves startup.
- Lists and graphs use bounded queries and virtualization when measurements justify
  it.
- Main/renderer threads MUST NOT perform unbounded hashing, traversal, archive, or
  repository analysis.
- Cache behavior records invalidation and must not return stale authoritative data.

## Regression policy

- Performance-sensitive changes include before/after evidence.
- A material regression is documented and either corrected or accepted through an
  explicit tradeoff.
- Dataset reduction, warm-cache substitution, or omitted percentiles cannot be used
  to hide regressions.
- Benchmark scripts and fixtures are version-controlled.

## Resource policy

Jobs declare memory, CPU, I/O, concurrency, and cancellation constraints.
Repository scans, backups, restores, indexing, Intelligence, and future
Publication deployments MUST avoid unbounded parallelism.

Future Publication benchmarks MUST include, at minimum, fixtures representing:

- 10,000 Publications with multiple immutable versions and relationships;
- 50,000 Deployments distributed across timezones and lifecycle states;
- concurrent draft saves, validation, projection reads, and durable job claims;
- small and large Rendition generation with peak-memory and staging-space
  measurements; and
- restart reconciliation with queued, leased, unknown-outcome, and failed jobs.

Benchmark reports MUST name worker concurrency, queue depth, file-size
distribution, connection count, and whether caches and projections are warm.

## Current evidence

`evidence/performance-baseline-2026-07-29.md` records the first Apple M1 database
and service baseline. It is accepted as evidence, not as a cross-hardware budget.

## Acceptance evidence

- Reproducible benchmark command.
- Named baseline and lower-tier hardware.
- Representative small and large Vault fixtures.
- UI navigation and cold Electron-launch measurements.
- File copy/hash and backup/restore measurements.
- Regression report for performance-sensitive releases.

## Open decisions

- Minimum supported hardware profile.
- Representative Vault-size tiers.
- Cold Electron interactive measurement harness.
- UI responsiveness and memory budgets.

## Amendment history

- 2026-07-30: Added proposed Route 06 Publication, projection, scheduling, job,
  and Rendition workloads and required delivery/resource reporting under
  ADR-002.
- 2026-07-29: Initial performance constitution accepted; numerical thresholds
  remain proposed pending broader evidence.
