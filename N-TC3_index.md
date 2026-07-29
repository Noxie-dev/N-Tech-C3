# N-Tech C³ — Repository Source of Truth

> Last audited: 2026-07-29
> Repository: `N-TechC3`  
> Product stage: v0.1 alpha / active development

This file is the canonical index for the product intent, implemented system, current gaps, and repository operating rules. It reconciles the aspirational documents in `Docs/` with the code that exists today.

## 1. Authority and interpretation

When sources disagree, use this precedence:

1. `N-TC3_index.md` — canonical interpretation and current-state map.
2. `Docs/N-Tech-C³-product architecture-design.md` — canonical route intent and Route Discovery Framework.
3. `Docs/Route-Discovery-Framework.md` — accepted methodology for defining,
   implementing, measuring, and evolving routes.
4. `Docs/Route-01-Workspaces-execution-plan.md` and
   `Docs/Route-02-Stories-execution-plan.md` — accepted route-specific decisions.
5. `Docs/Route-03-Evidence-execution-plan.md` — accepted Route 03 RDF v1 dossier
   and staged execution authority.
6. `wireframe.png` and `branding-brief.png` — binding visual sources for the Home composition and complete brand/design system.
7. `Docs/NTC3_UI-UX_Spec.md` — reconciled governing UI/UX specification for information architecture, interaction, visual language, accessibility, and screen behavior.
8. Executable code and configuration — truth for current behavior, but not authority to override approved target visuals.
9. `lib/api-spec/openapi.yaml` — truth for HTTP contracts.
10. `lib/db/src/migrations.ts` and `lib/db/src/index.ts` — truth for SQLite migrations, initialization, and vault access.
11. `Docs/NTC3_Feature` — active, explicitly requested feature outcomes.
12. `Docs/NTC3_spec-doc.txt` — refined long-term EIOS product direction.
13. `Docs/NTC3.txt` — original v0.1 ECOS scope and architecture proposal.
14. `README.md` — operator guide; update it when commands, prerequisites, routes, or architecture change.

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

| Operation               |  Initial target |
| ----------------------- | --------------: |
| Desktop cold start      | under 2 seconds |
| Search response         |     under 50 ms |
| Local save transaction  |     under 25 ms |
| Workspace overview load |    under 100 ms |

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

Specifications 04, 05, and 07 may mature incrementally, but no affected subsystem may
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

| Operation                                   |    Median |         p95 |
| ------------------------------------------- | --------: | ----------: |
| Cold database initialization and migrations | 21.875 ms | Not sampled |
| Transactional Evidence save                 |  0.142 ms |    0.241 ms |
| FTS5 search                                 |  0.045 ms |    0.059 ms |
| Workspace core load                         |  0.098 ms |    0.114 ms |
| Deterministic analysis and provenance save  |  0.107 ms |    0.150 ms |

These are accepted baseline measurements but remain insufficient to establish
release budgets. UI rendering, Electron launch, file-copy workloads,
production-scale vaults, and slower supported hardware remain unmeasured.

Verification: repository typecheck passed; 14 Vitest tests passed across three
files, including the new migration, durable-event projection, replay idempotency,
and Intelligence provenance assertions.

At this checkpoint Route 03 remained paused. That status is superseded by the
NB3RP Pass 3 gate decision below.

### NB3RP Pass 1 execution report — invariant enforcement

Status: **Implemented and verified**

The first Next Best Recommended Pass closes the highest-risk Route 01/02 invariant
gaps:

- all Story, Evidence, Asset, Knowledge, Campaign, and Template mutations now share
  an archived-Workspace guard and return `409` with restore guidance;
- the canonical Story creation contract requires a valid `workspaceId`;
- Story lifecycle changes are limited to the adjacent forward/backward transition
  or explicit archive path, with existing approval/publication blockers retained;
- Outputs can only be created as `Draft`; readiness must be established through a
  future validated transition contract;
- Story outline replacement, its event, and all replacement rows commit in one
  SQLite transaction; and
- OpenAPI and generated client/Zod contracts reflect mandatory Story Workspace
  ownership and Draft-only Output creation.

Regression coverage verifies unassigned Story rejection, illegal lifecycle jumps,
premature Output readiness rejection, archived-parent child-write rejection, and
archived-parent Story-write rejection.

Verification completed with repository typecheck and production builds passing,
15 Vitest tests passing across three files, two Playwright workflows passing, and
Markdown whitespace validation passing.

Remaining related work: define Output transition endpoints, deprecate maintenance
hard deletes, migrate remaining child contracts from `projectId` to `workspaceId`,
and extend durable event projection beyond Workspace creation.

### NB3RP Pass 2 execution report — durable events and EIE expansion

Status: **Implemented and verified**

The second Next Best Recommended Pass extends the executable platform foundation:

- canonical Story create, update, lifecycle transition, outline replacement,
  Output creation, archive, and restore paths append typed version-1 domain events;
- Story writes, legacy Story timeline records, version checkpoints, and durable
  event appends commit in the same SQLite transaction on the migrated paths;
- Evidence capture, update, and deletion commit atomically with
  `EvidenceCaptured`, `EvidenceUpdated`, and `EvidenceDeleted`;
- Story and Evidence Activity entries are projected from durable events through the
  existing replay-safe consumer rather than direct lossy writes on those paths;
- Story Health now executes as deterministic EIE capability `story-health@1.0.0`
  with stored result provenance and caching; and
- the Story Health input watermark combines Story version with the latest durable
  Story event so relationship, outline, and Output changes cannot reuse stale
  cached results.

Regression assertions verify durable `StoryCreated` and `EvidenceCaptured` events,
projected Activity source-event identity, and stored deterministic Story Health
capability provenance.

Verification completed with repository typecheck and production builds passing,
15 Vitest tests passing across three files, two Playwright workflows passing, and
Markdown whitespace validation passing.

Remaining Pass 2 expansion debt: Story link/unlink and hard-delete paths still need
atomic durable events; Campaign, Knowledge, Asset, and Template mutations still use
legacy Activity writes; event projection lag diagnostics and background scheduling
remain future Platform Services work.

### NB3RP Pass 3 execution report — constitutional completion and scale evidence

Status: **Implemented and verified**

The third Next Best Recommended Pass accepts:

- Specification 03 Filesystem;
- Specification 06 Platform Services; and
- Specification 09 Performance.

The Filesystem specification now governs portable Vault-relative paths, managed
content ownership, staging and compensation, checksums, backup/restore, integrity,
security, and large-file behavior.

The Platform Services specification defines service ownership, commands, queries,
events, jobs, failure classification, recovery, observability, security, and the
boundary between domains, shared services, and the single EIE.

