# N-Tech C³ — Repository Source of Truth

> Last audited: 2026-07-28  
> Repository: `N-TechC3`  
> Product stage: v0.1 alpha / active development

This file is the canonical index for the product intent, implemented system, current gaps, and repository operating rules. It reconciles the aspirational documents in `Docs/` with the code that exists today.

## 1. Authority and interpretation

When sources disagree, use this precedence:

1. `N-TC3_index.md` — canonical interpretation and current-state map.
2. `Docs/N-Tech-C³-product architecture-design.md` — canonical route intent and Route Discovery Framework.
3. `Docs/Route-01-Workspaces-execution-plan.md` — accepted implementation decisions for Route 01.
4. `wireframe.png` and `branding-brief.png` — binding visual sources for the Home composition and complete brand/design system.
5. `Docs/NTC3_UI-UX_Spec.md` — reconciled governing UI/UX specification for information architecture, interaction, visual language, accessibility, and screen behavior.
6. Executable code and configuration — truth for current behavior, but not authority to override approved target visuals.
7. `lib/api-spec/openapi.yaml` — truth for HTTP contracts.
8. `lib/db/src/migrations.ts` and `lib/db/src/index.ts` — truth for SQLite migrations, initialization, and vault access.
9. `Docs/NTC3_Feature` — active, explicitly requested feature outcomes.
10. `Docs/NTC3_spec-doc.txt` — refined long-term EIOS product direction.
11. `Docs/NTC3.txt` — original v0.1 ECOS scope and architecture proposal.
12. `README.md` — operator guide; update it when commands, prerequisites, routes, or architecture change.

The documentation is strategic, not a claim that every described feature exists. A feature is implemented only when it is present in executable code and its required data/API path exists.

## 2. Canonical product definition

**Name:** N-Tech C³  
**Category:** Engineering Intelligence Operating System (EIOS)  
**Primary user:** NaniTech engineering, currently single-user  
**North-star question:** “Can I prove this?”  
**Promise:** Transform raw engineering work into structured, reusable, evidence-backed knowledge and content.

The refined EIOS framing in `Docs/NTC3_spec-doc.txt` supersedes the earlier “Engineering Content Operating System” label in `Docs/NTC3.txt`. Content is an output of captured engineering intelligence, not the product itself.

### Product flow

```text
Capture reality → Organize knowledge → Produce evidence → Create influence
```

### Core engines

- Capture Engine
- Knowledge Engine
- Evidence Engine
- Story Engine
- Distribution Engine
- Repository Intelligence Engine (flagship direction)

### Product principles

- Evidence first: stories and claims should be provable.
- Capture in two clicks or fewer.
- Everything should be linkable, searchable, exportable, and versioned.
- Keyboard-first, low-clutter, developer-oriented interaction.
- Approved dark technical visual language using glass panels, blueprint grids, clean composition, and developer-first detail.
- Local-first and portable remain target properties, not current implementation facts.
- AI is optional and future-facing; any AI capability must sit behind a provider interface.
- Capabilities such as import, export, repository analysis, publishing, and AI should converge on stable plugin interfaces.

### v0.1 non-goals

Authentication, accounts, cloud sync, subscriptions, social publishing APIs, social analytics, comments, multi-user collaboration, notifications, email marketing, and CRM are out of scope. AI agents are also outside the original v0.1 scope.

## 3. Current implementation snapshot

The current repository implements a **local-first Electron application backed by SQLite and a filesystem vault**. Express remains as a loopback-only local service so the OpenAPI-first UI boundary stays reusable.

### Runtime architecture

```text
Electron + React 19 + Vite
        ↓
Generated TanStack Query client
        ↓
Express 5 API under /api
        ↓
Generated Zod request/response validation
        ↓
Node built-in SQLite driver
        ↓
SQLite WAL database + filesystem vault
```

### Implemented stack

| Layer | Current choice |
| --- | --- |
| Workspace | pnpm workspaces |
| Language | TypeScript 5.9 |
| Frontend | React 19, Vite 7, Wouter, TanStack Query |
| UI | Tailwind CSS 4, Radix primitives, Lucide, Framer Motion |
| API | Express 5 |
| Contract | OpenAPI 3 + Orval code generation |
| Validation | Generated Zod schemas |
| Desktop | Electron with isolated preload IPC |
| Database | SQLite via `node:sqlite`, WAL mode |
| File storage | Portable vault under the user's Documents directory |
| Logging | Pino / pino-http |
| API bundle | esbuild, ESM output |

### V1 architecture decision

