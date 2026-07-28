# Route 01 — Workspaces: Architecture Audit and Execution Plan

## Scope

This plan covers only Route 01, **Workspaces**, from
`N-Tech-C³-product architecture-design.md`. Stories, Evidence Vault, Campaigns,
Knowledge, Assets, Calendar, Templates, and Exports appear here only where the
Workspace route must summarize or link to them. Their full route implementations
are out of scope.

## Audit outcome

### Route justification

The Workspaces route passes the Route Discovery Framework's core test:

> It gives the user one place to select, create, organize, and re-enter the complete
> context of a single initiative.

This responsibility does not belong on the global dashboard because the dashboard
is cross-workspace. It does not belong on Stories because a Workspace owns more
than stories. Route 01 therefore warrants:

- a Workspace picker/list route;
- a Workspace overview route;
- Workspace-scoped navigation into supporting modules.

### What the architecture document defines well

- A clear mental model: Workspace is the operating context; child objects belong
  to that context.
- A defensible user journey: app → dashboard → picker → Workspace overview.
- Useful overview content: identity, metrics, recent activity, current work, and
  quick actions.
- Explicit empty, active, archived, and corrupted states.
- A bounded set of metadata and a forward-looking Workspace DNA concept.
- A measurable health concept based on linked and orphaned records.

### Gaps and decisions required for implementation

1. **“Project” and “Workspace” are used for the same concept in the current app.**
   The UI labels `/projects` as Workspaces, while the route, API, generated types,
   database table, activity entity type, and foreign keys still say `project`.
   Workspaces must become the canonical product term.
2. **The document combines two screens.** Workspace Cards describe the picker;
   Workspace Dashboard and layout describe the detail/overview screen. They should
   be implemented as `/workspaces` and `/workspaces/:workspaceId`.
3. **Ownership is underspecified.** Stories, Evidence, and Assets have `project_id`;
   Campaigns, Knowledge, and Templates do not. Workspace metrics and scoping cannot
   be correct until the required child records have a Workspace foreign key.
4. **Archive conflicts with the current destructive API.** The design says archived
   Workspaces are read-only, but the current API only offers hard delete. Route 01
   should use a status transition and omit hard deletion from the UI.
5. **Duplicate and export lack semantics.** For the first increment, duplicate
   copies Workspace metadata/DNA only; export produces a Workspace manifest. Copying
   or packaging all child content is a later increment.
6. **Health is not yet a stable formula.** The first version needs a deterministic,
   documented server-side calculation and an `insufficientData` state.
7. **“Corrupted” needs a detectable contract.** It should mean the Workspace record
   exists but a linked repository/vault path is unavailable or a referential
   integrity check fails. Recovery actions are desktop-only and should not block the
   web/API implementation.
8. **Search and filters need explicit behavior.** Search applies to Workspace name,
   description, and tags. Filters are combinable; archived records are excluded by
   default.
9. **Workspace DNA is too broad for one form.** Store it as structured fields in the
   contract, but launch with purpose, brand, audience, writing voice, repositories,
   tags, and color. Templates, brand assets, export formats, and knowledge domains
   can be added without changing route identity.
10. **Access control is future-facing.** The local-first release has a single local
    owner. Cloud owner/collaborator authorization is not part of Route 01 v1.

## Canonical route contract

### Frontend routes

| Route | Responsibility |
| --- | --- |
| `/workspaces` | Search, filter, create, open, duplicate, archive, and export Workspaces. |
| `/workspaces/:workspaceId` | Workspace overview: identity, health, metrics, recent activity, current work, and quick actions. |
| `/workspaces/:workspaceId/settings` | Edit metadata/DNA, repositories, archive state, and recovery information. |

`/projects` and `/projects/:id` should temporarily redirect to the equivalent
Workspace routes so old bookmarks continue to work. They are compatibility routes,
not separate product screens.

### API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/workspaces` | List Workspaces with `search`, `status`, `favorite`, `pinned`, `purpose`, `sort`, `limit`, and `cursor`. |
| `POST` | `/workspaces` | Create a Workspace and its initial DNA profile. |
| `GET` | `/workspaces/{workspaceId}` | Return Workspace metadata plus overview metrics, health, recent activity, and current work. |
| `PATCH` | `/workspaces/{workspaceId}` | Update metadata, DNA, favorite/pinned flags, repositories, or status. |
| `POST` | `/workspaces/{workspaceId}/duplicate` | Copy metadata/DNA into a new active Workspace. |
| `GET` | `/workspaces/{workspaceId}/export` | Download a versioned JSON manifest of Workspace metadata and links. |
| `GET` | `/workspaces/{workspaceId}/integrity` | Return integrity checks and recoverable problems. |