The Performance specification defines named workloads, hardware and dataset
disclosure, median/p95 reporting, proposed interaction budgets, regression policy,
and resource constraints. Numerical thresholds remain proposed until measured on
baseline and lower-tier supported hardware.

The expanded reproducible evidence in
`Docs/System-Design-Book/evidence/performance-scale-baseline-2026-07-29.md` measured
an Apple M1 with 8 GB RAM, 50 Workspaces, 10,000 Stories, and a 1 MiB attachment:

| Operation                                   |    Median |         p95 |
| ------------------------------------------- | --------: | ----------: |
| Cold database initialization and migrations | 32.826 ms | Not sampled |
| Transactional Evidence save                 |  0.159 ms |    0.276 ms |
| FTS5 search                                 |  0.052 ms |    0.061 ms |
| Workspace core load                         |  0.142 ms |    0.184 ms |
| Deterministic analysis and provenance save  |  0.110 ms |    0.163 ms |
| 1 MiB attachment copy                       |  1.954 ms |    3.436 ms |
| 1 MiB SHA-256                               |  0.915 ms |    1.073 ms |
| Large-fixture FTS5 search                   |  0.082 ms |    0.097 ms |

This supports the current SQLite/FTS5/SHA-256 direction at the measured scale.
Electron cold launch, React route rendering, backup/restore, large-file streaming,
memory, graph traversal, slower hardware, and external Channel delivery remain
unmeasured and cannot claim accepted release budgets.

Verification completed with the expanded benchmark, repository typecheck across
libraries, API, both frontends, and scripts, plus Markdown whitespace validation.

#### Route 03 gate decision

The general platform-definition pause is complete. Route 03 may now advance to an
RDF v1 dossier and execution-plan review. Implementation remains unauthorized until
that dossier defines its Evidence identity, provenance, source locators, immutable
or versioned file behavior, capture compensation, archive/deletion policy,
performance workloads, and applicable Tier 1–3 conformance evidence.

### TNB3 Pass 1 execution report — Route 03 Evidence dossier

Status: **Completed and Accepted**

`Docs/Route-03-Evidence-execution-plan.md` now supplies the required RDF v1
dossier and staged execution plan. It audits the current API, SQLite, Electron IPC,
UI, event, search, and test paths and resolves the target boundaries:

- Evidence is a Workspace-owned, provenance-bearing artifact that supports,
  challenges, or contextualizes a claim;
- classification, review, lifecycle, integrity, indexing, and relationship facts
  are independent dimensions rather than one overloaded status;
- imported payloads are immutable source versions with structured SHA-256,
  provenance, and validated source locators;
- managed-file capture uses a persisted, idempotent staging/promotion saga with
  compensation and restart reconciliation;
- archive/restore replaces normal hard deletion;
- canonical contracts use `workspaceId` while preserving `projectId`, singular
  `storyId`, and legacy source columns during a measured compatibility window;
- durable events and rebuildable projections cover capture, metadata, links,
  archive, restore, verification, search, and Activity; and
- deterministic `evidence-integrity@1.0.0` verifies source presence, containment,
  checksum, provenance, locators, and broken references without deciding whether a
  claim is true.

The dossier defines Tier 1 domain/contract, Tier 2 platform-integration, and Tier 3
experience/performance evidence. It also records a required amendment to
Specification 01: Evidence is not restricted to an objectively factual artifact;
factual records, observations, testimony, derived analysis, and external
references are allowed when classification and provenance are explicit.

No Route 03 production code changed in this pass.

#### Acceptance amendment — 2026-07-29

The Route 03 dossier is Accepted. ADR-001 records the constitutional decision, and
Specification 01 now defines Evidence as a provenance-bearing artifact that
supports, challenges, or contextualizes a claim. Classification is explicit;
source payloads are immutable or versioned; lifecycle, review, integrity, index,
and relationship state remain separate; and archive/restore is the normal removal
workflow.

This acceptance authorizes Pass 2A as the next implementation boundary: canonical
OpenAPI contracts, the ordered compatibility migration, legacy audit reporting,
and feature flags. It does not claim those changes are implemented.

### Route 03 Pass 2A execution report — contracts and schema

Status: **Implemented and verified**

Ordered SQLite migration 6, `evidence_contracts_and_legacy_backfill`, establishes
the governed Evidence persistence foundation without rewriting prior migrations:

- Evidence now stores explicit classification, lifecycle, review, optimistic
  version, and archive metadata;
- `evidence_sources` stores immutable source-version identity, structured SHA-256,
  managed path, inline/external/repository provenance, and producer metadata;
- `evidence_ingests` defines the persisted Pass 2B saga states without enabling
  file ingestion;
- `evidence_source_locators` defines versioned Whole Artifact, text, page,
  timestamp, image-region, repository-path, and JSON-pointer locators;
- `evidence_migration_audit` records ownership, missing-source, and checksum
  compatibility findings; and
- database-backed rollout flags enable canonical contracts while leaving source
  writes, recoverable ingestion, and the detail route disabled.

Legacy backfill preserves `source`, `content`, `notes`, `story_id`, physical
`project_id`, existing vault paths, and Story links. It creates one conservative
source version per legacy row, infers only bounded source kind/classification
facts, recovers SHA-256 only from an exact legacy checksum note, and reports
unassigned or ambiguous rows rather than inventing provenance or Workspace
ownership.

The canonical OpenAPI Evidence create contract now requires `workspaceId`.
`projectId` remains a deprecated compatibility alias for reads and updates.
Classification, lifecycle, review, source, ingest, locator, migration-audit, and
feature-flag schemas are generated into the React client and Zod libraries.
Evidence list filters accept canonical Workspace and governed-state dimensions.

Quick Capture, manual/file Evidence capture, and repository snapshot capture now
select or require a Workspace. The API rejects unassigned creation and mismatched
simultaneous `workspaceId`/`projectId` values. Existing current-state source fields
remain operational while the source-version write flag is disabled.

The executable `pnpm audit:evidence-migration` command reports selected-Vault
Evidence/source counts, unresolved migration findings, and rollout flags. The
controlled migration report is recorded at
`Docs/System-Design-Book/evidence/evidence-migration-audit-2026-07-29.md`.

Pass 2A does not implement staged file transfer, promotion, compensation,
reconciliation, archive/restore, locator endpoints, source-version endpoints, or
Evidence Integrity. Those remain gated to Passes 2B, 2C, and 3B.

Verification completed with OpenAPI regeneration, repository typecheck, production
builds, the executable audit reporter on a disposable Vault, Markdown whitespace
validation, and all 17 Vitest assertions passing across migration, API integration,
and capture utility suites.

### Route 03 Pass 2B execution report — recoverable file ingestion

Status: **Implemented and verified**

