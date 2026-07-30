# Route 05 — Campaigns: RDF v1 Dossier and Execution Plan

Status: **Accepted — L3 Integrated; Passes 1–3 complete**

RDF version: **1.0**

Owner: Campaign Domain / Product Architecture

Prepared: 2026-07-29

## Scope

This dossier governs `/campaigns` and `/campaigns/:id`. The route is an
experience adapter over the Campaign domain. It coordinates independently owned
Stories and, once their foundations exist, Publications. It does not own Story
content, Publication content, Channels, Deployments, Evidence truth, Knowledge
truth, scheduling jobs, or Intelligence algorithms.

## Route DNA

| Field              | Decision                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route ID           | `campaigns`                                                                                                                                                               |
| Paths              | `/campaigns`, `/campaigns/:id`                                                                                                                                            |
| Mission            | Turn engineering communication objectives into coherent, measurable initiatives.                                                                                          |
| User need          | Plan and steer a body of engineering communication toward one explicit outcome.                                                                                           |
| Required outcome   | A user can define a Campaign mission, coordinate Stories and milestones, inspect progress, and complete or archive the initiative without duplicating downstream content. |
| Domain owner       | Campaign                                                                                                                                                                  |
| Experience pattern | Library + Mission Control Studio                                                                                                                                          |
| Current maturity   | L3 Integrated — governed aggregate, Story portfolio, milestones, recovery, performance, and desktop conformance                                                           |
| Target maturity    | L3 Integrated before Campaign Intelligence                                                                                                                                |

## One-sentence definition

> A Campaign is a Workspace-owned engineering communication initiative that
> coordinates Stories and Publications toward an explicit objective and success
> definition.

A Campaign is not a generic marketing record, content container, Publication,
Channel, Deployment queue, or calendar. The user mental model is a **mission**.

## Primary workflow

```text
Select Workspace
  → create Campaign
  → define mission and success
  → add and sequence Stories
  → establish milestones
  → coordinate Publications when available
  → review progress and exceptions
  → complete or archive
```

Primary actions are limited to:

1. create or edit a Campaign mission;
2. add, remove, role, and sequence Stories;
3. create and update milestones;
4. transition, pause, complete, reopen, archive, or restore; and
5. inspect progress, blockers, Publications, Channels, and results when their
   owning contracts exist.

## Pre-Pass 1 implementation audit

The existing implementation is a useful seed, not a governed Campaign domain.

### Current data

The `campaigns` table stores:

- ID, title, objective, status;
- JSON `platforms`;
- optional `duration_weeks`;
- optional physical `project_id`; and
- created/updated timestamps.

Migration 4 introduced `story_campaigns` with Story/Campaign identity,
`is_primary`, and `linked_at`, and conservatively backfilled the older singular
`stories.campaign_id` relationship.

### Current API and experience

- `GET/POST /campaigns` and `GET/PATCH/DELETE /campaigns/{id}` provide generic
  CRUD.
- `/campaigns` lists every record and creates title/objective/status without
  requiring a Workspace.
- `/campaigns/:id` edits title/objective, changes status directly, and permanently
  deletes.
- Story Studio can link a Campaign through the generic Story relationship
  command, but Campaign Studio has no portfolio or backlink surface.
- FTS5 indexes title, objective, and `platforms`, including archived records.
- Campaign creation writes Activity directly; update, status, and delete lack
  atomic durable Campaign events.

### Confirmed gaps

- canonical Workspace ownership and archived-Workspace guards on creation;
- lifecycle transition rules and optimistic concurrency;
- mission, success definition, audience, owner, type, timeframe, review cadence,
  completion criteria, and strategy;
- archive/restore and version checkpoints;
- Campaign-side Story portfolio, ordering, roles, and backlinks;
- milestones;
- Publication membership and Channel strategy contracts;
- durable events, rebuildable Activity, active-only search, migration audit,
  recovery evidence, and route-specific tests; and
- deterministic progress/readiness definitions.

## Canonical ownership model

