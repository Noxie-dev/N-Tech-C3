# Route 02 — Stories: Architecture Audit and Execution Plan

## Scope

This plan covers only **Route 02 — Stories** from
`N-Tech-C³-product architecture-design.md`.

It includes the Story catalogue and Story workspace/studio, along with the minimum
Evidence, Knowledge, Asset, Campaign, Output, and Timeline integration required to
make a Story a living knowledge object. It does not implement the full Evidence
Vault, Knowledge Base, Campaigns, Publishing Pipeline, or Repository Intelligence
routes.

## Audit outcome

### Route justification

Stories pass the Route Discovery Framework:

> A Story is the intellectual product that turns fragmented engineering evidence
> and knowledge into one coherent, reusable narrative.

The route cannot be absorbed into Workspaces because a Workspace is the operating
context, while each Story has its own lifecycle, structure, relationships,
authoring state, readiness, and outputs.

Route 02 therefore requires:

- a global and Workspace-scoped Story catalogue;
- a Story studio/detail route;
- stable subresources for outline, relationships, outputs, health, and timeline.

### What is already implemented

- `/stories` catalogue with title search and status filtering.
- `/stories/:id` detail route.
- Story create, read, update, delete API operations.
- TipTap rich-text authoring with HTML persistence.
- Manual save feedback.
- Summary, status, priority, audience, difficulty, category, tags,
  `projectId`, `campaignId`, and `evidenceScore` fields in the current contract.
- SQLite foreign keys from Story to the physical Workspace (`projects`) and one
  Campaign.
- Story activity records and global FTS indexing.
- Dashboard links to active Stories.
- Basic API, editor, and browser workflow coverage.

### Architecture gaps

1. **Story is still implemented as a document.** The current detail screen is an
   editor, summary textarea, and metadata card. The architecture defines a living
   object with Overview, Outline, Evidence, Assets, References, Timeline, and
   Outputs.
2. **Workspace scoping is incomplete.** `GET /stories` cannot filter by Workspace,
   and Workspace quick actions do not reliably prefill `workspaceId`.
3. **Lifecycle states do not match the document.** The design includes Evidence
   Gathering and Outline stages, while the current enum jumps from Research to
   Draft. Lifecycle transition rules are undefined.
4. **Hard delete conflicts with the lifecycle.** The architecture says Stories
   evolve until deliberately archived. The primary UI should archive; permanent
   deletion should be a recovery/admin operation with relationship checks.
5. **Relationships are structurally insufficient.** One `campaign_id` cannot model
   multiple Campaigns. Evidence points to one Story, Knowledge has no Story
   relation, Assets point to one Story, and related Stories do not exist.
6. **Outline has no first-class model.** Headings embedded in HTML cannot support
   independent drag ordering, completion, objectives, or health calculation.
7. **Outputs are absent.** A Story cannot currently produce independently tracked
   Blog, LinkedIn, PDF, Markdown, presentation, or other deliverables.
8. **Health is a placeholder.** `evidenceScore` is stored but not calculated. There
   are no Story Health, Knowledge, readability, or publishing-readiness services.
9. **Metadata is incomplete.** Story type, author, target platforms, publish date,
   estimated reading time, word count, version, and current objective are missing
   or not derived.
10. **Timeline is too generic.** Activity records do not capture field changes,
    relationship changes, lifecycle transitions, exports, or version checkpoints.
11. **No concurrency/version protection exists.** A late save can overwrite a newer
    edit, and there is no restore/compare path.
12. **The architecture says “Rich Markdown” while the implementation stores HTML.**
    HTML is already the canonical TipTap format in the repository source of truth.
    Route 02 must preserve HTML internally and generate Markdown only as an output.

## Decisions for implementation

### Canonical frontend routes

| Route | Responsibility |
| --- | --- |
| `/stories` | Global Story catalogue with Workspace, status, type, priority, health, tag, and text filters. |
| `/workspaces/:workspaceId/stories` | Workspace-scoped Story catalogue using the same component and query contract. |
| `/stories/:storyId` | Story studio with Overview, Outline, Editor, Evidence, Assets, References, Timeline, and Outputs sections. |

The durable Story URL remains `/stories/:storyId`. Workspace context is shown in
breadcrumbs and metadata, not duplicated in the durable detail URL.