Desktop managed-file capture no longer transfers complete `ArrayBuffer` payloads
through the renderer/IPC boundary. Electron preload derives an authorized source
path with `webUtils.getPathForFile`; Electron main streams that file into
`evidence/.staging`, enforces the configured 100 MiB ceiling, calculates SHA-256
during the stream, and atomically promotes it to a unique final Vault-relative
path.

The API now coordinates a persisted, idempotent ingest saga:

```text
Staged → MetadataCommitted → Completed
                      ↘ Failed
```

Migration 7 persists the safe capture payload needed after restart and enables
`evidence.recoverable-ingest`. The saga reserves an idempotency key, records
structured size/checksum/path metadata, atomically creates `CapturePending`
Evidence plus immutable source version 1 and `EvidenceCaptureRequested`, then
activates Evidence and appends `EvidenceCaptured` only after filesystem promotion.
New desktop captures record `DesktopFileImport` provenance and no longer embed
checksums in notes.

Startup reconciliation examines both persisted state and managed-file presence.
It resumes staged metadata, retries pre-rename promotion, finalizes a file already
renamed before a crash, compensates incomplete staging, and records missing bytes
as explicit `EvidenceIngestFailed` state. Duplicate reservation, metadata
completion, and finalization are idempotent; a reused key with different input is
rejected.

Failure tests cover before/during streaming, before/after atomic rename,
pre-metadata compensation, metadata transaction rollback, missing-file recovery,
and duplicate commands. Evidence is recorded in
`Docs/System-Design-Book/evidence/evidence-ingest-recovery-2026-07-29.md`.

Verification completed with Electron module syntax checks, regenerated OpenAPI
React/Zod clients, repository typecheck, production builds, Markdown whitespace
validation, and all 25 Vitest assertions passing across migration, API integration,
filesystem ingestion, symlink containment, and capture utility suites.

Pass 2B does not change the separately bounded data-URL preview path, implement
source/locator read endpoints, or add Evidence archive/restore and optimistic
metadata commands. Those remain Pass 2C/3A work.

### Route 03 Pass 2C execution report — governed domain operations

Status: **Implemented and verified**

Ordered migration 8, `governed_evidence_operations`, extends canonical
Evidence-to-Story relationships with typed role, relevance, optional notes, and
optional source locator. It also replaces the Evidence FTS triggers with a
lifecycle-aware, rebuildable projection: active Evidence is searchable, archive
removes it transactionally, and restore indexes it again.

Canonical Evidence metadata updates now require `expectedVersion`, increment the
aggregate version, and reject stale writers with `409`. The patch contract permits
metadata and review changes but cannot mutate immutable source payloads, Workspace
ownership, or the deprecated singular Story field. Archived Evidence is read-only
until restored.

Archive and restore are explicit, reversible, version-guarded commands.
Normal-flow hard deletion is deprecated and returns `409`; no new
`EvidenceDeleted` events are produced. Source versions have a canonical ordered
read endpoint. Story relationships have Evidence-owned list, link, and unlink
contracts that reject cross-Workspace links and archived aggregates. The legacy
Story-side adapter now applies the same Evidence invariant and event policy.

Metadata, review, link, unlink, archive, and restore operations append durable
Evidence events in the same transaction as authoritative changes. The existing
Activity consumer processes them through its persisted replay checkpoint and
`source_event_id` uniqueness, while search remains a derived SQLite projection
that migration 8 can rebuild from authoritative rows.

The Evidence screen no longer edits Workspace ownership or the deprecated
singular `storyId`; it invokes the generated typed Story-link command and limits
choices to the owning Workspace. Full relationship management, source provenance,
locator authoring, and archive/restore experience remain part of Pass 3A.

Verification completed with OpenAPI validation and React/Zod regeneration,
repository typecheck, migration/search assertions, and all 27 Vitest assertions
passing. The controlled report is
`Docs/System-Design-Book/evidence/evidence-governed-operations-2026-07-29.md`.

Pass 2C does not implement arbitrary source-version writes, locator authoring,
preview streaming, the Evidence inspector route, or Evidence Integrity. These
remain Passes 3A and 3B.

## 2B. Proposed Phase III — C³ Canon and Knowledge Intelligence

Status: **Proposed future architecture — not implemented and not yet binding**

The C³ Canon will define the official product vocabulary, relationship semantics,
interaction grammar, and cross-module protocol. It complements the Engineering
Constitution: the Constitution governs architecture; the Canon governs the language
through which users, contracts, domains, and interfaces express that architecture.

### Proposed ubiquitous language

| Term                | Canonical meaning                                                                                               | Important boundary                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Vault               | Highest local container for an isolated engineering ecosystem                                                   | Not a synonym for a Workspace, database, or collection                            |
| Workspace           | Operating context for one focused initiative                                                                    | New business content is Workspace-scoped by default                               |
| Repository          | User-approved source-code repository associated with a Workspace                                                | Analysis is read-only and never executes repository code                          |
| Evidence            | Provenance-bearing artifact supporting or challenging a claim                                                   | May be factual, observational, subjective, or derived; classification is explicit |
| Knowledge           | Reviewed, reusable understanding expressed through source-backed claims                                         | Not a synonym for documents, files, or unreviewed AI output                       |
| Story               | Structured narrative using Evidence and Knowledge                                                               | Produces Publications without replacing Knowledge truth                           |
| Campaign            | Communication objective coordinating Stories and Publications                                                   | Does not own or duplicate Story or Publication content                            |
| Publication         | Governed, versioned, channel-neutral content package prepared for distribution                                  | Proposed replacement for Output as the canonical product term                     |
| Channel             | First-class destination contract through which a Publication may be deployed                                    | Examples include LinkedIn, Website, Newsletter, Internal Wiki, and File Export    |
| Channel Connection  | Configured Vault- or Workspace-scoped endpoint for one Channel                                                  | Credentials remain in OS-secure storage and never enter events or exports         |
| Publication Variant | Channel-specific adaptation of one Publication version                                                          | May diverge editorially without replacing its source Publication                  |
| Rendition           | Immutable generated artifact such as PDF, Markdown, HTML, DOCX, or JSON                                         | Records generator version, checksum, source watermark, and vault-relative path    |
| Deployment          | Durable scheduled or attempted delivery of a Publication version, Variant, or Rendition to a Channel Connection | Owns delivery status, attempts, idempotency, external identity, and errors        |
| Pipeline            | Operational projection through which Publications and Deployments progress                                      | Not a generic lifecycle or authoritative aggregate                                |
| Domain Event        | Durable, typed fact that something occurred                                                                     | Authoritative input to projections and automation                                 |
| Activity            | User-facing projection derived from domain events                                                               | Not an event source of truth                                                      |
| Snapshot            | Immutable observation of an entity at a point in time                                                           | Includes source and calculation provenance                                        |
| Health              | Explainable derived assessment defined by an eligible domain                                                    | Not automatically applicable to every object                                      |
| DNA                 | Structured identity profile defined only for domains that require it                                            | Not universal metadata inherited by every row                                     |
| Intelligence        | Versioned, derived insight produced by an EIE capability                                                        | Never silently mutates authoritative domain facts                                 |

