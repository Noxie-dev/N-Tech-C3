# N-Tech C³

N-Tech C³ is a local-first **Engineering Intelligence Operating System** for
capturing engineering reality, organizing it into durable knowledge, and producing
evidence-backed stories and outputs.

The current alpha runs as an Electron desktop application. Data stays in a local
SQLite database and portable filesystem vault; the UI communicates with a
loopback-only Express API through generated OpenAPI clients.

## What is implemented

- **Workspaces (Route 01):** picker, search and filters, create, overview, settings,
  initial Workspace DNA, scoped metrics and activity, explainable health score,
  favorite/pin, metadata duplicate, archive/restore, integrity check, and JSON
  manifest export.
- **Stories (Route 02):** global and Workspace-scoped catalogues, lifecycle-aware
  Story studio, ordered outlines, TipTap HTML authoring, many-to-many links,
  independently tracked Outputs, deterministic health, timeline/version
  checkpoints, optimistic concurrency, and archive/restore.
- **Evidence Vault:** structured/manual capture, two-click quick capture, desktop
  file ingestion, SHA-256 recording, previews, repository audits, and linking.
- **Knowledge:** searchable pages with TipTap authoring and stored page links.
- **Campaigns, Assets, and Templates:** core CRUD/catalog workflows.
- **Global Search:** trigger-maintained SQLite FTS5 index across the core domains.
- **Desktop operations:** portable vault, backup/restore, safe file reveal,
  repository analysis, and Electron packaging.

The canonical product status and implementation gaps are maintained in
[`N-TC3_index.md`](N-TC3_index.md). Product documents are strategic unless the index
and executable code mark them as implemented.

## Route map

| Route | Purpose |
| --- | --- |
| `/dashboard` | Cross-workspace home, activity, metrics, and launch actions |
| `/workspaces` | Canonical Workspace picker and management |
| `/workspaces/:id` | Workspace-scoped overview and health |
| `/workspaces/:id/settings` | Workspace identity and DNA settings |
| `/stories` | Global Story catalogue |
| `/workspaces/:workspaceId/stories` | Workspace-scoped Story catalogue |
| `/stories/:id` | Story studio, graph, Outputs, health, and timeline |
| `/evidence` | Evidence capture and vault |
| `/knowledge`, `/knowledge/:id` | Knowledge catalogue and authoring |
| `/campaigns`, `/campaigns/:id` | Campaign catalogue and detail |
| `/assets` | Asset catalogue |
| `/templates` | Template catalogue |
| `/search` | Global full-text search |
| `/settings` | Desktop vault and application operations |

Old `/projects` browser links redirect to Workspaces. The physical `projects` SQLite
table and deprecated `/api/projects` endpoints remain temporarily for backward
compatibility with existing vaults.

## Architecture

```text
Experience
Dashboard, Workspaces, Stories, Evidence, Knowledge, Campaigns, Pipeline
                              ↓
Business Domains
Own authoritative facts, invariants, relationships, and lifecycles
                              ↓
Engineering Intelligence Engine
Produces versioned, explainable, reproducible derived insight
                              ↓
Platform Services
Events, jobs, search, storage, exports, plugins, settings
                              ↓
Platform Core
Electron, React, Express, SQLite, filesystem vault, IPC, FTS5
```

The governing ownership rule is:

> Domains own truth; Intelligence derives insight.

Routes and UI components are adapters. They do not own business rules. Intelligence
capabilities may analyze, score, suggest relationships, and recommend actions, but
may not silently redefine authoritative domain facts.

| Area | Technology |
| --- | --- |
| Workspace | pnpm workspaces |
| Language | TypeScript 5.9 |
| UI | React 19, Tailwind CSS 4, Radix, Lucide, TipTap |
| Routing/data | Wouter, TanStack Query |
| API | Express 5 |
| Contract/codegen | OpenAPI 3.1, Orval, generated Zod |
| Persistence | Node built-in SQLite driver in WAL mode |
| Desktop | Electron with isolated preload IPC |
| Tests | Vitest, Supertest, Playwright |

## Engineering Constitution

N-Tech C³ is governed as a platform rather than a collection of features.
[`N-TC3_index.md`](N-TC3_index.md) is the repository-level authority. Detailed
normative specifications belong in the version-controlled System Design Book.

The twelve constitutional specifications are:

1. Domain Model
2. Data Architecture
3. Filesystem
4. Design System
5. Component Library
6. Platform Services
7. Plugin SDK
8. Event Architecture
9. Performance
10. Engineering Standards
11. Engineering Principles
12. Engineering Intelligence Engine

Rules are either `Proposed` or `Accepted`. Accepted architecture is
change-controlled, not permanently frozen. Evidence may justify an amendment, but
silent architectural drift is prohibited.

### Engineering principles

- Evidence Before Opinion
- Local First
- Files Belong to the User
- Composition Over Configuration
- One Source of Truth
- Everything Is Linkable
- Design for Evolution
- Automation Earns Its Place
- Performance Is a Feature
- Quality Before Quantity