```text
Workspace
  └── owns → Campaign
                ├── coordinates → Stories
                ├── owns → Campaign Milestones
                ├── coordinates → Publications (future foundation)
                └── references → Channels (future strategy)

Story ──produces──▶ Publication
Publication ──deploys through──▶ Channel
Deployment ──produces results──▶ Campaign projections and Evidence
```

Ownership rules:

- Campaign owns its mission, strategy, lifecycle, milestones, membership edges,
  and completion record.
- Story owns narrative content, lifecycle, Evidence/Knowledge links, and Outputs
  during the current compatibility period.
- Publication owns distributable content, versions, Variants, and approval state.
- Channel owns destination capabilities.
- Deployment owns schedule, attempts, idempotency, external identity, and outcome.
- Evidence and Knowledge remain authoritative for proof and reusable
  understanding.
- The Engineering Intelligence Engine may derive Campaign insight but cannot
  silently change Campaign, Story, Publication, Channel, or Deployment facts.

## Campaign aggregate

Each Campaign has:

- stable ID and required Workspace ID;
- title, campaign type, mission statement, objective, success definition;
- audience and owner;
- lifecycle status and optional current execution phase;
- optional start/end dates and review cadence;
- completion criteria and optional completion note;
- communication strategy fields such as brand voice, publishing rhythm,
  engineering domain, tags, and visual identity references;
- target Story and Publication counts as planning facts, not achieved counts;
- optimistic version and created/updated/reviewed/completed/archived timestamps;
  and
- optional `archivedFromStatus` for reversible restoration.

Campaign types begin as:

`EngineeringPhilosophy`, `ProductDevelopment`, `Launch`, `Research`, `Education`,
`ThoughtLeadership`, `Community`, `CaseStudy`, `Recruitment`,
`BehindTheScenes`, `Conference`, `ReleaseNotes`, and `DeveloperDiary`.

The enum is change-controlled. Free-form tags remain available and do not mutate
the type vocabulary.

### Lifecycle

```text
Planning → Active ⇄ Paused → Completed → Archived
    └───────────────────────────────────────→ Archived
```

Rules:

- new Campaigns begin in `Planning`;
- `Active` requires a mission, success definition, owner, and at least one
  planned Story or explicit milestone;
- `Paused` preserves membership and progress and records a reason;
- `Completed` is a human decision requiring a completion note and an explicit
  assessment of the success definition;
- incomplete Stories, Publications, or Deployments do not silently prevent
  completion, but exceptions remain visible;
- `Completed` may be reopened to `Active` with human confirmation and a reason;
- `Archived` is read-only until restored and replaces normal hard deletion;
- restore returns to the recorded pre-archive status, defaulting conservatively to
  `Planning`; and
- lifecycle transitions require the expected aggregate version.

`Scheduled`, `Publishing`, `Published`, `Deploying`, and `Failed` are not Campaign
lifecycle states. They belong to Publication or Deployment and may appear only as
derived Campaign summaries.

### Execution phase

An optional phase describes the initiative's current focus without replacing the
lifecycle:

`Planning`, `Research`, `ContentBuilding`, `Review`, `Distribution`, `Monitoring`.

Phase changes are explicit Campaign commands. `Distribution` does not mean that a
Publication was deployed, and `Monitoring` does not invent analytics.

## Campaign strategy

The product brief calls this Campaign DNA. In the executable model it is a
Campaign-specific strategy, not a universal metadata envelope.

It may include:

- mission statement and success definition;
- target audience and owner;
- brand voice and engineering domain;
- publishing rhythm and review cadence;
- completion criteria and visual identity references; and
- Channel strategy once first-class Channels exist.

Campaign strategy may provide defaults or recommendations to new Stories and
Publications. It never silently overwrites existing Story or Publication facts.
Applying a default is an explicit, reviewable command.

## Story membership

`story_campaigns` is the authoritative relationship table during Route 05.

Each edge records:

- Campaign ID and Story ID;
- role: `Anchor`, `Supporting`, `FollowUp`, or `Reference`;
- position;
- optional contribution note;
- creator and linked timestamp; and
- whether it is the primary Campaign relationship for that Story.