### Canonical API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/stories` | Cursor-paginated list with Workspace, lifecycle, type, priority, health, tag, and search filters. |
| `POST` | `/stories` | Create a Story in a required Workspace. |
| `GET` | `/stories/{storyId}` | Return the complete Story overview and calculated summaries. |
| `PATCH` | `/stories/{storyId}` | Update metadata/content using an optimistic concurrency version. |
| `POST` | `/stories/{storyId}/transition` | Validate and record a lifecycle transition. |
| `GET/PUT` | `/stories/{storyId}/outline` | Read or atomically replace the ordered outline. |
| `GET/POST/DELETE` | `/stories/{storyId}/evidence` | List, link, and unlink Evidence. |
| `GET/POST/DELETE` | `/stories/{storyId}/knowledge` | List, link, and unlink Knowledge pages. |
| `GET/POST/DELETE` | `/stories/{storyId}/assets` | List, link, and unlink Assets. |
| `GET/POST/DELETE` | `/stories/{storyId}/campaigns` | List, link, and unlink Campaigns. |
| `GET/POST/DELETE` | `/stories/{storyId}/related` | Manage typed Story-to-Story relationships. |
| `GET/POST/PATCH` | `/stories/{storyId}/outputs` | Create and track output variants. |
| `GET` | `/stories/{storyId}/health` | Return explained health components and readiness blockers. |
| `GET` | `/stories/{storyId}/timeline` | Return Story-scoped domain events and version checkpoints. |
| `POST` | `/stories/{storyId}/archive` | Archive a Story without deleting its graph. |

Keep existing CRUD operations compatible during one release. Mark
`DELETE /stories/{storyId}` deprecated and remove it from the normal UI.

### Lifecycle

Use the following canonical states:

```text
Idea → Research → EvidenceGathering → Outline → Draft
     → Review → Approved → Published → Archived
```

Rules:

- forward transitions may advance one stage at a time;
- returning to an earlier editable stage is allowed and recorded;
- `Approved` requires no blocking health failures;
- `Published` requires at least one ready or published Output;
- `Archived` is read-only until explicitly restored;
- transitions return `409` with blockers when requirements are not satisfied.

### Story types

Launch with:

- `EngineeringJournal`
- `BlogArticle`
- `SocialSeries`
- `CaseStudy`
- `TechnicalDocumentation`
- `ADR`
- `ResearchNote`
- `LearningNote`
- `ProductUpdate`
- `ChangelogNarrative`
- `InternalMemo`
- `Presentation`
- `Other`

Types select defaults and templates; they do not fork the Story schema.

## Data model

### Extend `stories`

Append a migration with:

- `story_type TEXT NOT NULL DEFAULT 'Other'`
- `author TEXT`
- `objective TEXT`
- `target_platforms TEXT NOT NULL DEFAULT '[]'`
- `publish_at TEXT`
- `word_count INTEGER NOT NULL DEFAULT 0`
- `estimated_read_minutes INTEGER NOT NULL DEFAULT 0`
- `version INTEGER NOT NULL DEFAULT 1`
- `archived_at TEXT`

Keep physical `project_id` for backward compatibility, but expose it as
`workspaceId` in the canonical Story API. Existing records must be backfilled with
a Workspace or explicitly reported as unassigned migration exceptions.

### New tables

`story_outline_items`

- `id`, `story_id`, `parent_id`, `position`, `title`, `notes`,
  `completion_status`, timestamps.

`story_evidence`

- `story_id`, `evidence_id`, `relevance`, `notes`, `position`, `linked_at`.

`story_knowledge`

- `story_id`, `knowledge_id`, `relationship_type`, `notes`, `linked_at`.

`story_assets`

- `story_id`, `asset_id`, `role`, `position`, `linked_at`.

`story_campaigns`

- `story_id`, `campaign_id`, `is_primary`, `linked_at`.

`story_relations`

- `source_story_id`, `target_story_id`, `relationship_type`, `notes`.

`story_outputs`

- `id`, `story_id`, `type`, `title`, `status`, `content`, `format`,
  `destination`, `published_at`, timestamps.

`story_versions`

- `id`, `story_id`, `version`, `title`, `summary`, `content`, `metadata`,
  `change_summary`, `created_at`.

`story_events`

- `id`, `story_id`, `event_type`, `actor`, `payload`, `created_at`.

All join tables require composite uniqueness, foreign keys, cascade behavior
appropriate to links, and indexes in both lookup directions. Evidence, Knowledge,
Assets, Campaigns, and related Stories are linked, not duplicated.

## Story health v1

Return an overall score plus raw values, weights, explanations, and blockers.