### Manifesto

Software projects generate more than code. They generate decisions, evidence,
knowledge, and stories worth sharing. N-Tech C³ exists to preserve that engineering
memory with integrity, connect it with context, and transform it into reusable
knowledge and meaningful communication.

> Build once. Learn forever. Share with confidence.

## Engineering Intelligence Engine

N-Tech C³ has one Engineering Intelligence Engine (EIE) with modular capabilities:

- Capture Intelligence
- Repository Intelligence
- Relationship Intelligence
- Evidence Intelligence
- Knowledge Intelligence
- Story Intelligence
- Campaign Intelligence
- Publishing Intelligence
- Workspace Intelligence
- Vault Intelligence
- Health Intelligence
- Recommendation Intelligence

Capabilities register against shared, versioned contracts. Every derived fact,
score, relationship suggestion, and recommendation must record its capability and
algorithm version, input watermark, calculation time, components, explanation,
evidence references, confidence where applicable, and invalidation rule.

The implementation policy is deterministic first:

- FTS5/BM25 before semantic search
- Explicit typed edges before advanced graph ranking
- SHA-256 blob identity before a Merkle DAG
- Rule-based recommendations before AI recommendations
- TF-IDF before embeddings
- Measured evidence before PageRank, HITS, Louvain, Bloom filters, or vector indexes

Activity is a user-facing projection, not an event source of truth. The platform
definition requires a durable typed event log or transactional outbox, atomic event
append with domain writes, idempotent consumers, and replay checkpoints.

Health Intelligence owns common calculation execution, provenance, caching, and
explanation contracts. Each business domain continues to own the meaning and
invariants of its health score.

The Plugin SDK contract is designed before plugin implementation. Its runtime is
deferred until two genuine integrations demonstrate the required extension points.

## Platform-definition execution

Three foundational passes are complete:

1. `Docs/System-Design-Book/` now holds accepted Domain Model, Data Architecture,
   Event Architecture, Engineering Standards, Engineering Principles, and
   Engineering Intelligence Engine specifications.
2. Route 01 and Route 02 were audited against their invariants. The evidence report
   records 13 conformant items, 7 corrective items, 5 migration items, and 4
   accepted compatibility debts.
3. Migration 5 introduces durable typed events, consumer checkpoints, projection
   quarantine, and versioned Intelligence results. Workspace creation atomically
   appends `WorkspaceCreated`; the Activity projection is replay-safe; Workspace
   Health runs as the first deterministic, provenance-bearing EIE capability.

The first reproducible benchmark covers cold database initialization, save, FTS5
search, Workspace load, and deterministic capability execution. See
[`performance-baseline-2026-07-29.md`](Docs/System-Design-Book/evidence/performance-baseline-2026-07-29.md).
Figures are baseline evidence, not yet accepted release budgets.

The default desktop vault is `Documents/N-TechC3-Vault` and contains:

```text
database/  stories/  campaigns/  knowledge/  evidence/  assets/
exports/   drafts/   templates/  backups/    logs/      settings/
```

## Repository structure

```text
artifacts/
  ntech-c3/          React UI plus Electron main/preload
  api-server/        Express API and domain services
  mockup-sandbox/    Isolated visual sandbox, not the production app
lib/
  api-spec/          Canonical OpenAPI contract and Orval configuration
  api-client-react/  Generated React Query client
  api-zod/           Generated request/response schemas
  db/                SQLite access and ordered transactional migrations
Docs/                Product architecture, UI/UX specification, and plans
  System-Design-Book/ Constitutional specifications (platform-definition phase)
e2e/                 Browser workflows
N-TC3_index.md       Repository source of truth
```

## Prerequisites

- Node.js 24 or another runtime that supports the repository's `node:sqlite` usage
- pnpm
- macOS for the current Electron packaging targets

Install dependencies:

```bash
pnpm install
```

The workspace enforces a minimum npm package release age as a supply-chain control.
Do not disable it.

## Run the desktop application

```bash
pnpm desktop
```

This builds the libraries, API, and frontend, starts the local API, then opens
Electron.

## Browser development

Run the API and frontend in separate terminals:

```bash
PORT=8080 NTC3_VAULT_PATH=./vault pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/ntech-c3 run dev
```

The Vite configuration proxies `/api` to the configured API port. Use a disposable
`NTC3_VAULT_PATH` when testing migrations or destructive workflows.

### Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API or Vite port | Required for standalone development |
| `BASE_PATH` | Frontend deployment base | `/` |
| `NTC3_VAULT_PATH` | Override local vault root | Desktop Documents vault |

## Verify the repository

```bash
pnpm run typecheck
pnpm test
pnpm run build
pnpm run test:e2e
pnpm run benchmark:platform
```

Playwright requires Chromium once:

```bash
pnpm exec playwright install chromium
```

## OpenAPI workflow

The project is contract-first:

1. Edit `lib/api-spec/openapi.yaml`.
2. Regenerate clients and validators.
3. Implement the API route.
4. Update migrations/domain services.
5. Run typecheck, tests, and builds.

```bash
pnpm --filter @workspace/api-spec run codegen
```

Do not hand-edit files under:

- `lib/api-client-react/src/generated/`
- `lib/api-zod/src/generated/`

## Database migrations

Migrations are ordered, transactional, and recorded in `schema_migrations`.

- Never edit an applied migration.
- Append a new numbered migration.
- Verify both a fresh vault and an upgrade containing existing records.
- Keep foreign keys enabled and preserve vault-relative file references.

Route 01 uses a compatibility strategy: Workspace is the canonical domain term, but
the physical `projects` table remains during the migration window.

Route 02 appends a Story Engine migration with ordered outlines, many-to-many
Evidence/Knowledge/Asset/Campaign/Story links, Outputs, version checkpoints, and
domain events. TipTap HTML remains canonical stored authoring content; Markdown is
an output format.

Migration 5 adds the durable domain-event/outbox foundation, idempotent Activity
projection checkpoints and quarantine, and versioned Intelligence result
provenance. Workspace creation is the first atomic domain-write/event vertical
slice; remaining mutations still require migration to this path.

## Desktop packaging

```bash
pnpm package:dir
pnpm package:mac
```

- `package:dir` creates an unsigned local `.app` for validation.
- `package:mac` creates hardened-runtime DMG and ZIP artifacts.
- Signing/notarization require the standard Apple certificate credentials in the
  release environment.

## Engineering rules

- Treat `N-TC3_index.md` as the repository source of truth.
- Treat the System Design Book as the detailed constitutional reference.
- Label architectural rules `Proposed` or `Accepted`.
- Record reviewed amendments instead of allowing silent architecture drift.
- Edit OpenAPI before generated API artifacts.
- Keep Electron `contextIsolation` enabled and `nodeIntegration` disabled.
- Store portable vault-relative paths, never absolute machine-specific content
  paths.
- Never edit an applied SQLite migration.
- Preserve the pnpm minimum-release-age policy.
- Update the index and this README whenever routes, architecture, commands, or
  implementation status change.

## Current limitations

- Child APIs still expose legacy `projectId` fields while the canonical Workspace
  migration is completed; archived-Workspace mutation guards are enforced.
- Story graph relationships are implemented; other cross-domain graph surfaces
  still require their route-specific work.
- Story versions are stored and visible on the timeline, but compare/restore UI is
  deferred.
- Calendar and full export pipeline routes are planned.
- Entity version history, collaboration, cloud sync, and AI providers are not
  implemented.
- Native Electron restore/reveal/dialog workflows need deeper desktop automation.
- Durable events and EIE provenance are implemented as a Workspace vertical slice,
  not yet across every domain mutation. Story Health still needs migration to the
  common execution contract.
- Outputs are safely created as Draft, but their validated Review/Ready/Published
  transition API remains future corrective work.

## Future features

The following are documented product direction, **not current functionality**:

- **C³ Canon and Protocol:** shared vocabulary, typed relationship semantics,
  consistent interaction grammar, and machine-verifiable module/event/file/plugin
  contracts.
- **Intelligence Cards:** explainable presentation for Health, risks, findings, and
  recommendations with provenance and actions.
- **Route 04 Knowledge Base:** source-backed claims, reviews, lifecycle, citations,
  backlinks, versions, archive/restore, and Workspace-scoped institutional memory.
- **Knowledge Query:** an information-first EIE capability that answers from
  authorized sources with citations or abstains when evidence is insufficient.
- **Knowledge Evolution Explorer:** distinct relationship, version, lineage, and
  historical views showing how understanding changes over time.
- **Knowledge Intelligence:** future freshness, coverage, gap, contradiction,
  duplicate, relationship, and recommendation capabilities under the single EIE.

These features depend on the Evidence Vault foundation and remaining constitutional
corrective work. Their detailed proposed definitions and sequencing are maintained
in [`N-TC3_index.md`](N-TC3_index.md).

## Product and implementation references

- [`N-TC3_index.md`](N-TC3_index.md) — canonical current state
- [`Docs/N-Tech-C³-product architecture-design.md`](Docs/N-Tech-C³-product%20architecture-design.md) — route architecture
- [`Docs/Route-01-Workspaces-execution-plan.md`](Docs/Route-01-Workspaces-execution-plan.md) — Route 01 audit and implementation plan
- [`Docs/Route-02-Stories-execution-plan.md`](Docs/Route-02-Stories-execution-plan.md) — Route 02 audit and implementation plan
- [`Docs/NTC3_UI-UX_Spec.md`](Docs/NTC3_UI-UX_Spec.md) — governing UI/UX specification
- [`Docs/System-Design-Book/`](Docs/System-Design-Book/) — accepted constitutional
  specifications, invariant audit, and performance evidence
