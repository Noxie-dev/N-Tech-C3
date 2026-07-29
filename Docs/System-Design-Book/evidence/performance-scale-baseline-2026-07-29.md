# Platform Scale and Filesystem Baseline — 2026-07-29

Status: **Accepted baseline evidence**
Measurement script: `scripts/src/benchmark-platform.ts`

## Environment

- Hardware: Apple M1, 8 logical cores, 8 GB RAM
- Operating system: macOS / Darwin 25.5.0
- Runtime: Node.js v24.18.0
- Fixture: 50 Workspaces, 10,000 Stories
- Attachment fixture: 1 MiB
- Repeated database operations: 100 iterations
- Repeated attachment operations: 50 iterations
- Storage: disposable local SQLite/filesystem Vault

## Results

| Operation | Median | p95 |
| --- | ---: | ---: |
| Cold database initialization and migrations | 32.826 ms | Not sampled |
| Transactional Evidence save | 0.159 ms | 0.276 ms |
| FTS5 search, 20-result limit | 0.052 ms | 0.061 ms |
| Workspace core load query set | 0.142 ms | 0.184 ms |
| Deterministic analysis and provenance save | 0.110 ms | 0.163 ms |
| 1 MiB attachment copy | 1.954 ms | 3.436 ms |
| 1 MiB SHA-256 calculation | 0.915 ms | 1.073 ms |
| Large-fixture FTS5 search, 50-result limit | 0.082 ms | 0.097 ms |

## Interpretation

The larger fixture shows no material regression in the measured SQLite primitives,
and the 1 MiB local attachment copy/hash operations are well below interactive
thresholds on the named hardware. This evidence supports continued use of SQLite
FTS5 and SHA-256-managed Evidence for the current scale.

It does not establish Electron cold-start, React route-render, large-file streaming,
backup/restore, graph, memory, slower-hardware, or external Channel budgets. Those
remain required before L5 operational maturity and before affected subsystems may
claim production readiness.

## Reproduction

```bash
pnpm run benchmark:platform
```

Fixture size can be adjusted with:

```text
NTC3_BENCHMARK_WORKSPACES
NTC3_BENCHMARK_STORIES_PER_WORKSPACE
```
