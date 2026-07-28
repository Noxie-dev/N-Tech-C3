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
- **Stories:** list, filtering, creation, detail editing, status/priority, and TipTap
  HTML authoring.
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
| `/stories`, `/stories/:id` | Story catalogue and authoring |
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
Electron desktop shell
        │
React 19 + Vite + Wouter + TanStack Query
        │
Orval-generated OpenAPI client
        │
Express 5 local API (/api, loopback only)
        │
Generated Zod validation
        │
node:sqlite (WAL) + filesystem vault
```

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
- Cross-domain many-to-many graph relationships are not yet implemented.
- Calendar and full export pipeline routes are planned.
- Entity version history, collaboration, cloud sync, and AI providers are not
  implemented.
- Native Electron restore/reveal/dialog workflows need deeper desktop automation.

## Product and implementation references

- [`N-TC3_index.md`](N-TC3_index.md) — canonical current state
- [`Docs/N-Tech-C³-product architecture-design.md`](Docs/N-Tech-C³-product%20architecture-design.md) — route architecture
- [`Docs/Route-01-Workspaces-execution-plan.md`](Docs/Route-01-Workspaces-execution-plan.md) — Route 01 audit and implementation plan
- [`Docs/NTC3_UI-UX_Spec.md`](Docs/NTC3_UI-UX_Spec.md) — governing UI/UX specification
