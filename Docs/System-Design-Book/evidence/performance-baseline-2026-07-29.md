# Platform Performance Baseline — 2026-07-29

Status: Accepted baseline evidence
Measurement script: `scripts/src/benchmark-platform.ts`

## Environment

- Hardware: Apple M1, 8 logical cores, 8 GB RAM
- Operating system: macOS / Darwin 25.5.0
- Runtime: Node.js v24.18.0
- Fixture: 10 Workspaces, 1,000 Stories, 100 measured iterations
- Storage: disposable local SQLite vault in WAL mode

## Results

| Operation | Median | p95 |
| --- | ---: | ---: |
| Cold database initialization and migrations | 21.875 ms | Not sampled |
| Transactional Evidence save | 0.142 ms | 0.241 ms |
| FTS5 search, 20-result limit | 0.045 ms | 0.059 ms |
| Workspace core load query set | 0.098 ms | 0.114 ms |
| Deterministic analysis and provenance save | 0.107 ms | 0.150 ms |

## Interpretation and limits

This is the first reproducible engineering baseline, not a release service-level
objective. It measures database and service primitives, excludes React rendering,
Electron launch time, filesystem attachment copying, and a production-scale vault,
and does not represent slower supported hardware. The numbers establish a reference
point from which proposed budgets can be accepted or amended with evidence.

Re-run with:

```bash
pnpm run benchmark:platform
```