Invariants:

- Campaign and Story belong to the same active Workspace;
- a Story may belong to multiple Campaigns but has at most one primary Campaign;
- link removal deletes only the edge;
- membership does not own or mutate Story lifecycle;
- archived Campaigns cannot mutate membership;
- archived Stories remain historically visible and cannot be newly linked; and
- Story counts and pipeline columns are projections from Story state.

## Milestones

A Campaign milestone is an ordered, versioned planning object owned by one
Campaign:

- stable ID, Campaign ID, title, description, position;
- optional target date;
- status: `Planned`, `InProgress`, `Completed`, or `Skipped`;
- completion/skip note; and
- optimistic version and timestamps.

Milestones do not schedule Publication delivery. A milestone may reference a
future Publication or Deployment through an explicit edge, but Deployment remains
the owner of delivery time, timezone, attempts, and outcome.

## Publications and Channels

The Canon terms **Publications** and **Channels** are non-negotiable.

- A Campaign may coordinate many Publications through membership edges.
- Campaign membership never owns or duplicates Publication content.
- A Campaign may reference first-class Channel IDs as strategy.
- A Campaign never stores a Channel as an arbitrary platform or format string.
- PDF, Markdown, HTML, and DOCX are Rendition formats, not Channels.
- Scheduling and delivery are Deployment commands, not Campaign commands.

The existing `platforms` JSON field is compatibility data only. Migration must not
turn strings into Channels, Channel Connections, Publications, or Deployments
without accepted destination contracts and user confirmation.

The existing `story_outputs` table remains current Output compatibility. It must
not be silently renamed or treated as a completed Publication migration.

Publication and Channel integration is deferred until the separate Domain Model,
Platform Services, security, event, idempotency, compatibility, and route gates
recorded in `N-TC3_index.md` are accepted.

## Commands, queries, and events

### Commands

- `CreateCampaign`
- `UpdateCampaignMission`
- `UpdateCampaignStrategy`
- `TransitionCampaign`
- `ChangeCampaignPhase`
- `CompleteCampaign`
- `ReopenCampaign`
- `ArchiveCampaign`
- `RestoreCampaign`
- `AddStoryToCampaign`
- `UpdateCampaignStoryMembership`
- `RemoveStoryFromCampaign`
- `CreateCampaignMilestone`
- `UpdateCampaignMilestone`
- `ReorderCampaignMilestones`
- `CompleteCampaignMilestone`
- `SkipCampaignMilestone`

Future commands after their foundations exist:

- `AddPublicationToCampaign`
- `RemovePublicationFromCampaign`
- `SetCampaignChannelStrategy`

Campaign commands must not schedule or deploy Publications.

### Queries

- list Campaigns by Workspace, lifecycle, type, owner, date, and text;
- get Campaign aggregate and strategy;
- list ordered Story portfolio and projected Story pipeline;
- list milestones;
- get version checkpoints and timeline;
- get projection lag or audit findings; and
- later list Publication membership, Channel strategy, Deployment summaries, and
  result Evidence.

### Durable events

- `CampaignCreated`
- `CampaignMissionUpdated`
- `CampaignStrategyUpdated`
- `CampaignLifecycleChanged`
- `CampaignPhaseChanged`
- `CampaignCompleted`
- `CampaignReopened`
- `CampaignArchived`
- `CampaignRestored`
- `StoryAddedToCampaign`
- `CampaignStoryMembershipUpdated`
- `StoryRemovedFromCampaign`
- `CampaignMilestoneCreated`
- `CampaignMilestoneUpdated`
- `CampaignMilestoneCompleted`
- `CampaignMilestoneSkipped`
- `CampaignMilestonesReordered`

Future integration events:

- `PublicationAddedToCampaign`
- `PublicationRemovedFromCampaign`
- `CampaignChannelStrategyChanged`

Authoritative mutation, version checkpoint, and event append share one SQLite
transaction. Activity, search, counts, pipeline columns, progress, schedule
summaries, and later health/readiness are rebuildable projections.

## API direction