V1 is committed to Electron + SQLite + filesystem vault. The local Express service is an internal adapter, bound to loopback by the desktop lifecycle. HTML is the canonical stored authoring format for TipTap content; file references are vault-relative for portability.

## 4. Repository map

| Path | Responsibility | Editing rule |
| --- | --- | --- |
| `artifacts/ntech-c3/` | Primary React application | Product UI and page behavior live here |
| `artifacts/api-server/` | Express API | Routes must validate through generated Zod schemas |
| `artifacts/mockup-sandbox/` | Separate UI/mockup sandbox | Not the production app |
| `lib/api-spec/openapi.yaml` | Canonical API contract | Change this before generated clients/schemas |
| `lib/api-client-react/` | Browser API client and generated hooks | Do not hand-edit generated files |
| `lib/api-zod/` | Generated API validation schemas | Do not hand-edit generated files |
| `lib/db/src/index.ts` | SQLite DDL, initialization, and vault access | Current persistence truth |
| `scripts/` | Workspace utility scripts/hooks | Keep operational scripts small and documented |
| `Docs/` | Product context, refinement, active feature briefs | Aspirational unless confirmed by code |
| `Docs/NTC3_UI-UX_Spec.md` | Governing UI/UX contract reconciled to approved visuals | Implement against it; obtain approval only for listed open decisions or visual deviations |
| `wireframe.png` | Approved Home/landing screen | Reproduce composition and hierarchy exactly |
| `branding-brief.png` | Approved N-Tech C³ brand guide | Use its identity, tokens, typography, voice, components, motion, and visual language |
| `README.md` | Short runbook and architecture summary | Keep aligned with this index |
| `pnpm-workspace.yaml` | Workspace catalog and supply-chain policy | Do not disable `minimumReleaseAge` |

## 5. Implemented product surface

### Frontend routes

| Route | Module | Current capability |
| --- | --- | --- |
| `/dashboard` | Home | Approved branded landing composition with hero, Get Started actions, workspaces, activity, real metrics/focus, tips, and shortcuts |
| `/search` | Global Search | Ranked FTS5 search across canonical entity types, including Workspaces |
| `/workspaces` | Workspace picker | Search/filter, create, open, favorite, pin, duplicate, archive/restore, and manifest export |
| `/workspaces/:id` | Workspace overview | Scoped metrics, health breakdown, recent activity, current work, quick actions, and archive/corruption states |
| `/workspaces/:id/settings` | Workspace settings | Edit identity, current goal, repositories, tags, and initial Workspace DNA fields |
| `/stories` | Global Story catalogue | Workspace/status/type/search filters and Workspace-required creation |
| `/workspaces/:workspaceId/stories` | Scoped Story catalogue | Stories belonging to one Workspace |
| `/stories/:id` | Story studio | Overview, ordered outline, TipTap editor, Evidence, Assets, References, Outputs, Timeline, health inspector, lifecycle, version-safe save, and archive/restore |
| `/campaigns` | Campaigns | List and create |
| `/campaigns/:id` | Campaign detail | Read, edit core fields, delete |
| `/evidence` | Evidence Vault | List, type/search filter, manual metadata capture |
| `/knowledge` | Knowledge Base | List/search and create |
| `/knowledge/:id` | Knowledge detail | Read, manually save plain text content, delete |
| `/assets` | Assets | List/filter and create URL/path metadata |
| `/templates` | Templates | List/filter and create |
| `/projects`, `/projects/:id` | Compatibility | Redirect old browser links to canonical Workspace routes |
| `/settings` | Settings | Presentational settings screen; no durable settings model |

### API surface

The API is mounted at `/api`. It provides:

- `GET /healthz`
- dashboard statistics and recent activity
- ranked cross-module full-text search
- Workspace list/filter/create/overview/update, metadata duplication, integrity, and manifest export endpoints
- deprecated list/create/get/update/delete endpoints for Project API compatibility
- list/create/get/update/delete endpoints for stories
- story counts grouped by status
- list/create/get/update/delete endpoints for campaigns
- list/create/get/update/delete endpoints for evidence
- list/create/get/update/delete endpoints for assets
- list/create/get/update/delete endpoints for knowledge pages
- list/create/get/update/delete endpoints for templates

The complete operation names and schemas are defined in `lib/api-spec/openapi.yaml`.

### Persistence model

Current SQLite tables:

- `projects`
- `campaigns`
- `stories`
- `evidence`
- `assets`
- `knowledge`
- `templates`
- `activity`
- Story Engine graph tables: `story_outline_items`, `story_evidence`,
  `story_knowledge`, `story_assets`, `story_campaigns`, `story_relations`,
  `story_outputs`, `story_versions`, and `story_events`