Legacy physical names such as `projects` and `project_id` remain documented
compatibility debt. They do not create product-language synonyms for Workspace.

### Proposed Canon rules and adaptations

- Business content belongs to a Workspace by default. Vault-scoped concepts such
  as global settings, plugins, backups, and integrity require explicit definitions.
- Entity classes use appropriate identity envelopes. Aggregates, child records,
  relationships, events, projections, Intelligence results, and blobs do not all
  receive meaningless universal fields.
- Every stateful aggregate defines and tests its own lifecycle. Shared state names
  retain consistent meanings, but a universal lifecycle is prohibited.
- Metadata and UI capabilities are compositional. Health, DNA, attachments,
  Inspector sections, and collection views appear only where meaningful.
- Canonical typed relationship verbs include `SUPPORTS`, `REFERENCES`, `INCLUDES`,
  `OWNS`, `PRODUCED`, and `PRODUCES`. Cardinality, direction, deletion behavior,
  Workspace scope, and inverse projection must be defined before use.
- Commands and queries use explicit English names such as
  `linkEvidenceToStory` and `getEvidenceSupportingStory`; ambiguous generic methods
  are avoided.
- Every computed value must explain why it exists and identify its evidence,
  capability version, input watermark, and classification.
- Time is first-class: creation, modification, review, publication, calculation,
  invalidation, and supersession are modeled where applicable.

### Proposed interaction grammar

- **Intelligence Cards** become the primary presentation contract for Health
  changes, risks, opportunities, integrity findings, relationship suggestions, and
  recommendations. Cards expose subject, explanation, sources, classification,
  confidence when calibrated, calculation time, and available actions.
- **Inspector** and **Toolbar** become shared component patterns, not mandatory
  identical contents. Screens expose only applicable sections and actions.
- Collections use a shared view contract but implement only useful, tested views:
  for example Evidence may use list/table/gallery, Activity uses timeline, and
  relationship exploration uses graph.
- Explainability, accessibility, performance, and color-as-state remain mandatory
  design constraints.

### Platform runtime boundary

No second all-purpose “C³ Engine” is introduced. Coordination belongs to the
proposed C³ Platform Runtime:

```text
Domain command
    ↓
Authoritative write + durable event
    ↓
C³ Platform Runtime
    ├── updates projections and search
    ├── schedules bounded jobs
    ├── invokes Engineering Intelligence Engine capabilities
    └── dispatches authorized plugin subscriptions
```

The Platform Runtime coordinates work; domains own truth and lifecycle rules; the
single Engineering Intelligence Engine derives insight.

### Proposed constitutional amendment — Publications and Channels

Status: **Proposed direction; Canon terminology approved; implementation not
authorized**

The following vocabulary is non-negotiable for the target architecture:

- **Publication** is the canonical noun for governed distributable content.
- **Channel** is a first-class Canon destination object.
- **Deploy** is the primary user action for sending an approved Publication through
  a Channel.
- **Export** is a Platform Service action that generates Renditions.

The target model is:

```text
Story
  └── produces → Publication
                    ├── immutable Publication Versions
                    ├── Channel-specific Publication Variants
                    ├── generated Renditions
                    └── durable Deployments
                              └── target → Channel Connection → Channel
```

#### Canon definitions

**Publication** is a permanent, Workspace-owned, channel-neutral content package
derived from a primary Story and optionally associated with Campaigns, supporting
Evidence, Knowledge, Media, CTA, brand metadata, and SEO metadata. Publication
edits never overwrite Story content.

**Channel** defines destination semantics and capabilities: supported formats,
character/media constraints, required metadata, scheduling, preview, delivery,
update, and retraction support.

**Channel Connection** represents a configured destination such as a specific
company page, website, newsletter, wiki, or export location. Provider credentials
MUST remain in operating-system secure storage and MUST NOT appear in SQLite event
payloads, logs, Intelligence results, backups, or exports.

**Publication Variant** is an editable, channel-specific adaptation of one
Publication version.

**Rendition** is an immutable generated file with Publication/Variant provenance,
format, generator version, checksum, source watermark, generation time, and
vault-relative path. PDF and Markdown are formats delivered through the File Export
Channel; they are not themselves Channels.

**Deployment** records one planned, scheduled, attempted, completed, failed, or
cancelled delivery to a Channel Connection. It owns idempotency, validation,
attempt history, external identifiers, error classification, and destination
capability state.

#### Separate lifecycles

A Publication does not receive one authoritative `Published` state because
independent Channel Deployments may have different outcomes.

Proposed Publication lifecycle:

```text
Draft → Review → Approved → Superseded → Archived
```

Approved Publication versions are immutable. Revisions create new versions.

Proposed Deployment lifecycle:

```text
Planned → Validating → Ready → Scheduled → Deploying
                                      └──→ Succeeded | Failed | Cancelled
```

Retraction is optional and Channel-dependent:

```text
RetractionRequested → Retracted
```

“Rollback” MUST NOT be promised where a destination cannot restore a prior external
state. The UI MAY derive `Not deployed`, `Scheduled`, `Partially deployed`,
`Fully deployed`, `Deployment failures`, and `Retracted` summaries from Deployment
records.

#### Publications route

The future primary route and navigation noun is **Publications**:

```text
/publications
```

Mission:

> Govern, validate, schedule, and deploy everything approved to leave a Workspace.

The primary action is **Deploy Publication**. Draft, Review, Approved, Scheduled,
Deploying, Deployed, Failed, and Archived route sections are filtered projections
over Publication and Deployment state rather than one universal status enum.

An Exports surface MAY remain as Rendition history or a generated-artifact browser,
but Export does not own the delivery domain.

#### Service and Intelligence boundaries

Platform Services:

- Publication Service
- Export Service
- Channel Adapter Service
- Deployment/Job Service
- Validation Service

The single EIE may provide Publication Readiness, Channel Fit, Evidence
Traceability, Brand Conformance, Schedule Risk, and Deployment Recommendations.
The EIE advises and explains; it never performs external deployment.

#### Relationships and feedback

- A Publication belongs to exactly one Workspace.
- A Publication initially has one primary Story and may cite additional Stories,
  Evidence, and Knowledge.
- A Story may produce many Publications.
- A Campaign may coordinate many Publications; Campaign membership does not own
  Publication content.
- A Publication may target many Channels through independent Deployments.
- Deployment results may become Evidence and Campaign measurements.