Archiving uses `PATCH { "status": "Archived" }`. No hard-delete endpoint is exposed
in Route 01 v1.

### Core data contract

The Workspace response should include:

- `id`, `name`, `slug`, `description`, `color`, `icon`, `logoPath`;
- `status`: `Active | Archived | Corrupted`;
- `purpose`: `Product | Marketing | Research | Internal | Personal | Other`;
- `brand`, `writingVoice`, `targetAudience`;
- `preferredExportFormats`, `defaultTemplateIds`, `repositoryLinks`,
  `brandAssetIds`, `knowledgeDomains`, `tags`;
- `owner`, `isFavorite`, `isPinned`, `lastOpenedAt`, `createdAt`, `updatedAt`;
- detail-only `metrics`, `health`, `recentActivity`, and `continueWorking`.

Arrays/objects must be represented as JSON in SQLite and as typed arrays/objects in
the API. `slug` must be unique, but IDs remain the durable foreign-key and URL
identifier for this increment.

## Backward-compatible storage strategy

Do not rename the existing `projects` table in the first migration. Existing vaults
already reference it. Treat it as the physical storage table while exposing
Workspace terminology at every application boundary.

1. Add a migration that extends `projects` with the Workspace metadata columns.
2. Add `project_id` foreign keys and indexes to Campaigns, Knowledge, and Templates.
   Continue mapping the physical `project_id` column to the API field `workspaceId`.
3. Backfill existing rows:
   - `slug` from a collision-safe slug of `name`;
   - `status = 'Active'`;
   - JSON fields to `[]`;
   - flags to `0`;
   - `last_opened_at = updated_at`.
4. Rebuild global-search entries so entity type is `workspace`. During one release,
   accept legacy `project` search rows but only return `workspace` to clients.
5. Keep a private compatibility adapter for old Project-shaped calls until all
   frontend consumers and tests have migrated.

This avoids a risky SQLite table rebuild while leaving a later physical rename
possible.

## Execution plan

### Phase 0 — Lock terminology and acceptance fixtures

- Add a short architecture decision record declaring Workspace the domain term and
  `projects` a temporary storage detail.
- Create fixtures for: no Workspaces, one active Workspace with children, archived
  Workspace, Workspace with orphaned children, and unavailable repository.
- Record current Project API behavior in characterization tests before migration.

**Exit criteria:** terminology and compatibility rules are documented; existing
Project behavior is protected by tests.

### Phase 1 — Database and migration

- Add Workspace metadata columns to `projects`.
- Add Workspace ownership to Campaigns, Knowledge, and Templates.
- Add indexes for status, updated/last-opened ordering, slug, and every Workspace
  foreign key.
- Add a trigger or repository-layer update for `updated_at`.
- Update search triggers/backfill for the canonical `workspace` entity type.
- Add migration tests for a fresh database and an existing v2 database containing
  Project-linked data.

**Exit criteria:** both fresh and upgraded vaults preserve records and satisfy
foreign-key/integrity checks.

### Phase 2 — OpenAPI-first contract

- Define `Workspace`, `WorkspaceSummary`, `WorkspaceInput`, `WorkspacePatch`,
  `WorkspaceOverview`, `WorkspaceMetrics`, `WorkspaceHealth`,
  `WorkspaceIntegrity`, and paginated list schemas.
- Define all `/workspaces` operations and standard `400`, `404`, `409`, and `500`
  error bodies.
- Regenerate Zod schemas and the React Query client.
- Add contract tests that reject invalid enums, malformed JSON fields, duplicate
  slugs, and empty names.

**Exit criteria:** generated clients compile with no handwritten type overrides.

### Phase 3 — Workspace service and Express router

- Create a Workspace repository/service rather than expanding the generic entity
  store with aggregate SQL.
- Implement list/search/filter/sort and cursor pagination.
- Implement create/get/update, metadata-only duplicate, manifest export, and
  integrity checks.
- Build the overview in one service call using bounded aggregate queries:
  - counts by child type;
  - activity scoped to the Workspace;
  - most recently updated non-complete Story;
  - repository status;
  - health components.
- Record Workspace create, update, archive, restore, duplicate, and open activity.
- Reject mutations of archived Workspaces except restore; return `409`.
- Mount `workspacesRouter`; keep `projectsRouter` only as a temporary compatibility
  adapter and mark it deprecated.

**Exit criteria:** router integration tests cover success, validation, not-found,
archive/read-only, duplication, filtering, export, and existing-data compatibility.

### Phase 4 — Workspace picker (`/workspaces`)