The physical `projects` table is retained as a backward-compatible storage detail;
the canonical product and API domain term is **Workspace**. Migration v3 extends it
with Workspace identity, status, DNA, repository, preference, and recency fields.

Relationships remain lighter than the complete future graph:

- stories carry a physical `project_id` exposed as Workspace context in new flows
- evidence and assets carry Workspace/project foreign keys
- campaigns, knowledge pages, and templates now have Workspace/project foreign keys
- knowledge pages may carry `linkedPageIds`

Workspace relationships are enforced by SQLite foreign keys and indexed. Many-to-many
story/evidence/asset/campaign relationships and automatic backlinks are not implemented.

## 6. Feature status against the product documents

Legend: **Implemented**, **Partial**, **Not implemented**.

| Capability | Status | Evidence/current limitation |
| --- | --- | --- |
| Home landing | Partial | Approved wireframe composition, brand hero, six Get Started cards, workspaces, activity, live metrics/focus, and bottom strip exist; Calendar/Exports routes and production logo exports remain |
| Stories (Route 02) | Implemented | Global/Workspace catalogues, Story studio sections, lifecycle, outline, relationship graph, Outputs, deterministic health, timeline, versions, optimistic concurrency, and archive/restore |
| Story authoring | Implemented | Shared TipTap editor with canonical HTML persistence, word/read-time derivation, version-safe explicit saves, and conflict rejection |
| Campaigns CRUD | Implemented | Core records only; no timeline/tasks/metrics/outputs |
| Evidence Vault CRUD | Partial | Metadata, paste/file capture, SHA-256 recording, text/image/PDF/audio/video preview, safe vault reveal, filtering, and story/project linking exist; large/unsupported files remain reveal-only |
| Knowledge Base CRUD | Partial | TipTap authoring and a stored linked-ID array exist; no rendered wiki graph/backlinks |
| Assets | Partial | URL/path metadata catalog; no upload, processing, thumbnailing, or local asset storage |
| Templates | Partial | Core records exist; no template application/export workflow |
| Workspaces (Route 01) | Implemented | Canonical picker, overview and settings routes; filtered list, initial DNA, scoped metrics/activity, health components, duplicate, archive/restore, integrity, manifest export, and old `/projects` redirects |
| Legacy Projects | Deprecated compatibility | Physical table and API remain temporarily to preserve existing vaults and integrations |
| Activity feed | Implemented | Append-only table; activity write failures are intentionally swallowed |
| Rich text editor | Implemented | Shared Story/Knowledge TipTap component stores HTML |
| Quick capture | Implemented | Global button, Cmd/Ctrl+K, and paste-to-TerminalOutput flow |
| Evidence file drop | Implemented | Electron IPC copies files into the vault and records checksum/source metadata |
| Global search | Implemented | Migration-backed FTS5 index, automatic triggers, ranked API/UI, and entity/project/status/date filters |
| Calendar/timeline | Not implemented | No route, API, or schema |
| Actionable queue | Not implemented | No route, API, or schema |
| Export pipeline | Partial | Desktop exports portable JSON plus human-readable Markdown; HTML/PDF/DOCX exporters remain |
| Version history | Not implemented | Only current rows and timestamps are stored |
| Backup/restore | Implemented | Desktop creates compressed portable vault archives; restore validates paths, preserves a recovery copy, and rolls back on copy failure |
| Repository integration | Partial | Secure desktop folder selection captures branch, commit, package manager, frameworks, dependencies, TODOs, README, readiness, and optional project association |
| Repository Intelligence Engine | Partial | Deterministic, fingerprinted snapshots become searchable `RepositoryAudit` evidence with per-project history counts and metric diffs; deeper dependency/security analysis remains |
| Workspace health score | Implemented | Server calculates and explains recency, evidence, campaign, knowledge, and asset components with insufficient-data handling |
| Story health score | Implemented | Deterministic weighted outline, Evidence, Knowledge, Asset, metadata, readability, and Output components with blockers |
| Evidence/knowledge health scores | Not implemented | Workspace and Story health exist; standalone Evidence/Knowledge engines remain |
| Local vault/filesystem | Implemented | SQLite database and documented vault directories initialize locally |
| Electron desktop shell | Implemented | Main/preload lifecycle, local API launch, static UI serving, secure file IPC |
| Branded application shell | Partial | Approved palette/typography, preserved checkered background, top bar, wireframe navigation, Quick Capture panel, and local SVG mark exist; compact/mobile drawer and final exported brand artwork remain |
| Plugin manager | Not implemented | Architectural direction only |
| AI provider adapter | Not implemented | Future architecture only |
| Authentication/multi-user | Intentionally excluded | v0.1 non-goal |