#### Current Output compatibility

The existing `story_outputs` table and Story Output API/UI remain current
compatibility behavior. They contain channel- or format-oriented records but do not
implement Publication identity, versions, Channels, Connections, Variants,
Renditions, Deployment jobs, attempt history, idempotency, or external identity.

`Output` is therefore deprecated target terminology but remains valid when
describing the current implementation. It MUST NOT be silently renamed or treated
as a completed Publication migration.

Required compatibility sequence:

1. amend Specification 01 Domain Model;
2. define Publication, Channel, Connection, Variant, Rendition, and Deployment
   persistence and event contracts;
3. preserve `story_outputs` during a compatibility window;
4. report existing Outputs and infer Channel/format only when unambiguous;
5. create provisional Publications or offer user-assisted grouping while
   preserving original Output identity;
6. move consumers to Publication contracts; and
7. remove Output compatibility only after upgrade and recovery evidence exists.

No automatic migration may assume multiple existing Outputs belong to one
Publication.

#### Implementation gate

Implementation remains deferred until all of the following are accepted:

- change-controlled Domain Model amendment;
- Platform Services and job specifications;
- Publication/Deployment event contracts;
- Channel adapter and credential security model;
- idempotency, retry, cancellation, and retraction semantics;
- Output compatibility and recovery migration;
- RDF v1 route dossier and conformance gates; and
- performance budgets for validation, generation, queue processing, and deployment.

This amendment changes target terminology and architecture only. It does not change
the current executable route or authorize external publishing.

### Accepted future route — Publishing Calendar and AFI™

Status: **Accepted target architecture; not implemented**

The Home action **See Scheduled Content** launches the canonical future route:

```text
Home → See Scheduled Content → /calendar → Publishing Calendar
```

The **Adaptive Floating Interface (AFI™)** is non-negotiable and Accepted as the
primary interaction and navigation system inside `/calendar`. The route is a
minimal-chrome operational canvas for coordinating scheduled Publication
Deployments, Campaign milestones, Publication review deadlines, and later
explicitly modelled productivity objects.

AFI is an experience adapter and never owns authoritative business state. It
invokes the same validated domain commands available to tests, the Command Menu,
keyboard operation, drag interactions, and future plugins.

#### Scheduling ownership correction

The Calendar does not own schedule facts, and scheduling MUST NOT be placed on one
generic Output or directly on a Publication:

| Fact                                                   | Authoritative owner        |
| ------------------------------------------------------ | -------------------------- |
| Publication content and versions                       | Publication                |
| Destination-specific adaptation                        | Publication Variant        |
| Generated file                                         | Rendition                  |
| Destination capabilities                               | Channel                    |
| Configured destination                                 | Channel Connection         |
| Planned delivery time, timezone, attempts, and outcome | Deployment                 |
| Campaign milestones                                    | Campaign                   |
| Calendar range, conflict, readiness, and overdue views | Rebuildable projection     |
| AFI sensitivity, ranking, and calibration              | Local interaction settings |

One Publication may have independent Deployments to several Channels at different
times. `ScheduleDeployment`, `RescheduleDeployment`, and
`UnscheduleDeployment` are therefore the canonical scheduling commands. Campaign
milestone changes remain Campaign commands. Channels are first-class and cannot be
reduced to format strings or AFI menu categories.

Existing Story Outputs may appear in a compatibility view until the approved
Publication migration is complete. They MUST be labelled as legacy current-state
objects and MUST NOT define the permanent Calendar schedule model.

#### AFI interaction contract

The directional grammar remains stable:

- left: operations;
- right: context and productivity;
- up: views; and
- down: temporal navigation.

AFI MAY adapt command ordering, sensitivity, transition speed, default view, and
contextual visibility using local, explainable frequency, recency, and context
signals. It MUST NOT silently change directional meanings, domain facts,
lifecycle rules, schedule dates, publication state, confirmation requirements, or
provider permissions.

Unrecognised gestures perform no command. Ambiguous consequential gestures require
explicit selection. No swipe alone may publish, delete, archive, unschedule, or
perform another irreversible action. Failed writes restore the prior projection,
preserve the authoritative state, and explain retry or recovery. Learning,
sensitivity, and ranking MUST be inspectable, resettable, freezable, and locally
stored.

#### Owner-operated RDF amendment

Because the current product is single-user and owner-operated, universal first-use
familiarity and conventional toolbar discoverability are not route acceptance
requirements. Owner-measured mastery, speed, reliability, and satisfaction are
valid acceptance evidence.

This exception does not waive deterministic command access, semantic labels,
visible keyboard focus, reduced-motion handling, testability, recoverability, or
data safety. Every authoritative command MUST remain invokable through AFI click
selection, keyboard operation, or the Command Menu. No essential mutation may
exist only behind an unreliable gesture.

#### Scope and sequencing

AFI prototyping MAY begin in `artifacts/mockup-sandbox` without domain writes.
Authoritative scheduling MUST wait for accepted Publication, Deployment, Channel,
Connection, lifecycle, event, idempotency, concurrency, and compatibility
contracts.

Execution order:

1. create and accept the Calendar RDF dossier plus UI/UX amendment;
2. prototype conventional controls, static AFI, and adaptive AFI without writes;
3. measure mouse and trackpad calibration on named owner hardware;
4. complete Publication and Deployment foundations;
5. connect safe Calendar queries and projections;
6. connect validated schedule and Campaign commands;
7. introduce deterministic, local, explainable AFI adaptation; and
8. consider touch, Tasks, focus blocks, Pomodoro, time tracking, Linda, The Butler,
   natural-language commands, and AI recommendations only after their owning
   contracts are accepted.

Initial prototype targets include at least 95% gesture recognition after
calibration, under 1% accidental command activation, zero accidental schedule
mutations, immediate failed-gesture recovery, and faster common-command access than
the conventional baseline. These remain proposed measurement targets until trials
name hardware, input device, sample size, reduced-motion setting, and comparison
mode.

The route remains unimplemented: there is currently no `/calendar` route, Calendar
API, schedule schema, Deployment aggregate, or AFI component in the production
application. This section records accepted future architecture and does not
authorize external deployment.

### Proposed C³ Protocol

The future C³ Protocol is a registry of executable cross-module contracts, not a
competing architecture document. It will cover:

- entity and identity envelopes;
- typed relationship registry;
- domain-event envelopes and compatibility;
- Intelligence-result envelopes;
- file, blob, import, and export formats;
- API errors and version negotiation;
- plugin permissions and extension points; and
- schema evolution and conformance tests.

Contracts should be machine-verifiable through TypeScript, OpenAPI, JSON Schema,
migrations, and automated conformance tests wherever practical.

### Future feature — Route 04 Knowledge Base

