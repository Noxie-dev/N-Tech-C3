# N-Tech C³ — Repository Source of Truth

> Last audited: 2026-07-29
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

### Intelligence architecture

N-Tech C³ has one Engineering Intelligence Engine with modular capabilities:
Capture, Repository, Relationship, Evidence, Knowledge, Story, Campaign,
Publishing, Workspace, Vault, Health, and Recommendation Intelligence.

Business domains remain separate and own authoritative facts and lifecycle rules.
The Intelligence Engine observes those domains and produces versioned, explainable,
reproducible insight.

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

## 2A. Phase II — Platform Definition: Engineering Constitution

N-Tech C³ has reached the point where product architecture must become governed
platform architecture. Before Route 03 or another major subsystem is implemented,
the project must establish an **Engineering Constitution** and a version-controlled
**System Design Book**.

This is not another PRD. It is the durable decision framework used to evaluate every
future feature, pull request, plugin, schema change, event, dependency, and release.

### Constitutional authority

- `N-TC3_index.md` remains the repository-level source of truth for authority,
  implementation status, and approved direction.
- The System Design Book will hold the detailed constitutional specifications,
  diagrams, invariants, UX flows, performance budgets, and standards.
- Executable code must conform to approved constitutional rules.
- When implementation and constitution conflict, either the implementation changes
  or an explicit, reviewed constitutional amendment is recorded.
- Approved architecture is **change-controlled**, not permanently frozen. Evidence
  may justify evolution, but silent architectural drift is prohibited.
- Aspirational rules must be labelled `Proposed`; rules become binding only when
  labelled `Accepted`.
- Existing Route 01 and Route 02 implementations must be audited against the
  accepted constitution before incompatible cleanup migrations are approved.

### The twelve constitutional specifications

#### Specification 01 — Domain Model

Define every domain object, purpose, responsibility, owner, lifecycle, relationship,
constraint, and invariant without implementation detail.

Canonical top-level model:

```text
Vault
├── Workspaces
│   ├── Stories
│   ├── Repositories
│   ├── Evidence
│   ├── Knowledge
│   ├── Campaigns
│   └── Media
└── Global Settings
```

No entity may enter implementation without an authoritative owner and explicit
lifecycle. Every relationship must define cardinality, deletion behavior,
cross-Workspace rules, and integrity requirements.

#### Specification 02 — Data Architecture

Define the canonical persistence model, SQLite tables, indexes, foreign keys,
versioning, migrations, soft deletion, immutable records, and FTS5 ownership.

The specification must cover at least Vaults, Workspaces, Stories, Campaigns,
Evidence, Knowledge, Media, Repositories, Repository Snapshots, Activities,
Templates, Outputs/Exports, Tags, Relationships, Plugins, and Settings.

OpenAPI names may differ from backward-compatible physical SQLite names only when
the mapping and removal strategy are documented.

#### Specification 03 — Filesystem

Define the portable vault structure and the rules for every directory:

```text
Vault/
├── database/
├── repositories/
├── workspaces/
├── stories/
├── knowledge/
├── media/
├── exports/
├── logs/
├── settings/
└── backups/
```

The specification must define path ownership, naming, portability, atomic writes,
checksums, recovery, backup inclusion, retention, and which artifacts must remain
human-readable. Machine-specific absolute paths may not become portable content.

#### Specification 04 — Design System

Define spacing, typography, elevation, motion, radii, icons, animation timing,
accessibility, grid, responsive behavior, dark/light themes, focus, loading, empty,
success, conflict, offline, and error states.

`branding-brief.png`, `wireframe.png`, and `Docs/NTC3_UI-UX_Spec.md` remain the
current inputs. The constitutional specification will convert those references into
testable tokens and rules.

#### Specification 05 — Component Library

Document the contract, states, accessibility, composition rules, and ownership of
reusable components such as Button, Card, Inspector, Timeline, Health Meter,
Knowledge Graph, Repository Card, Evidence Card, Command Palette, Metrics,
Data Table, Split Pane, Explorer, Properties Panel, and Editor.

Application pages compose approved primitives; they do not create competing local
design systems.

#### Specification 06 — Platform Services

For every service, define purpose, responsibilities, dependencies, public API,
events, lifecycle, failure behavior, observability, and performance requirements.

Initial service catalogue:

- Search Service
- Activity Service
- Plugin Service
- Export Service
- Storage Service
- Task Engine
- Settings Service
- Notification Service
- Repository Scanner
- Media Processor

Services own domain behavior. Express routes and UI components are adapters, not
alternate owners of business rules.

#### Specification 07 — Plugin SDK