## 7. Active feature briefs

`Docs/NTC3_Feature` defines the immediate feature queue.

### Feature 1 — Shared rich text editor

Required outcome:

- Replace the former story and knowledge plain textareas with one reusable TipTap editor.
- Support headings, bold, italic, code blocks, blockquotes, lists, tables, and image embeds.
- Persist a deliberately chosen format—HTML or Markdown—to the existing `content` fields.
- Provide autosave or explicit save with visible status.

Current state: implemented with HTML as the canonical stored format and explicit save-state feedback.

### Feature 2 — Two-click evidence capture

Required outcome:

- Global quick-capture command palette or floating action.
- Paste text into a prefilled `TerminalOutput` evidence capture.
- Drag a file onto the Evidence page to start capture.
- Complete capture in no more than two clicks.

Current state: implemented. Terminal paste uses `content`; dropped files are copied through isolated Electron IPC into `evidence/`, and the evidence record receives a vault-relative `source` plus SHA-256 checksum note.

### Next implementation order

1. Implement Route 03 — Evidence Vault against the Route Discovery Framework.
2. Add Story version compare/restore controls on top of stored checkpoints.
3. Propagate canonical `workspaceId` through remaining legacy child contracts.
4. Add the actionable dashboard queue and recent export/backup history.

## 8. Contract and data workflow

The project is OpenAPI-first:

1. Edit `lib/api-spec/openapi.yaml`.
2. Run `pnpm --filter @workspace/api-spec run codegen`.
3. Review generated changes in:
   - `lib/api-client-react/src/generated/`
   - `lib/api-zod/src/generated/`
4. Update server route implementation and database schema as needed.
5. For schema changes, update the versioned SQLite initializer/migration and run `pnpm --filter @workspace/db run push` against a disposable vault first.
6. Run workspace typecheck/build.

Never manually edit generated API client or generated Zod files.

### Known contract constraint

The existing repo documents an Orval/Zod compatibility constraint: API numeric integer fields use `type: number` rather than OpenAPI `type: integer`, because the latter generated Zod v4-style `zod.int()` while the workspace uses Zod 3.

## 9. Runbook

### Prerequisites

- pnpm
- compatible Node.js runtime (README currently states Node.js 24)
- installed workspace dependencies

### Required environment

| Variable | Used by | Requirement |
| --- | --- | --- |
| `PORT` | API and Vite config | Positive numeric port; required |
| `BASE_PATH` | frontend Vite config | Optional; defaults to `/` |
| `NTC3_VAULT_PATH` | local database/API | Optional development/test vault override |

The frontend and API cannot use the same port when run as separate processes.