Status: **Future feature; current CRUD seed exists**

One-sentence target:

> The Knowledge Base is the Workspace's institutional memory, transforming
> provenance-bearing Evidence into reviewed, reusable understanding.

Canonical transformation:

```text
Source artifact → Evidence → Claim → Knowledge → Story → Publication
```

“Knowledge Asset” is not introduced as a competing domain object. Source files,
audits, terminal captures, screenshots, PDFs, diagrams, videos, and AI
conversations enter through Evidence or Media with explicit provenance and
classification.

#### Current-version integration

The current `/knowledge` and `/knowledge/:id` routes provide:

- Workspace-compatible SQLite storage through the physical `project_id`;
- list, title search, category filtering, create, read, update, and hard delete;
- shared TipTap HTML authoring with explicit save feedback;
- tags, category, and a lightweight `linkedPageIds` array;
- global FTS5 indexing of title, content, and tags; and
- Story-to-Knowledge linking through the Story Engine graph.

This is an implementation seed, not Route 04 completion. Current gaps include
mandatory canonical Workspace ownership, archived-Workspace mutation guards,
archive/restore, a Knowledge lifecycle, version history, reviews, claim-level
citations, typed Knowledge relationships, backlinks, Evidence provenance,
authority/freshness state, durable Knowledge events, and EIE capabilities.

#### Future Route 04 domain model

A Knowledge page will contain reviewed claims rather than merely a block of text.
Each claim may cite one or more Evidence records with a precise locator such as a
PDF page, text range, repository snapshot, image region, or media timestamp.
Unsupported, conflicting, stale, and superseded claims remain visible rather than
being silently resolved.

Proposed Knowledge lifecycle:

```text
Idea → Research → Draft → Verified → Referenced → Canonical → Archived
```

- `Verified` means reviewed against cited Evidence.
- `Referenced` is derived from actual downstream usage.
- `Canonical` represents an accepted organizational position and requires an
  owner, review date, and sufficient supporting Evidence.
- Archived or superseded Knowledge remains historically accessible.

Initial Route 04 scope should include Workspace ownership, collections, rich
authoring, claims and citations, Evidence/Story/Knowledge relationships, backlinks,
full-text search, version checkpoints, review state, archive/restore, provenance,
and a capability-driven Inspector. Animated graphs and AI querying are not initial
route requirements.

#### Future Knowledge Intelligence capabilities

These remain capabilities of the single EIE:

| Capability              | Future purpose                                                   |
| ----------------------- | ---------------------------------------------------------------- |
| Knowledge Query         | Answer scoped questions with claim-level citations or abstain    |
| Freshness               | Detect when supporting Evidence or repositories have changed     |
| Coverage and gaps       | Identify missing or weakly documented areas using explicit rules |
| Contradiction detection | Surface conflicting claims for human review                      |
| Duplicate detection     | Suggest overlapping pages without automatically merging them     |
| Relationship discovery  | Suggest typed connections for approval                           |
| Recommendations         | Suggest related Knowledge, Evidence, Stories, and review actions |

The Knowledge Query experience is information-first, not a general chatbot. Every
answer identifies whether it is directly stated, deterministically derived,
summarized, inferred, conflicting, or unsupported. It must cite authorized sources
or abstain. “No hallucination” is a goal, not a guarantee.

Initially, trust uses categorical states such as `Unsupported`,
`PartiallySupported`, `Supported`, `Corroborated`, `Conflicting`, `Stale`, and
`HumanVerified`. Numeric confidence is deferred until it can be calibrated and
validated.

#### Future Knowledge Evolution Explorer

The Explorer is an experience layer over four explicitly different models:

1. semantic relationships between concepts and entities;
2. version history showing record changes;
3. lineage showing origin, split, merge, and supersession; and
4. a time-based projection of what was known at a selected point.

Expandable graphs, timeline playback, animated traversal, and presentation mode are
future enhancements after the underlying version, lineage, and relationship
semantics are implemented and benchmarked.

#### Automation and human authority

Classification, relationship discovery, canonical promotion, contradiction
resolution, and cross-Workspace reuse begin as transparent suggestions. A human
reviews, edits, approves, rejects, or defers them. Cross-Workspace discovery is
opt-in and must preserve Vault and Workspace authorization boundaries.

#### Dependencies and sequencing

Route 04 depends on Route 03 defining Evidence identity, integrity, versioning,
source locators, capture provenance, Workspace ownership, and immutable/versioned
source behavior. It also depends on the corrective platform passes covering
archived-Workspace guards, canonical Workspace identifiers, durable events, and
remaining Filesystem and Platform Services specifications.

Therefore this future vision does not authorize Route 04 implementation or bypass
the Route 03 gate.

## 2C. Accepted Route Discovery Framework v1

`Docs/Route-Discovery-Framework.md` is the governing route-design standard.

The RDF establishes that a route is an experience adapter over domain and platform
capabilities, not the owner of business rules, data, algorithms, or Intelligence.
Major routes advance from user need through outcome, domain capability, executable
contracts, experience, evidence, and acceptance.

The accepted framework provides:

- Tier 1 identity requirements for every user-facing route;
- Tier 2 workflow, lifecycle, event, recovery, permission, and migration
  requirements for stateful routes;
- Tier 3 provenance, explainability, human authority, AI boundaries, and
  performance requirements for Intelligence-bearing routes;
- maturity levels L0 Proposed, L1 Defined, L2 Functional, L3 Integrated,
  L4 Intelligence-assisted, and L5 Operationally mature;
- blocking conformance gates for correctness, contracts, traceability,
  accessibility, recovery, performance, security, observability, and Intelligence;
- separate definitions for Domain Health, route telemetry, data quality, and
  capability conformance;
- typed route relationships with feedback loops rather than a mandatory linear
  pipeline; and
- a standardized Route DNA dossier for major routes.

Weighted Route Intelligence scoring and “self-improving” maturity are rejected.
AI readiness and automation are applicable capabilities, not universal measures of
route quality. Route DNA remains repository-controlled design metadata rather than
duplicated runtime state.

All future route plans and material revisions to implemented routes MUST use RDF v1.
Existing Route 01 and Route 02 plans remain valid but SHOULD receive RDF v1 dossiers
when next materially revised. Route 03 must pass the applicable Tier 1–3 gates
before its implementation pause is lifted.

### Proposed future route — Templates

Status: **Architecturally approved proposal; implementation not authorized**

`Docs/Route-Templates-proposal.md` is the RDF v1 dossier for evolving the current
Templates CRUD seed into a governed Blueprint Library.

The accepted direction defines a Template as a versioned, governed blueprint that
produces a validated creation plan for one supported target capability. Templates
encode expertise but never own or bypass the domains of the objects they create.

The proposal requires:

- a Domain Model amendment before implementation;
- immutable Template versions and a
  `Draft → Review → Approved → Active → Deprecated → Archived` lifecycle;
- declared, typed, deterministic variables with no arbitrary code execution;
- preview and target-domain validation before application;
- exact Template-version application provenance;
- separate semantics for version, derivation, replacement, and application
  lineage;
- deterministic conformance and similarity before probabilistic assistance; and
- human approval for official promotion, replacement, and multi-object execution.

Initial implementation is deliberately limited to a Template editor, scope,
governance, versions, deterministic preview, one target—preferably Story—validated
application, provenance, durable events, archive/restore, and tests. Workspace
blueprints, workflow orchestration, adaptive behavior, AI generation, visual
composition, and marketplace functionality are deferred.

The current `/templates` route remains an L2 catalogue seed, while the proposed
expanded route is L1 Defined. It remains sequenced after NB3RP Pass 3, Route 03
Evidence provenance, and acceptance of its target-domain Template contract.

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

| Layer        | Current choice                                          |
| ------------ | ------------------------------------------------------- |
| Workspace    | pnpm workspaces                                         |
| Language     | TypeScript 5.9                                          |
| Frontend     | React 19, Vite 7, Wouter, TanStack Query                |
| UI           | Tailwind CSS 4, Radix primitives, Lucide, Framer Motion |
| API          | Express 5                                               |
| Contract     | OpenAPI 3 + Orval code generation                       |
| Validation   | Generated Zod schemas                                   |
| Desktop      | Electron with isolated preload IPC                      |
| Database     | SQLite via `node:sqlite`, WAL mode                      |
| File storage | Portable vault under the user's Documents directory     |
| Logging      | Pino / pino-http                                        |
| API bundle   | esbuild, ESM output                                     |

### V1 architecture decision

V1 is committed to Electron + SQLite + filesystem vault. The local Express service is an internal adapter, bound to loopback by the desktop lifecycle. HTML is the canonical stored authoring format for TipTap content; file references are vault-relative for portability.

## 4. Repository map

| Path                        | Responsibility                                          | Editing rule                                                                              |
| --------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `artifacts/ntech-c3/`       | Primary React application                               | Product UI and page behavior live here                                                    |
| `artifacts/api-server/`     | Express API                                             | Routes must validate through generated Zod schemas                                        |
| `artifacts/mockup-sandbox/` | Separate UI/mockup sandbox                              | Not the production app                                                                    |
| `lib/api-spec/openapi.yaml` | Canonical API contract                                  | Change this before generated clients/schemas                                              |
| `lib/api-client-react/`     | Browser API client and generated hooks                  | Do not hand-edit generated files                                                          |
| `lib/api-zod/`              | Generated API validation schemas                        | Do not hand-edit generated files                                                          |
| `lib/db/src/index.ts`       | SQLite DDL, initialization, and vault access            | Current persistence truth                                                                 |
| `scripts/`                  | Workspace utility scripts/hooks                         | Keep operational scripts small and documented                                             |
| `Docs/`                     | Product context, refinement, active feature briefs      | Aspirational unless confirmed by code                                                     |
| `Docs/NTC3_UI-UX_Spec.md`   | Governing UI/UX contract reconciled to approved visuals | Implement against it; obtain approval only for listed open decisions or visual deviations |
| `wireframe.png`             | Approved Home/landing screen                            | Reproduce composition and hierarchy exactly                                               |
| `branding-brief.png`        | Approved N-Tech C³ brand guide                          | Use its identity, tokens, typography, voice, components, motion, and visual language      |
| `README.md`                 | Short runbook and architecture summary                  | Keep aligned with this index                                                              |
| `pnpm-workspace.yaml`       | Workspace catalog and supply-chain policy               | Do not disable `minimumReleaseAge`                                                        |

## 5. Implemented product surface

### Frontend routes