Define one extension model:

```text
Plugin
↓
Manifest
↓
Capabilities
↓
Commands
↓
Views
↓
Settings
↓
Events
```

The SDK must define permissions, capability discovery, lifecycle, compatibility,
failure isolation, local data access, secrets, UI contribution points, auditability,
and uninstall behavior before external plugins are supported.

Potential integrations—OpenAI, GitHub, Canva, LinkedIn, Markdown, and PDF—must use
the SDK or a documented platform adapter rather than bespoke core coupling.

#### Specification 08 — Event Architecture

Domain changes emit durable, typed events such as:

```text
StoryCreated
EvidenceAttached
RepositoryScanned
CampaignCompleted
ExportGenerated
KnowledgeUpdated
```

Search, Activity, Timeline, metrics, and other projections react to events instead
of being manually coordinated by every producer.

The specification must define event identity, version, schema ownership, ordering,
transaction boundary, idempotency, replay, failure handling, retention, and
projection rebuilding. “Everything is an event” does not mean every UI interaction
is persisted; only meaningful domain facts qualify.

#### Specification 09 — Performance

Performance is a product feature with measurable budgets. Initial targets to
validate on supported hardware are:

| Operation | Initial target |
| --- | ---: |
| Desktop cold start | under 2 seconds |
| Search response | under 50 ms |
| Local save transaction | under 25 ms |
| Workspace overview load | under 100 ms |

The accepted specification must also budget memory, repository scans, exports,
background tasks, animation responsiveness, large vaults, and degradation behavior.
Targets are not claims until benchmarked and recorded with hardware and dataset
profiles.

#### Specification 10 — Engineering Standards

Define naming, folder boundaries, component rules, testing, logging, architecture,
error handling, dependencies, documentation, Git, commit messages, branching,
release strategy, review checklist, Definition of Done, production readiness, and
Evidence-Based Development.

Standards must be enforceable through templates, tests, linting, CI, review gates,
or documented evidence. A rule that cannot be checked must identify its reviewer
and required proof.

#### Specification 11 — Engineering Principles

These principles are timeless decision filters:

1. **Evidence Before Opinion** — engineering decisions require traceable evidence.
2. **Local First** — cloud is an enhancement, never a dependency.
3. **Files Belong to the User** — content remains portable and human-readable
   whenever practical.
4. **Composition Over Configuration** — prefer small composable building blocks to
   monolithic features.
5. **One Source of Truth** — every fact has exactly one authoritative owner.
6. **Everything Is Linkable** — durable knowledge should not exist in isolation.
7. **Design for Evolution** — extension must not require routine core rewrites.
8. **Automation Earns Its Place** — automation must be transparent, traceable, and
   user-controlled.
9. **Performance Is a Feature** — responsiveness is part of correctness and product
   quality.
10. **Quality Before Quantity** — fewer complete capabilities are better than many
    unfinished ones.

#### Specification 12 — Engineering Intelligence Engine

N-Tech C³ has one **Engineering Intelligence Engine (EIE)** with modular
capabilities. Capture, Repository, Evidence, Knowledge, Story, Campaign,
Publishing, Workspace, Vault, Relationship, Health, and Recommendation
Intelligence are capabilities of that engine—not independent orchestration
subsystems.

Canonical layering:

```text
Experience
Dashboard, Workspaces, Stories, Evidence, Knowledge, Campaigns, Pipeline
                              ↓
Business Domains
Own authoritative facts, invariants, relationships, and lifecycles
                              ↓
Engineering Intelligence Engine
Analyzes domain facts and produces explainable derived insight
                              ↓
Platform Services
Events, jobs, search, storage, exports, plugins, settings
                              ↓
Platform Core
Electron, SQLite, filesystem vault, IPC, FTS5
```

The governing ownership rule is:

> Domains own truth; Intelligence derives insight.

The EIE may observe, analyze, score, suggest relationships, recommend actions, and
publish derived events. It may not silently redefine a domain invariant, mutate an
authoritative fact without a domain command, or make a probabilistic result appear
deterministic.

Initial capability catalogue:

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

Capabilities register against a shared contract rather than implementing separate
engines:

```ts
type IntelligenceCapability = {
  id: string;
  version: string;
  consumes: string[];
  analyze(context: AnalysisContext): Promise<AnalysisResult>;
};
```

`AnalysisResult` may contain derived facts, scores, relationship suggestions,
recommendations, and events. A capability is not required to implement artificial
empty operations merely to conform to a rigid lifecycle interface.

Every derived result must record:

- capability and algorithm version;
- input entity versions or event watermark;
- calculation timestamp;
- component values and explanation;
- evidence references;
- confidence when probabilistic;
- expiry or invalidation rule.

Derived facts are reproducible projections, not primary truth. Activity is also a
projection and must not be used as the event source of truth.

The first EIE platform substrate must provide:

1. a durable, typed `domain_events` log or transactional outbox;
2. atomic event append with the authoritative domain transaction;
3. idempotent consumers and replay checkpoints;
4. a capability registry and cancellable job execution;
5. versioned derived-fact, score, relationship-suggestion, and recommendation
   contracts;
6. deterministic/probabilistic classification;
7. resource, privacy, security, and explainability boundaries.

Use deterministic rules first. FTS5, explicit typed relationships, backlinks,
degree counts, connected components, orphan detection, exact hashes, and TF-IDF are
preferred baselines. PageRank, HITS, Louvain clustering, Bloom filters, vector
indexes, embeddings, and local models require measured evidence before adoption.

Content-addressable storage must be introduced incrementally through a versioned
blob catalogue with SHA-256 identity, verification state, and optional perceptual
hashes. Do not replace the vault with a Merkle DAG until the Filesystem and Data
Architecture specifications approve the migration and benchmarks justify it.

Health Intelligence owns the common calculation runtime, provenance, caching, and
explanation contract. Each business domain continues to own the definition and
invariants of its own score.

Recommendation Intelligence begins with deterministic, event-driven next actions.
Every recommendation requires a reason, evidence/source links, priority, rule
version, suggested actions, dismissal, snooze, and resolution detection. AI may be
added later as a clearly labelled probabilistic provider.

Embeddings use a dedicated provider boundary rather than being assumed to be an LLM
operation. FTS5 remains the local exact-search fast path.

The Plugin SDK contract should anticipate intelligence capabilities, but its runtime
implementation is delayed until at least two genuine integrations demonstrate the
required extension points.

### The N-Tech C³ Manifesto

> Software projects generate more than code.
>
> They generate decisions, evidence, knowledge, and stories worth sharing.
>
> Too much of that value is lost in terminal sessions, screenshots, pull requests,
> notebooks, and conversations.
>
> We believe engineering deserves a better memory.
>
> N-Tech C³ exists to capture engineering work as it happens, preserve it with
> integrity, connect it with context, and transform it into reusable knowledge and
> meaningful communication.
>
> Evidence comes before opinion. Knowledge grows through connection. Stories should
> be traceable. Campaigns should educate. Every engineering decision should have a
> source of truth.
>
> Build once. Learn forever. Share with confidence.

### Required System Design Book

Create `Docs/System-Design-Book/` as a version-controlled constitutional package:

```text
Docs/System-Design-Book/
├── README.md
├── 01-domain-model.md
├── 02-data-architecture.md
├── 03-filesystem.md
├── 04-design-system.md
├── 05-component-library.md
├── 06-platform-services.md
├── 07-plugin-sdk.md
├── 08-event-architecture.md
├── 09-performance.md
├── 10-engineering-standards.md
├── 11-engineering-principles.md
├── 12-intelligence-engine.md
├── decisions/
├── diagrams/
└── evidence/
```

Each specification must include status, owner, last-reviewed date, scope,
normative rules, invariants, diagrams, acceptance evidence, unresolved questions,
and amendment history.

### Platform-definition gate

Before beginning Route 03 implementation:

1. scaffold the System Design Book;
2. complete and accept Specifications 01, 02, 08, 10, 11, and 12;
3. audit Route 01 and Route 02 against their invariants;
4. record discrepancies as migrations, refactors, or accepted compatibility debt;
5. define the durable event/outbox contract and prove atomic append plus idempotent
   replay with a small vertical slice;
6. wrap the existing Workspace Health and Story Health calculations as the first
   versioned deterministic capabilities without changing their domain ownership;
7. define benchmark datasets and measure startup, search, save, Workspace load, and
   intelligence-job baselines on named hardware and representative vault sizes;
8. resume feature implementation only after the governing specifications are
   versioned and their open decisions are explicit.

Specifications 03–07 and 09 may mature incrementally, but no affected subsystem may
be declared production-ready while its governing specification remains proposed.

### Updated implementation recommendation

Pause Route 03 temporarily and complete the following sequence:

1. scaffold `Docs/System-Design-Book/`;
2. accept the Domain Model, Data Architecture, Event Architecture, Engineering
   Standards, Engineering Principles, and Engineering Intelligence Engine
   specifications;
3. audit the existing Workspace and Story implementations against their accepted
   invariants;