| Component | Weight | Initial calculation |
| --- | ---: | --- |
| Outline completeness | 20% | Completed outline items divided by required outline items |
| Evidence coverage | 25% | Outline sections with at least one relevant Evidence link |
| Knowledge references | 10% | Referenced Knowledge relative to research/outline requirements |
| Asset readiness | 10% | Required asset roles satisfied for the Story type |
| Metadata completeness | 15% | Required type-specific metadata populated |
| Readability | 10% | Deterministic sentence/paragraph/heading heuristics |
| Output readiness | 10% | At least one Output complete and no output blockers |

Rules:

- return `insufficientData` when fewer than three components are applicable;
- do not award points for missing denominators;
- explain every component in plain language;
- broken references are blockers and cap health at 80;
- health is calculated server-side and never accepted from the client;
- retain `evidenceScore` temporarily as a derived compatibility field.

Grammar and AI critique are deferred; v1 health must be deterministic and local.

## Execution plan

### Phase 0 — Characterize and lock decisions

- Add an ADR for canonical HTML storage, Workspace naming, lifecycle, archive
  semantics, and the relationship graph.
- Add characterization tests for existing Story CRUD and old records.
- Create fixtures for each lifecycle stage, unassigned legacy Story, healthy Story,
  broken graph, archived Story, and concurrent edit.
- Capture current editor behavior in a Playwright test before layout changes.

**Exit criteria:** compatibility behavior is test-protected and architectural
decisions are explicit.

### Phase 1 — Database migration and repositories

- Extend `stories` and create the relationship, outline, output, version, and event
  tables.
- Backfill type, derived metrics, version, and Workspace assignment.
- Migrate `stories.campaign_id`, `evidence.story_id`, and `assets.story_id` into the
  new join tables without removing legacy columns.
- Add migration tests for fresh, v3, populated, and orphan-containing vaults.
- Create dedicated Story repository/service modules; aggregate operations must not
  be added to the generic entity store.

**Exit criteria:** all existing content and links survive migration; a second
migration run is a no-op.

### Phase 2 — OpenAPI-first Story contract

- Add Story summary/detail, lifecycle, type, outline, relationship, output, health,
  version, and event schemas.
- Add `workspaceId` to Story list filters and require it for new Stories.
- Define pagination, sort order, standard errors, concurrency conflict, archived
  conflict, and transition blocker responses.
- Regenerate React Query clients and Zod schemas.
- Add contract tests for enums, invalid transitions, malformed outlines, duplicate
  links, and stale versions.

**Exit criteria:** generated clients compile without handwritten type overrides.

### Phase 3 — Story domain service and API routes

- Implement filtered catalogue queries and aggregate summaries without N+1 queries.
- Implement create/get/update with version checking and automatic word/read-time
  derivation.
- Implement lifecycle transition validation and archive/restore.
- Implement atomic outline replacement with stable item IDs and ordering.
- Implement relationship link/unlink services with Workspace consistency checks.
- Implement Outputs, health calculation, timeline events, and version checkpoints.
- Record meaningful events rather than a generic “updated” event for every save.
- Keep legacy single-link columns synchronized during the compatibility release.

**Exit criteria:** integration tests cover CRUD compatibility, scoping, transitions,
relationships, outputs, health, versions, archive behavior, and conflicts.

### Phase 4 — Story catalogue

- Rebuild `/stories` around Story summaries.
- Support global and Workspace-scoped modes from one component.
- Add filters for Workspace, status, type, priority, health band, tags, and search.
- Add recent, pinned/favorite if approved, and updated ordering.
- Show title, Workspace, type, lifecycle, priority, health, evidence coverage,
  output readiness, and update time.
- Implement the prescribed empty state and a create flow that requires/prefills a
  Workspace.
- Add loading, retry, empty-filter, and error states.

**Exit criteria:** a Story can be created from a Workspace in two clicks and appears
only in the correct scoped catalogue.

### Phase 5 — Story studio shell

- Replace the single editor layout with:
  - header/hero;
  - persistent section explorer;
  - main work area;
  - collapsible inspector.
- Implement sections for Overview, Outline, Editor, Evidence, Assets, References,
  Timeline, and Outputs.
- Preserve lazy loading so editor and syntax-highlighting bundles load only when
  needed.
- Add Workspace and Campaign breadcrumbs, health/readiness, metadata, word count,
  read time, version, and save/conflict status.
- Replace hard-delete UI with Archive; expose permanent deletion only through a
  guarded maintenance surface.

**Exit criteria:** navigation is keyboard accessible, reload-safe, and retains the
  active Story section.

### Phase 6 — Outline and editor integration