| Route                              | Module                 | Current capability                                                                                                                                             |
| ---------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`                       | Home                   | Approved branded landing composition with hero, Get Started actions, workspaces, activity, real metrics/focus, tips, and shortcuts                             |
| `/search`                          | Global Search          | Ranked FTS5 search across canonical entity types, including Workspaces                                                                                         |
| `/workspaces`                      | Workspace picker       | Search/filter, create, open, favorite, pin, duplicate, archive/restore, and manifest export                                                                    |
| `/workspaces/:id`                  | Workspace overview     | Scoped metrics, health breakdown, recent activity, current work, quick actions, and archive/corruption states                                                  |
| `/workspaces/:id/settings`         | Workspace settings     | Edit identity, current goal, repositories, tags, and initial Workspace DNA fields                                                                              |
| `/stories`                         | Global Story catalogue | Workspace/status/type/search filters and Workspace-required creation                                                                                           |
| `/workspaces/:workspaceId/stories` | Scoped Story catalogue | Stories belonging to one Workspace                                                                                                                             |
| `/stories/:id`                     | Story studio           | Overview, ordered outline, TipTap editor, Evidence, Assets, References, Outputs, Timeline, health inspector, lifecycle, version-safe save, and archive/restore |
| `/campaigns`                       | Campaigns              | List and create                                                                                                                                                |
| `/campaigns/:id`                   | Campaign detail        | Read, edit core fields, delete                                                                                                                                 |
| `/evidence`                        | Evidence Vault         | Workspace-scoped capture, type/search filter, recoverable import, preview, typed Story linking, and governed archive/restore API                               |
| `/knowledge`                       | Knowledge Base         | List/search and create                                                                                                                                         |
| `/knowledge/:id`                   | Knowledge detail       | Read and explicitly save TipTap HTML content; permanent delete remains compatibility debt                                                                      |
| `/assets`                          | Assets                 | List/filter and create URL/path metadata                                                                                                                       |
| `/templates`                       | Templates              | List/filter and create                                                                                                                                         |
| `/projects`, `/projects/:id`       | Compatibility          | Redirect old browser links to canonical Workspace routes                                                                                                       |
| `/settings`                        | Settings               | Presentational settings screen; no durable settings model                                                                                                      |

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

| Capability                         | Status                   | Evidence/current limitation                                                                                                                                                                                                                                |
| ---------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home landing                       | Partial                  | Approved wireframe composition, brand hero, six Get Started cards, workspaces, activity, live metrics/focus, and bottom strip exist; Calendar/Exports routes and production logo exports remain                                                            |
| Stories (Route 02)                 | Implemented              | Global/Workspace catalogues, mandatory Workspace ownership, guarded lifecycle, transactional outline, Draft-only Output creation, relationship graph, deterministic health, timeline, versions, optimistic concurrency, and archive/restore                |
| Story authoring                    | Implemented              | Shared TipTap editor with canonical HTML persistence, word/read-time derivation, version-safe explicit saves, and conflict rejection                                                                                                                       |
| Campaigns CRUD                     | Implemented              | Core records only; no timeline/tasks/metrics/outputs                                                                                                                                                                                                       |
| Evidence Vault governed operations | Partial                  | Workspace-owned capture, recoverable file ingestion, immutable source reads, optimistic metadata, typed Story links, archive/restore, previews, and lifecycle-aware search exist; inspector UX, locator authoring, preview streaming, and Integrity remain |
| Knowledge Base CRUD                | Partial                  | TipTap authoring and a stored linked-ID array exist; no rendered wiki graph/backlinks                                                                                                                                                                      |
| Assets                             | Partial                  | URL/path metadata catalog; no upload, processing, thumbnailing, or local asset storage                                                                                                                                                                     |
| Templates                          | Partial                  | Core records exist; no template application/export workflow                                                                                                                                                                                                |
| Workspaces (Route 01)              | Implemented              | Canonical picker, overview and settings routes; filtered list, initial DNA, scoped metrics/activity, health components, duplicate, archive/restore, integrity, manifest export, and old `/projects` redirects                                              |
| Legacy Projects                    | Deprecated compatibility | Physical table and API remain temporarily to preserve existing vaults and integrations                                                                                                                                                                     |
| Activity feed                      | Partial                  | Workspace creation projects a durable event through an idempotent consumer; remaining legacy writes are still direct and lossy                                                                                                                             |
| Rich text editor                   | Implemented              | Shared Story/Knowledge TipTap component stores HTML                                                                                                                                                                                                        |
| Quick capture                      | Implemented              | Global button, Cmd/Ctrl+K, and paste-to-TerminalOutput flow                                                                                                                                                                                                |
| Evidence file drop                 | Implemented              | Electron streams trusted paths through staged SHA-256 capture, atomic promotion, persisted recovery, and structured source provenance                                                                                                                      |
| Global search                      | Implemented              | Migration-backed FTS5 index, automatic triggers, ranked API/UI, and entity/project/status/date filters                                                                                                                                                     |
| Publishing Calendar/AFI            | Not implemented          | `/calendar`, Deployment scheduling, Calendar projections, and AFI remain future work; AFI is Accepted as the primary route interaction architecture                                                                                                        |
| Actionable queue                   | Not implemented          | No route, API, or schema                                                                                                                                                                                                                                   |
| Export pipeline                    | Partial                  | Desktop exports portable JSON plus human-readable Markdown; HTML/PDF/DOCX exporters remain                                                                                                                                                                 |
| Version history                    | Partial                  | Story checkpoints and timeline exist; Knowledge and most other entities store only current rows and timestamps                                                                                                                                             |
| Backup/restore                     | Implemented              | Desktop creates compressed portable vault archives; restore validates paths, preserves a recovery copy, and rolls back on copy failure                                                                                                                     |
| Repository integration             | Partial                  | Secure desktop folder selection captures branch, commit, package manager, frameworks, dependencies, TODOs, README, readiness, and optional project association                                                                                             |
| Repository Intelligence Engine     | Partial                  | Deterministic, fingerprinted snapshots become searchable `RepositoryAudit` evidence with per-project history counts and metric diffs; deeper dependency/security analysis remains                                                                          |
| Workspace health score             | Implemented              | Server calculates and explains recency, evidence, campaign, knowledge, and asset components with insufficient-data handling                                                                                                                                |
| Story health score                 | Implemented              | Deterministic weighted outline, Evidence, Knowledge, Asset, metadata, readability, and Output components with blockers                                                                                                                                     |
| Evidence/knowledge health scores   | Not implemented          | Workspace and Story health exist; standalone Evidence/Knowledge engines remain                                                                                                                                                                             |
| Local vault/filesystem             | Implemented              | SQLite database and documented vault directories initialize locally                                                                                                                                                                                        |
| Electron desktop shell             | Implemented              | Main/preload lifecycle, local API launch, static UI serving, secure file IPC                                                                                                                                                                               |
| Branded application shell          | Partial                  | Approved palette/typography, preserved checkered background, top bar, wireframe navigation, Quick Capture panel, and local SVG mark exist; compact/mobile drawer and final exported brand artwork remain                                                   |
| Plugin manager                     | Not implemented          | Architectural direction only                                                                                                                                                                                                                               |
| AI provider adapter                | Not implemented          | Future architecture only                                                                                                                                                                                                                                   |
| Authentication/multi-user          | Intentionally excluded   | v0.1 non-goal                                                                                                                                                                                                                                              |

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

Current state: implemented. Terminal paste uses `content`; dropped files use
isolated Electron IPC, bounded staging, structured SHA-256/source provenance,
atomic promotion, and restart reconciliation.

### Next implementation order

1. Execute Route 03 Pass 3A: Evidence explorer/inspector migration, provenance,
   recovery feedback, locators, and accessible archive/restore experience.
2. Execute Route 03 Pass 3B: deterministic Evidence Integrity, bounded verification
   jobs, invalidation, diagnostics, performance workloads, and Tier 1–3 evidence.
3. Execute Route 03 Pass 3C: preview streaming, compatibility-field retirement
   evidence, full route conformance, and release-readiness closure.

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

| Variable          | Used by              | Requirement                              |
| ----------------- | -------------------- | ---------------------------------------- |
| `PORT`            | API and Vite config  | Positive numeric port; required          |
| `BASE_PATH`       | frontend Vite config | Optional; defaults to `/`                |
| `NTC3_VAULT_PATH` | local database/API   | Optional development/test vault override |

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

### `Docs/Route-Discovery-Framework.md`

Accepted RDF v1 route-design and review standard. It defines tiered route dossiers,
architectural sequencing, maturity levels, conformance gates, measurement
boundaries, typed route relationships, Route DNA, and evidence required to advance
a route.

### `Docs/Route-Templates-proposal.md`

Architecturally approved RDF v1 proposal for a governed, versioned Template
Library. It defines the current implementation boundary, phased capability model,
safe variable resolution, target-domain validation, application provenance,
lineage, Intelligence boundaries, initial scope, and dependency sequence.

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
- `pnpm test` — 15 tests passed across migrations/FTS, Workspace and Story Engine lifecycles, invariant enforcement, durable-event projection, Intelligence provenance, API capture/filtered search, and frontend capture utilities.
- `pnpm run test:e2e` — 2 Playwright workflows passed for Workspace creation/detail/search, TipTap persistence, and evidence file ingestion.
- Electron Builder directory packaging — passed and produced an unsigned arm64 `.app` with bundled API/frontend resources.
- `git diff --check` — passed.

Frontend routes are lazy-loaded. The initial application chunk is about 316 kB before gzip; editor and syntax-highlighting code load separately only on authoring routes.
