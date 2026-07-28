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

## Platform-definition gate

Route 03 is temporarily paused while the foundational platform definition is
completed:

1. Scaffold `Docs/System-Design-Book/`.
2. Accept the Domain Model, Data Architecture, Event Architecture, Engineering
   Standards, Engineering Principles, and Engineering Intelligence Engine
   specifications.
3. Audit Workspaces and Stories against accepted invariants.
4. Classify discrepancies as corrective work, migration work, or compatibility
   debt.
5. Prove a transactional-outbox vertical slice with idempotent replay.
6. Convert current Workspace and Story Health calculations into the first versioned
   deterministic Intelligence capabilities without moving domain ownership.
7. Benchmark startup, search, save, Workspace load, and capability execution on
   named hardware and representative vaults.
8. Resume Route 03 only after the specifications and evidence are accepted.

Performance targets remain proposed until measured and recorded.

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
  migration is completed.
- Story graph relationships are implemented; other cross-domain graph surfaces
  still require their route-specific work.
- Story versions are stored and visible on the timeline, but compare/restore UI is
  deferred.
- Calendar and full export pipeline routes are planned.
- Entity version history, collaboration, cloud sync, and AI providers are not
  implemented.
- Native Electron restore/reveal/dialog workflows need deeper desktop automation.
- Durable domain events, consumer checkpoints, and the EIE capability registry are
  part of the active platform-definition work and are not yet implemented.

## Product and implementation references

- [`N-TC3_index.md`](N-TC3_index.md) — canonical current state
- [`Docs/N-Tech-C³-product architecture-design.md`](Docs/N-Tech-C³-product%20architecture-design.md) — route architecture
- [`Docs/Route-01-Workspaces-execution-plan.md`](Docs/Route-01-Workspaces-execution-plan.md) — Route 01 audit and implementation plan
- [`Docs/Route-02-Stories-execution-plan.md`](Docs/Route-02-Stories-execution-plan.md) — Route 02 audit and implementation plan
- [`Docs/NTC3_UI-UX_Spec.md`](Docs/NTC3_UI-UX_Spec.md) — governing UI/UX specification
- `Docs/System-Design-Book/` — constitutional specifications created during the
  platform-definition passes