4. classify every discrepancy as corrective work, a migration, or explicitly
   accepted compatibility debt;
5. implement a transactional outbox/domain-event vertical slice without adopting
   full event sourcing;
6. establish versioned Intelligence result contracts and migrate current Workspace
   and Story Health as the first capabilities;
7. benchmark current startup, search, save, Workspace-load, and capability execution
   performance;
8. resume Route 03 only after the foundational specifications and evidence are
   accepted.

Architecture is change-controlled, not permanently frozen. Evidence may justify an
amendment, but it must be explicit and reviewed. `N-TC3_index.md` remains the
repository authority; the System Design Book holds detailed constitutional
specifications. Performance figures remain proposed until measured on named
hardware and representative vaults.

### Three-pass execution report — 2026-07-29

Status: **Completed**

#### Pass 1 — Constitutional scaffold and acceptance

Created `Docs/System-Design-Book/` with change-controlled, Accepted specifications
for the Domain Model, Data Architecture, Event Architecture, Engineering Standards,
Engineering Principles, and Engineering Intelligence Engine. Decision, diagram,
and evidence registers were also established.

#### Pass 2 — Route 01 and Route 02 invariant audit

The audit in
`Docs/System-Design-Book/evidence/route-01-02-invariant-audit.md` records 13
conformant items, 7 corrective-work items, 5 migration-work items, and 4 accepted
compatibility-debt items.

Highest-priority corrective work is enforcing archived Workspace read-only behavior
across child mutations, requiring canonical Workspace ownership for Stories,
restricting lifecycle transitions and initial Output status, making outline
replacement atomic, and eliminating lossy Activity writes and unsafe hard-delete
paths.

#### Pass 3 — Executable platform foundation

SQLite migration 5 now supplies a durable typed event log, per-consumer replay
checkpoints, projection quarantine, Activity projection idempotency, and versioned
Intelligence results with provenance and invalidation metadata.

Workspace creation is the first transactional vertical slice: the authoritative
Workspace row and `WorkspaceCreated` event commit atomically, then a replay-safe
consumer projects the event into Activity. Workspace Health is the first
deterministic EIE capability executed through the common provenance and cache
contract. This is deliberately an incremental outbox/event-log architecture, not
full event sourcing.

The reproducible benchmark at
`Docs/System-Design-Book/evidence/performance-baseline-2026-07-29.md` measured an
Apple M1 with 8 GB RAM, Node.js v24.18.0, 10 Workspaces, 1,000 Stories, and 100
iterations:

| Operation | Median | p95 |
| --- | ---: | ---: |
| Cold database initialization and migrations | 21.875 ms | Not sampled |
| Transactional Evidence save | 0.142 ms | 0.241 ms |
| FTS5 search | 0.045 ms | 0.059 ms |
| Workspace core load | 0.098 ms | 0.114 ms |
| Deterministic analysis and provenance save | 0.107 ms | 0.150 ms |

These are accepted baseline measurements but remain insufficient to establish
release budgets. UI rendering, Electron launch, file-copy workloads,
production-scale vaults, and slower supported hardware remain unmeasured.

Verification: repository typecheck passed; 14 Vitest tests passed across three
files, including the new migration, durable-event projection, replay idempotency,
and Intelligence provenance assertions.

Route 03 remains paused until the highest-risk corrective work is completed and the
remaining foundation specifications needed by Evidence Vault are accepted.

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

1. Close the highest-risk invariant gaps: transitive archived-Workspace guards,
   mandatory Story ownership, legal lifecycle transitions, safe Output creation,
   and atomic outline replacement.
2. Extend the durable-event and Intelligence contracts across Story and Evidence
   mutations, including Story Health, while retiring lossy Activity writes.
3. Accept the Filesystem, Platform Services, and Performance specifications and
   run larger UI, Electron-startup, attachment, and vault-scale benchmarks.
4. Reassess the Route 03 gate against recorded evidence, then begin Evidence Vault
   implementation when its governing specifications are accepted.

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
- `pnpm test` — 14 tests passed across migrations/FTS, Workspace and Story Engine lifecycles, durable-event projection, Intelligence provenance, API capture/filtered search, and frontend capture utilities.
- `pnpm run test:e2e` — 2 Playwright workflows passed for Workspace creation/detail/search, TipTap persistence, and evidence file ingestion.
- Electron Builder directory packaging — passed and produced an unsigned arm64 `.app` with bundled API/frontend resources.
- `git diff --check` — passed.

Frontend routes are lazy-loaded. The initial application chunk is about 316 kB before gzip; editor and syntax-highlighting code load separately only on authoring routes.