Canonical contracts use `workspaceId`, `expectedVersion`, explicit commands, and
relationship resources.

| Method         | Path                                       | Purpose                                         |
| -------------- | ------------------------------------------ | ----------------------------------------------- |
| `GET`          | `/campaigns`                               | Workspace/lifecycle/type/owner/search catalogue |
| `POST`         | `/campaigns`                               | Required-Workspace creation                     |
| `GET`          | `/campaigns/{id}`                          | Aggregate detail                                |
| `PATCH`        | `/campaigns/{id}`                          | Optimistic mission/strategy update              |
| `POST`         | `/campaigns/{id}/transition`               | Guarded lifecycle command                       |
| `POST`         | `/campaigns/{id}/phase`                    | Explicit execution-phase command                |
| `POST`         | `/campaigns/{id}/complete`                 | Completion assessment                           |
| `POST`         | `/campaigns/{id}/reopen`                   | Confirmed reopening                             |
| `POST`         | `/campaigns/{id}/archive`                  | Reversible archive                              |
| `POST`         | `/campaigns/{id}/restore`                  | Restore                                         |
| `GET/POST`     | `/campaigns/{id}/stories`                  | Ordered Story portfolio                         |
| `PATCH/DELETE` | `/campaigns/{id}/stories/{storyId}`        | Membership update/removal                       |
| `GET/POST`     | `/campaigns/{id}/milestones`               | Milestone collection                            |
| `PATCH/DELETE` | `/campaigns/{id}/milestones/{milestoneId}` | Milestone update/removal                        |
| `PUT`          | `/campaigns/{id}/milestones/order`         | Atomic reorder                                  |
| `GET`          | `/campaigns/{id}/versions`                 | Version checkpoints                             |
| `GET`          | `/campaigns/{id}/timeline`                 | Event projection                                |

Future surfaces `/campaigns/{id}/publications` and
`/campaigns/{id}/channel-strategy` are prohibited until Publication and Channel
contracts are accepted and implemented.

Normal `DELETE /campaigns/{id}` becomes deprecated compatibility behavior and
returns conflict after archive/restore ships. Maintenance deletion requires a
separate retention policy.

## Experience contract

### Campaign Library

The Library provides:

- Workspace, lifecycle, type, owner, date, and text filters;
- status, mission, timeframe, Story progress, milestone status, and exception
  summaries;
- explicit loading, empty, failure, archived, and migration-remediation states;
  and
- creation only after an active Workspace is selected.

### Campaign Mission Control

The Studio provides only implemented capabilities:

- mission and success definition;
- lifecycle, phase, owner, timeframe, and strategy;
- ordered Story portfolio and pipeline projection;
- milestone plan;
- version/timeline and visible conflict feedback; and
- archive/restore.

Publication matrix, Channel strategy, Deployment schedule/results, Evidence
coverage, Knowledge quality, and Campaign Intelligence panels appear only after
their owning contracts and data paths exist. No fake percentage, scheduled count,
published count, Evidence coverage, Knowledge quality, or analytics value may be
displayed.

### Accessibility and recovery

- all commands remain keyboard operable with semantic labels and visible focus;
- status is never conveyed only through color;
- pause, complete, reopen, archive, restore, unlink, skip, and other consequential
  actions require confirmation proportionate to reversibility;
- stale writes preserve unsaved input and explain the conflict;
- failed relationship or reorder writes restore the last authoritative order;
- archived Campaigns are visibly read-only; and
- reduced motion is honored in pipeline, progress, and timeline views.

## Progress and measurement

Campaign progress is a projection, never a manually authoritative percentage.

Initial deterministic progress may report separate components:

- planned versus completed milestones;
- planned versus lifecycle-complete Stories;
- exception counts for archived, blocked, or overdue inputs; and
- later planned versus approved Publications and successful Deployments.

The UI must show component counts, insufficient-data states, and the calculation
method. It must not combine these into a Campaign Health score until a named,
versioned EIE capability is separately accepted.

Route telemetry is separate from Campaign progress and includes catalogue/detail
latency, command conflicts/failures, portfolio load, reorder latency, and
completion/abandonment evidence.