- Replace `Projects` with `Workspaces` and update all links/navigation.
- Implement cards with name, identity, update time, Story/Evidence counts, health,
  and status.
- Implement search and filters: Recent, Favorites, Pinned, Archived, and Purpose.
- Implement the prescribed empty state with a primary “New Workspace” action.
- Add create, open, duplicate, archive/restore, and manifest export actions.
- Make cards fully keyboard reachable; add list loading, error, retry, and empty
  states.
- Update `/projects` to redirect to `/workspaces`.

**Exit criteria:** a user can create and open a Workspace within two clicks and can
find an archived Workspace without mixing it into the default active list.

### Phase 5 — Workspace overview (`/workspaces/:workspaceId`)

- Build the identity hero with name, description, current goal, repository status,
  health score, active campaign, and Continue Working.
- Add metric cards for Stories, Evidence, Knowledge, Campaigns, Assets, and Exports.
- Add Workspace-scoped recent activity and timeline previews.
- Add persistent scoped navigation. Links must carry the Workspace context, for
  example `/workspaces/:workspaceId/stories`; those child views may initially route
  to existing pages with `workspaceId` filters.
- Add quick actions for Capture, Story, Evidence, Campaign, Knowledge, and Import;
  prefill `workspaceId` in every creation flow.
- Update `lastOpenedAt` without polluting user-visible activity.
- Add archived read-only banner and corrupted/recovery state.

**Exit criteria:** every displayed count and activity item is scoped to the opened
Workspace, and every created child record inherits its ID.

### Phase 6 — Health and integrity

Use a transparent v1 score with five equally weighted checks:

1. activity in the last 30 days;
2. percentage of active Stories with linked Evidence;
3. percentage of active Stories linked to a Campaign;
4. percentage of Knowledge pages with at least one connection;
5. percentage of Assets linked to a Story or Campaign.

Each check contributes 0–20 points. When a denominator is zero, mark the component
`notApplicable` rather than awarding or subtracting points; normalize the score
across applicable components. Return component scores and explanations so the UI
never presents an unexplained number. Broken references are an integrity failure
and cap the overall score at 80 until repaired.

**Exit criteria:** service tests prove boundary values, empty-data behavior, and the
broken-reference cap.

### Phase 7 — Verification and cleanup

- Add component tests for picker states, filters, actions, overview states, and
  keyboard navigation.
- Add API integration tests against a temporary SQLite vault.
- Add an end-to-end flow: create Workspace → open → create linked Story/Evidence →
  verify metrics/activity → archive → verify read-only → restore.
- Verify desktop repository integration for healthy and unavailable paths.
- Run typecheck, unit/integration tests, production build, and Electron smoke test.
- Remove direct frontend Project API usage. Keep redirects and the deprecated API
  adapter for one release, then remove them in a separately approved cleanup.

**Exit criteria:** the end-to-end flow passes and no visible UI or generated API type
uses “Project” for the Workspace concept.

## Suggested implementation order by file area

1. `lib/db/src/migrations.ts` and migration tests.
2. `lib/api-spec/openapi.yaml`, followed by generated Zod/client artifacts.
3. `artifacts/api-server/src/lib/` Workspace repository/service.
4. `artifacts/api-server/src/routes/workspaces.ts` and router integration tests.
5. `artifacts/ntech-c3/src/App.tsx`, `components/Shell.tsx`, and Workspace pages.
6. Dashboard links and all create flows that must propagate `workspaceId`.
7. End-to-end tests and compatibility cleanup.

## Definition of done

Route 01 is complete when:

- `/workspaces` and `/workspaces/:workspaceId` are canonical and reload-safe;
- existing Project data upgrades without loss;
- all listed child entities can be scoped to a Workspace;
- create, edit, open, search, filter, duplicate, archive/restore, and manifest
  export work;
- the overview contains accurate scoped metrics, activity, current work, repository
  state, and an explainable health score;
- archived Workspaces are read-only and corrupted Workspaces have actionable
  diagnostics;
- empty, loading, success, validation, not-found, archived, corrupted, and server
  failure states are covered;
- keyboard and screen-reader navigation work for primary actions;
- API, migration, component, and end-to-end tests pass;
- no user-facing Route 01 surface calls a Workspace a Project.

## Explicitly deferred

- Full implementations of Routes 02 and 03 or other child modules.
- Cloud collaboration, invitations, roles, and remote ownership.
- AI memory and AI-generated Workspace DNA.
- Deep duplication of every child record and binary asset.
- Full portable vault export/import.
- Physical SQLite rename from `projects` to `workspaces`.
- Calendar, Exports, and recovery wizard implementations beyond Route 01 links and
  status surfaces.