- Build nested outline CRUD and keyboard-accessible drag/reorder controls.
- Allow outline items to focus corresponding editor headings without making editor
  headings the database source of truth.
- Keep TipTap HTML canonical.
- Add callout, checklist, citation, and diagram placeholder support where missing.
- Implement debounced autosave plus explicit save, visible pending/saved/error
  status, offline-safe retry, and stale-version conflict handling.
- Create a version checkpoint on meaningful save boundaries, not every keystroke.

**Exit criteria:** outline ordering persists; concurrent saves cannot silently
overwrite newer content.

### Phase 7 — Relationships and outputs

- Add searchable link dialogs for Evidence, Knowledge, Assets, Campaigns, and
  related Stories.
- Show previews, provenance, timestamps, relevance/role, and broken-link states.
- Ensure links stay within the Story Workspace unless an explicit cross-Workspace
  exception is supported later.
- Add Output creation from Story type defaults.
- Track Output type, format, status, destination, and publish timestamp.
- Route export generation through Outputs; do not duplicate export logic in the
  Story editor.

**Exit criteria:** users can link/unlink every supported object and independently
track multiple outputs without duplicating source content.

### Phase 8 — Health, timeline, and lifecycle

- Display overall Story Health, component explanations, and actionable blockers.
- Recalculate after outline, content, metadata, relationship, or Output changes.
- Implement timeline filters for lifecycle, edit, relationship, output, and version
  events.
- Add compare/restore for version checkpoints with a new version created on restore.
- Implement transition controls that explain why a requested transition is blocked.

**Exit criteria:** identical Story state produces identical health; Approved and
Published transitions enforce their requirements.

### Phase 9 — Verification and compatibility cleanup

- Add unit tests for health, word/read-time metrics, transitions, ordering, and
  concurrency.
- Add migration and API integration tests against temporary SQLite vaults.
- Add component tests for catalogue states, studio navigation, autosave/conflict,
  archive, and relationship dialogs.
- Add end-to-end workflow:
  Workspace → Story → Outline → Evidence/Knowledge/Asset links → Draft → Output →
  Approved → Published → Archive/restore.
- Run codegen verification, typecheck, unit/integration tests, production build,
  Playwright, and Electron smoke test.
- Update `N-TC3_index.md` and `README.md`.
- After one compatible release, remove single Campaign/Evidence/Asset link columns,
  deprecated delete behavior, and old Project naming in a separate migration.

**Exit criteria:** all automated checks pass and the normal Story experience no
longer depends on legacy single-link fields.

## Suggested file-area order

1. Architecture decision and fixtures.
2. `lib/db/src/migrations.ts` and migration tests.
3. `lib/api-spec/openapi.yaml`, then generated clients/validators.
4. `artifacts/api-server/src/lib/stories/` domain services.
5. `artifacts/api-server/src/routes/stories.ts` and integration tests.
6. Story catalogue and reusable Workspace-scoped catalogue component.
7. Story studio shell, outline, relationships, Outputs, health, and timeline.
8. Playwright/Electron verification.
9. Source-of-truth index and README update.

## Definition of done

Route 02 is complete when:

- new Stories require and inherit a Workspace;
- global and Workspace-scoped catalogues are accurate and filterable;
- Story is represented as Overview, Outline, Editor, Evidence, Assets, References,
  Timeline, and Outputs rather than only a document editor;
- lifecycle transitions are validated, explained, and recorded;
- hard delete is absent from the normal UI and Archive is reversible;
- many-to-many Story relationships are enforced without duplicating linked data;
- outline ordering, TipTap HTML, autosave, concurrency, and versions are reliable;
- multiple Outputs can be tracked independently;
- Story Health is deterministic, explained, and enforced for readiness transitions;
- loading, empty, error, conflict, archived, broken-link, and not-found states are
  implemented;
- keyboard and screen-reader navigation cover all primary actions;
- migrations preserve existing Stories and links;
- API, migration, domain, component, browser, and desktop smoke tests pass;
- `N-TC3_index.md` and `README.md` accurately describe the delivered state.

## Explicitly deferred

- Full Route 03 Evidence Vault redesign.
- Full Knowledge graph visualization.
- Campaign planning/timeline implementation.
- Publishing Pipeline scheduling, delivery connectors, and analytics.
- Repository Intelligence automation.
- AI outlining, grammar critique, generation, citations, and semantic search.
- Collaboration, comments, permissions, and cloud sync.
- Direct social publishing.
- Whitepaper-specific advanced workflow.
- Physical rename of the legacy `project_id` storage column.