### Commands

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/ntech-c3 run dev
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
pnpm desktop
pnpm test
pnpm package:dir
pnpm package:mac
```

Run libraries before artifact typechecks when diagnosing stale generated declarations:

```bash
pnpm run typecheck:libs
```

## 10. Quality and operational risks

### High priority

- **Relationships are incomplete:** Workspace foreign keys exist across core tables, but old child APIs still expose `projectId` and the many-to-many graph promised by EIOS is not modeled.
- **Compatibility debt is intentional:** the physical `projects` table and deprecated `/api/projects` contract remain for one release while consumers migrate to Workspaces.
- **Browser-level coverage is partial:** Playwright verifies Workspace create/detail/search, TipTap persistence, and browser file ingestion; native Electron dialogs, restore, reveal, and file-drop IPC still need desktop automation.
- **Signing is environment-dependent:** unsigned `.app` packaging passes; signed/notarized DMG/ZIP release validation requires Apple credentials.
- **Release identity is partially complete:** the bundle has a stable app ID, hardened runtime configuration, and custom SVG/PNG application icon; Apple signing and notarization remain credential-dependent.

### Medium priority

- FTS covers the core text entities with date/project/status/entity filters, but semantic search is not implemented.
- List ordering is ascending by timestamp in several routes, which may not match “recent first” product expectations.
- CORS is unrestricted inside the loopback service.
- No global API error boundary or user-facing mutation error handling is apparent.
- Settings are not persisted.
- Static shell status values (“Core Load”, “Memory”, “Online”) are decorative, not live telemetry.
- The mockup sandbox duplicates a large UI component set and should not be mistaken for production code.

## 11. Definition of done for new work

A feature is done only when all applicable items are true:

- behavior matches an active brief or an approved addition to this index
- API changes begin in OpenAPI and generated output is refreshed
- data changes include schema handling and a safe migration/push plan
- loading, empty, success, and error states are handled
- keyboard and accessibility behavior are considered
- tests cover the highest-risk path
- `pnpm run typecheck` and relevant builds pass in a provisioned environment
- this index and README are updated if architecture, commands, environment, status, or scope changed

## 12. Source documents audited

### `Docs/NTC3.txt`

Original v0.1 ECOS specification. It defines the local-first desktop vision, module catalogue, content/evidence model, design language, proposed Electron/SQLite/Markdown stack, performance targets, export/versioning/backup goals, and future server migration strategy.

Use it for detailed feature intent, but not as proof of current architecture.

### `Docs/NTC3_spec-doc.txt`

Strategic refinement from ECOS to EIOS. It elevates evidence, knowledge graphs, two-click capture, health/completeness scoring, plugin boundaries, export pipelines, and especially repository intelligence.

This is the canonical long-term product framing.

### `Docs/NTC3_Feature`

Two active briefs: the shared TipTap editor and rapid evidence capture. These are the nearest-term requested outcomes.

### `Docs/NTC3_UI-UX_Spec.md`

Desktop-first UI/UX contract created from the product documents and executable UI audit. It defines information architecture, core journeys, layout and visual tokens, component behavior, keyboard/accessibility requirements, responsive rules, content language, route-level specifications, current divergences, acceptance criteria, implementation sequence, and open product decisions.

This is the governing interface specification. Its aspirational screen behavior is not proof of implementation; implementation status remains in this index.

### `Docs/N-Tech-C³-product architecture-design.md`

Route-oriented product architecture using the Route Discovery Framework. It currently
defines Workspaces, Stories, Evidence Vault, Knowledge Base, Campaigns, Publishing
Pipeline, and Repository Intelligence. Routes 01 and 02 have been implemented;
later route sections remain product intent until their execution plans are approved.

### `Docs/Route-01-Workspaces-execution-plan.md`

Audit and implementation contract for the first router. It resolves Project versus
Workspace terminology, defines the canonical frontend/API surface, prescribes
backward-compatible storage, and records Route 01 acceptance criteria and deferrals.

### `Docs/Route-02-Stories-execution-plan.md`

Audit and implementation contract for the Story Engine. It defines the Story
lifecycle, catalogue/studio routes, graph relationships, outline, Outputs, health,
timeline, version/concurrency rules, compatibility strategy, and acceptance criteria.

### `wireframe.png` and `branding-brief.png`

Approved visual sources supplied at repository root. The wireframe binds the Home screen layout, hierarchy, labels, actions, density, and proportions. The branding brief binds the N-Tech C³ identity, brand pillars, voice, semantic colors, dark/light palettes, Inter and JetBrains Mono typography, 8-point spacing, radii, shadows, Lucide icon treatment, purposeful motion, glass/blueprint visual language, and component styling.

## 13. Maintenance protocol

Update this file in the same change whenever:

- a module or route is added/removed
- a feature status changes
- the runtime, storage, or deployment architecture changes
- a new source-of-truth document is introduced
- an environment variable or operating command changes
- an architectural decision resolves one of the listed divergences

Use concrete statuses and repository evidence. Keep aspirational design clearly separated from shipped behavior.

## 14. Audit verification record

Audit scope included:

- all files in `Docs/`
- approved root visual sources `wireframe.png` and `branding-brief.png`
- root workspace configuration and README
- frontend routes, shell, pages, and package dependencies
- Express app, route registration, CRUD handlers, and logging
- OpenAPI path/operation inventory
- generated client/schema structure
- the SQLite schema initializer and entity-store mappings
- runtime environment requirements
- test/configuration discovery
- git working-tree state

Validation completed:

- `pnpm run typecheck` — passed across libraries, API, primary frontend, mockup sandbox, and scripts.
- `pnpm run build` — passed for the API and both Vite applications.
- Electron and esbuild install scripts — explicitly approved through the workspace supply-chain guard.
- Electron runtime — installed at version 38.8.6.
- SQLite/API smoke test — passed health, Workspace lifecycle/overview, legacy Project compatibility, and scoped evidence search against a disposable vault.
- `pnpm test` — 13 tests passed across migrations/FTS, Workspace and Story Engine lifecycles, API capture/filtered search, and frontend capture utilities.
- `pnpm run test:e2e` — 2 Playwright workflows passed for Workspace creation/detail/search, TipTap persistence, and evidence file ingestion.
- Electron Builder directory packaging — passed and produced an unsigned arm64 `.app` with bundled API/frontend resources.
- `git diff --check` — passed.

Frontend routes are lazy-loaded. The initial application chunk is about 316 kB before gzip; editor and syntax-highlighting code load separately only on authoring routes.