## Migration and compatibility

Migration policy:

1. append a new ordered migration; never rewrite migrations 1–11;
2. preserve every legacy Campaign row and current Story edge;
3. never silently assign an unowned Campaign to a Workspace;
4. create a migration-audit record for unowned Campaigns and invalid or
   cross-Workspace Story edges;
5. map existing statuses with the same names without inventing transition history;
6. create initial version checkpoints labelled as legacy migration;
7. preserve `duration_weeks` and `platforms` as read-only compatibility data;
8. do not infer start/end dates because the legacy rows have no reliable start;
9. do not infer Channels, Publications, Deployments, Connections, or external
   identities from platform strings;
10. rebuild Campaign FTS5 from non-archived rows only; and
11. expose an executable migration/audit report before rollout.

Physical `project_id` remains a storage compatibility name while public contracts
use `workspaceId`. The singular `stories.campaign_id` remains read-compatible
during observation but `story_campaigns` is authoritative.

## Responsibility classification

| Action                                      | Classification                                         |
| ------------------------------------------- | ------------------------------------------------------ |
| Create/edit mission and strategy            | Human action                                           |
| Activate or pause                           | Human confirmation                                     |
| Complete or reopen                          | Human approval required                                |
| Archive or restore                          | Human confirmation                                     |
| Add/remove/reorder Stories                  | Human action; removal confirmed when consequential     |
| Complete/skip milestone                     | Human confirmation                                     |
| Rebuild counts/search/timeline              | Deterministic maintenance                              |
| Suggest progress risks                      | Future EIE recommendation with explanation             |
| Create or rewrite Story/Publication content | Prohibited as silent Campaign automation               |
| Schedule or deploy externally               | Prohibited Campaign automation; Deployment domain only |

## Execution passes

### Pass 1 — Aggregate contracts, schema, and compatibility

Status: **Complete — accepted at L2 Functional on 2026-07-29**

1. Add canonical Campaign OpenAPI contracts requiring `workspaceId`.
2. Define mission, success, type, owner, audience, lifecycle, phase, timeframe,
   strategy, completion, archive, and optimistic version fields.
3. Append the ordered Campaign migration and audit tables.
4. Backfill legacy Campaigns conservatively without assigning ownership, dates,
   Channels, or Publications.
5. Add Campaign version checkpoints and migration/audit reporting.
6. Replace normal hard deletion with optimistic archive/restore.
7. enforce lifecycle transitions and archived-Workspace/Campaign guards.
8. append Campaign events atomically and project Activity from them.
9. rebuild active-only Campaign FTS5.
10. regenerate React/Zod clients and update Library/Studio creation, save,
    lifecycle, conflict, and archive flows.
11. verify fresh/upgrade migrations, unowned rows, status preservation,
    optimistic conflicts, lifecycle guards, event atomicity/replay, search,
    archive/restore, and type safety.

Pass 1 excludes Story portfolio mutation, milestones, Publications, Channels,
Deployments, Calendar scheduling, Campaign progress/health, analytics,
Intelligence, and external provider work.

### Pass 1 execution report

- OpenAPI now requires an active `workspaceId` and exposes mission, success,
  type, owner, audience, lifecycle, phase, timeframe, planning targets,
  completion, archive, optimistic version, and checkpoint contracts.
- Ordered migration 12, `governed_campaign_domain`, preserves legacy rows,
  status, `platforms`, `duration_weeks`, timestamps, and Story edges. It creates
  no Workspace, date, Channel, Publication, Deployment, or lifecycle history.
- Campaign checkpoints, migration-audit findings, active-only search, guarded
  transitions, explicit phase commands, completion/reopen, reversible archive,
  and restore are executable.
- Canonical state, checkpoint, and durable Campaign event append share a SQLite
  transaction; Activity is projected idempotently from the event log.
- The Library and Mission Control require Workspace ownership, expose governed
  mission fields and filters, preserve optimistic versions, show checkpoints and
  conflicts, and make archived Campaigns visibly read-only.
