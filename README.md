# N-Tech C³

Local-first Engineering Intelligence Operating System for NaniTech. N-Tech C³ captures engineering evidence, connects it to stories and knowledge, and keeps the working vault on the user's machine.

## V1 architecture

- Desktop: Electron
- UI: React 19, Vite, Wouter, TanStack Query, Tailwind CSS v4
- Local API: Express 5 on loopback only
- Database: Node's built-in SQLite driver, WAL mode
- Files: portable filesystem vault under `Documents/N-TechC3-Vault`
- Contracts: OpenAPI + Orval-generated React Query and Zod clients
- Editor: TipTap with HTML persistence

The vault contains `database/ntc3.sqlite` plus human-visible folders for stories, campaigns, knowledge, evidence, assets, exports, drafts, templates, backups, logs, and settings.

## Run

```bash
pnpm install
pnpm desktop
```

The desktop command builds the workspace, starts the local API, and opens Electron.

For browser-only development:

```bash
PORT=8080 NTC3_VAULT_PATH=./vault pnpm --filter @workspace/api-server run dev
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/ntech-c3 run dev
```

The Vite dev server must proxy `/api` or the API base URL must be configured when frontend and API run on different ports.

## Validation and code generation

```bash
pnpm test
pnpm run test:e2e
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

SQLite upgrades are numbered, transactional migrations recorded in `schema_migrations`. `db push` applies pending migrations idempotently. `NTC3_VAULT_PATH` overrides the default vault location for development and testing.

## Desktop packaging

```bash
pnpm package:dir
pnpm package:mac
```

Install the pinned browser once with `pnpm exec playwright install chromium`. `test:e2e` then builds and exercises the core project creation and global-search workflow.

`package:dir` creates an unsigned local `.app` with the N-Tech C3 application icon for validation. `package:mac` creates hardened-runtime DMG and ZIP artifacts. Electron Builder automatically signs when standard `CSC_*` Apple certificate credentials are available; notarization credentials must be supplied by the release environment.

## Repository map

- `artifacts/ntech-c3/` — React UI and Electron main/preload processes
- `artifacts/api-server/` — loopback Express API
- `lib/db/src/index.ts` — SQLite schema initialization and vault database access
- `lib/db/src/migrations.ts` — ordered transactional schema migrations
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/src/generated/` — generated React Query client
- `lib/api-zod/src/generated/` — generated server validators
- `Docs/` — product specifications and active feature briefs
- `Docs/NTC3_UI-UX_Spec.md` — governing information architecture, interaction, visual design, accessibility, and screen specification
- `wireframe.png` — binding Home/landing-screen composition
- `branding-brief.png` — binding brand identity and design-system guide
- `N-TC3_index.md` — audited repository source of truth

## Current capture flows

- `Cmd/Ctrl+K` opens Quick Capture from any module.
- Pasting text outside an editable control opens a prefilled Terminal Output capture.
- Dropping files on the Evidence Vault copies them into the vault through secure Electron IPC and stores a SHA-256 checksum.
- Stories and Knowledge pages share the TipTap editor and store HTML.
- Global Search uses a trigger-maintained SQLite FTS5 index across stories, evidence, knowledge, campaigns, assets, templates, and projects.
- Global Search can narrow results by entity type, project, status, and creation date.
- “Analyze Repository” on Projects creates searchable Repository Audit evidence without AI or shell interpolation.
- Project-linked scans retain snapshot history, deterministic fingerprints, and metric deltas from the prior scan.
- Project detail pages show repository snapshot timelines and comparisons.
- Evidence cards open an inline preview with story and project graph-linking controls.
- Supported vault files preview as images, PDFs, audio, or video; desktop users can safely reveal the underlying vault-relative file.
- Settings can export Markdown/JSON, create a compressed vault backup, and restore a trusted backup while retaining a pre-restore recovery copy.

## Current UI

The desktop shell and Home route now use the approved N-Tech C³ palette, Inter/JetBrains Mono typography, checkered background, wireframe navigation, Quick Capture sidebar, brand hero, Get Started actions, operational panels, and live local metrics. `wireframe.png` and `branding-brief.png` remain the visual acceptance references.

## Rules

- Edit OpenAPI first, then regenerate clients and validators.
- Do not hand-edit generated API files.
- Do not disable `minimumReleaseAge` in `pnpm-workspace.yaml`.
- Keep Electron `contextIsolation` enabled and `nodeIntegration` disabled.
- Never store absolute machine-specific paths in portable entity content; store vault-relative paths.
- Never edit an applied migration; append a new numbered migration.