- `pnpm run audit:campaign-migration` reports ownership, compatibility payloads,
  relationships, versions, events, and unresolved migration findings.
- TypeScript, production build, 35 repository tests, 12 migration tests, 14 API
  workflows, and five browser workflows passed. The Campaign browser workflow
  completed its initial load, save, activate, archive, and restore path within
  the five-second experience budget.

### Pass 2 — Story portfolio and milestones

Status: **Complete and accepted at L2 Functional**

Govern `story_campaigns`, migrate `is_primary` into explicit membership semantics,
add Campaign-side Story queries/backlinks, ordered roles, milestones, atomic
reordering, pipeline projections, Studio panels, and cross-Workspace/archive
conformance.

### Pass 2 execution report

- Ordered migration 13, `governed_campaign_portfolio_and_milestones`, adds
  explicit `Anchor`, `Supporting`, `FollowUp`, and `Reference` membership roles,
  deterministic order, contribution notes, optimistic membership versions,
  a one-primary-per-Story constraint, and governed milestone records.
- Legacy Story edges are preserved. Existing primary flags become Anchor roles;
  multiple legacy primaries remain auditable, with only the earliest membership
  retaining canonical primary status. No Story ownership or content is moved.
- OpenAPI, generated React clients, and generated Zod schemas expose Campaign
  portfolio CRUD/reorder, Story-side Campaign backlinks, and milestone
  CRUD/reorder/status commands.
- Every portfolio and milestone command validates the Campaign aggregate version;
  membership and milestone edits also validate their record version. State,
  aggregate checkpoint, and durable event append commit atomically.
- Campaign Mission Control adds ordered Story membership and milestone panels.
  Story Studio displays authoritative Campaign backlinks. Archived Campaigns are
  visibly read-only, and removal never deletes the underlying Story.
- Same-Workspace membership, one canonical primary Campaign per Story, complete
  reorder sets, milestone completion/skip notes, terminal milestone state, and
  archived-parent guards are executable.
- Route-wide Workspace guards were corrected to inspect only their own resource
  prefix, preventing unrelated nested routes from being rejected by coincidental
  numeric IDs.
- `pnpm run audit:campaign-migration` now reports membership, primary,
  milestone, terminal-milestone, durable-event, and singular-pointer counts.
- TypeScript, production build, 37 repository tests, 13 migration tests, 15 API
  workflows, and five browser workflows passed. The expanded Campaign browser
  workflow created a Story portfolio membership and milestone, then saved,
  activated, archived, restored, and verified the Story backlink.

### Pass 3 — Integrated experience and L3 conformance

Status: **Complete and accepted — L3 Integrated**

Complete browser/Electron workflows, accessibility/conflict/recovery matrices,
named 10,000-Campaign/portfolio benchmarks, compatibility-retirement evidence,
projection observability, backup/restore coverage, and the L3 decision.

### Pass 3 execution report

- The browser workflow verifies semantic headings and labels, keyboard focus,
  visible optimistic-conflict alerts, version history, portfolio/backlinks,
  milestone creation, archive read-only state, restore, and persisted state.
- A forced `CampaignMilestoneCreated` outbox failure returns an error while the
  milestone, aggregate version, and checkpoint remain unchanged, proving the
  transactional recovery boundary.
- The Campaign migration audit reports unprojected durable events and recorded
  projection failures alongside migration, relationship, milestone, and
  compatibility counts. A clean Vault reports zero in both categories.
- Canonical Story creation and patch contracts no longer accept the legacy
  singular `campaignId`. Generic Story-side Campaign link/unlink is rejected;
  `story_campaigns` is the sole write authority. The physical singular pointer
  and legacy platform/status fields remain read/audit-compatible for an observed
  window and are not converted into Channels or Publications.
- Vault backup conformance explicitly round-trips Campaign aggregate, portfolio,
  milestone, checkpoint, and durable-event database content.
- The named fixture contains 50 Workspaces, 10,000 Stories, 10,000 Evidence,
  10,000 Knowledge, 10,000 Campaigns, a 200-Story Campaign portfolio, and 50
  milestones. One hundred measured iterations ran on Apple M1, 8 logical cores,
  8 GB RAM, Darwin 25.5.0, and Node 24.18.0.

| Campaign workload                          |    Median |       p95 |
| ------------------------------------------ | --------: | --------: |
| Catalogue, 50 active records               |  0.237 ms |  0.252 ms |
| FTS5 search, 50 Campaign hits              | 19.265 ms | 24.470 ms |
| Detail + portfolio + milestones + versions |  0.396 ms |  0.646 ms |
| Optimistic save + version checkpoint       | 12.788 ms | 13.373 ms |
| Portfolio read, 200 Story memberships      |  0.326 ms |  0.356 ms |
| Milestone versioned update                 |  0.071 ms |  0.094 ms |
| Atomic membership reorder                  |  0.113 ms |  0.125 ms |

Cold database initialization measured 58.621 ms for the combined fixture. These
are named local measurements, not universal latency promises.

- TypeScript, production build, 38 repository tests, 13 migration tests, 16 API
  workflows, five Playwright workflows, the clean-Vault audit, and the unpacked
  macOS arm64 Electron package all passed. Signing was intentionally disabled for
  the local conformance package. One post-package all-suite run observed a
  21.7-second route-load outlier; the correctly rendered Campaign workflow passed
  its immediate isolated rerun in 2.3 seconds, so the outlier remains recorded as
  an environmental observation.

### Pass 4 — Publications and Channels integration

Status: **Future; blocked on separate foundations**

Only after canonical Publication, Channel, Connection, Deployment, compatibility,
security, and scheduling contracts reach their required maturity, add Campaign
Publication membership, first-class Channel strategy references, Deployment
summaries, and result Evidence. Campaign never owns Publication content or
Deployment schedule/outcomes.

### Pass 5 — Campaign Intelligence

Status: **Future; requires separate evidence**

Consider deterministic Campaign progress, readiness, schedule risk, Evidence
coverage, Knowledge currency, consistency, and recommendations only after L3.
Each capability requires a stable version, input watermark, invalidation,
classification, explanations, source references, resource budgets, abstention,
and human authority.

## Conformance gates

Route 05 cannot advance beyond its accepted maturity unless the applicable gates
pass:

- domain correctness: Workspace ownership, lifecycle, strategy, membership, and
  milestone invariants;
- contract completeness: explicit commands, expected versions, errors, and
  generated clients;
- traceability: progress and later Intelligence identify authoritative inputs;
- recovery: aggregate, checkpoints, relationships, reorder, and events are atomic
  or compensating;
- accessibility: Library/Studio keyboard, focus, status, confirmation, and
  conflict states;
- performance: named catalogue, detail, save, portfolio, milestone, reorder, and
  search workloads;
- security: Workspace boundaries and no credential/provider data in Campaign
  state;
- observability: migration, projection, relationship, and completion failures
  remain visible;
- explainability: progress and later readiness/health expose component methods;
  and
- Canon conformance: Publications and Channels remain first-class and separately
  owned.

## Acceptance criteria for L2

Pass 1 reaches L2 Functional only when:

1. canonical creation rejects missing, invalid, and archived Workspaces;
2. legacy rows upgrade without loss or invented ownership/dates/destinations;
3. stale update, transition, archive, and restore commands return conflict;
4. illegal lifecycle transitions are rejected;
5. archived Campaigns are excluded from default list/search and are read-only;
6. Campaign state, checkpoint, and event commit atomically;
7. Activity replay is idempotent;
8. the migration report exposes every unresolved compatibility finding;
9. generated API clients and the Library/Studio use only canonical contracts; and
10. typecheck, migration, API, UI, and browser tests pass.

## Exit decision

Route 05 Passes 1–3 are accepted at **L3 Integrated** on the declared Apple M1 /
8 GB baseline. The decision is change-controlled, not permanently frozen.
Publications, Channels, scheduling, analytics, external publishing, provider
connections, and Campaign Intelligence remain explicitly future and unauthorized.
