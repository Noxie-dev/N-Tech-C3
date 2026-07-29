# Route 04 — Knowledge: RDF v1 Dossier and Execution Plan

Status: **Accepted — L1 Defined**

RDF version: **1.0**

Owner: Knowledge Domain / Product Architecture

Accepted: 2026-07-29

## Scope

This dossier governs `/knowledge` and `/knowledge/:id`. The route is an
experience adapter over the Knowledge domain; it does not own Evidence truth,
search, events, or Intelligence algorithms.

## Route DNA

| Field | Decision |
| --- | --- |
| Route ID | `knowledge` |
| Paths | `/knowledge`, `/knowledge/:id` |
| Mission | Transform provenance-bearing Evidence into reviewed, reusable understanding. |
| User need | Find what the organization has learned, why it believes it, and whether it is still current. |
| Required outcome | A user can author, support, review, relate, find, and safely evolve Workspace-owned Knowledge. |
| Domain owner | Knowledge |
| Experience pattern | Library + Studio + capability-driven Inspector |
| Current maturity | L1 Defined; legacy CRUD seed exists |
| Target maturity | L3 Integrated before Intelligence work |

## Primary workflow

```text
Select Workspace
  → create or open Knowledge
  → author structured claims
  → cite governed Evidence/source locators
  → review support and conflicts
  → publish lifecycle decision
  → find and reuse through search/backlinks
```

Primary actions are limited to:

1. create Knowledge;
2. edit content and claims;
3. add or remove citations and typed relationships;
4. review or transition lifecycle;
5. archive or restore.

## Canonical model

### Knowledge aggregate

Each Knowledge record has:

- stable ID, required Workspace ID, title, slug, summary, category, tags, owner;
- lifecycle, review state, optimistic version, created/updated timestamps; and
- optional superseding Knowledge reference.

Initial lifecycle:

```text
Idea → Research → Draft → Verified → Canonical → Archived
```

`Referenced` is derived from actual downstream use and is not an authoritative
lifecycle state.

Rules:

- new Knowledge belongs to exactly one active Workspace;
- archived Knowledge is read-only until restored;
- archive/restore replaces normal hard deletion;
- `Verified` requires at least one reviewed claim with a valid citation;
- `Canonical` additionally requires an owner and review date;
- unsupported, stale, superseded, and conflicting content remains visible;
- derived trust/freshness never silently changes lifecycle or review state; and
- permanent deletion is maintenance-only and requires a separately accepted
  retention policy.

### Claim

A claim is an ordered, versioned statement within one Knowledge aggregate:

- stable ID, Knowledge ID, position, statement;
- claim kind and support state;
- review state, reviewer, reviewed timestamp; and
- created/updated timestamps.

Initial support states:

`Unsupported`, `PartiallySupported`, `Supported`, `Corroborated`,
`Conflicting`, and `Stale`.

Support state is derived or human-confirmed. `HumanVerified` is a review fact,
not a numeric confidence score.

### Citation

A citation links one claim to one Evidence source version and optionally one
precise source locator. The Evidence domain remains authoritative for source
identity, integrity, provenance, and locator shape.

Invariants:

- citation Evidence and Knowledge belong to the same Workspace;
- the cited source belongs to the cited Evidence;
- a locator, when present, belongs to that source;
- citation removal deletes only the edge;
- archived Knowledge cannot mutate citations; and
- missing, modified, or unverifiable Evidence remains visible to reviewers.

### Relationships

Knowledge relationships are explicit typed edges, not embedded IDs:

`RelatedTo`, `DependsOn`, `Explains`, `Contradicts`, `Supersedes`, and
`DerivedFrom`.

Each edge records source, target, type, notes, creator, and timestamps. Self-links
are prohibited, cross-Workspace links are denied, inverse backlinks are
rebuildable projections, and `Supersedes` cannot form a cycle.

## Commands, queries, and events

Initial commands:

- `CreateKnowledge`
- `UpdateKnowledgeMetadata`
- `ReplaceKnowledgeContent`
- `AddKnowledgeClaim`
- `UpdateKnowledgeClaim`
- `CiteEvidenceForClaim`
- `RemoveClaimCitation`
- `LinkKnowledge`
- `UnlinkKnowledge`
- `TransitionKnowledge`
- `ArchiveKnowledge`
- `RestoreKnowledge`

Initial queries:

- list/get Knowledge by Workspace and lifecycle;
- list claims and citations;
- list outbound relationships and projected backlinks;
- search active Knowledge; and
- list version checkpoints and review history.

Durable event vocabulary:

- `KnowledgeCreated`
- `KnowledgeMetadataUpdated`
- `KnowledgeContentUpdated`
- `KnowledgeClaimAdded`
- `KnowledgeClaimUpdated`
- `KnowledgeCitationAdded`
- `KnowledgeCitationRemoved`
- `KnowledgeLinked`
- `KnowledgeUnlinked`
- `KnowledgeLifecycleChanged`
- `KnowledgeArchived`
- `KnowledgeRestored`

Authoritative mutation and event append share one SQLite transaction. Activity,
FTS5, backlinks, reference counts, and later freshness/trust results are
rebuildable projections.

## API direction

Canonical contracts use `workspaceId`, `expectedVersion`, explicit commands, and
typed relationship resources. The first pass will govern the aggregate without
prematurely exposing claims.

Planned surface:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/knowledge` | Workspace/lifecycle/category/search catalogue |
| `POST` | `/knowledge` | Required-Workspace creation |
| `GET` | `/knowledge/{id}` | Aggregate detail |
| `PATCH` | `/knowledge/{id}` | Optimistic metadata/content update |
| `POST` | `/knowledge/{id}/transition` | Guarded lifecycle transition |
| `POST` | `/knowledge/{id}/archive` | Reversible archive |
| `POST` | `/knowledge/{id}/restore` | Restore |
| `GET/POST` | `/knowledge/{id}/claims` | Ordered claim collection |
| `PATCH` | `/knowledge/{id}/claims/{claimId}` | Optimistic claim update |
| `GET/POST` | `/knowledge/{id}/claims/{claimId}/citations` | Citation collection |
| `DELETE` | `/knowledge/{id}/claims/{claimId}/citations/{citationId}` | Remove edge |
| `GET/POST` | `/knowledge/{id}/relationships` | Typed Knowledge edges/backlinks |
| `DELETE` | `/knowledge/{id}/relationships/{relationshipId}` | Remove edge |
| `GET` | `/knowledge/{id}/versions` | Version checkpoints |

## Experience contract

The Library provides Workspace, lifecycle, category, review, and text filters with
explicit loading, empty, failure, and archived states. Creation requires a selected
Workspace.

The Studio provides title/summary metadata, rich content authoring, save/conflict
feedback, ordered claims, citations, relationships, backlinks, versions, review,
and lifecycle controls. Applicable capabilities appear only when their contracts
exist. Keyboard/focus behavior and destructive confirmations are mandatory.

Animated graphs, general chat, semantic search, automatic canonical promotion,
and AI-authored claims are excluded from the initial route.

## Migration and compatibility

Legacy rows are never silently assigned to a Workspace. The migration records
unassigned rows for user-directed remediation. Existing content, category, tags,
timestamps, and `linked_page_ids` are preserved.

The JSON `linked_page_ids` field becomes read-only compatibility data after typed
edges are backfilled conservatively. Ambiguous, missing, self, or cross-Workspace
IDs are reported rather than invented. Physical `project_id` remains a storage
compatibility name while public contracts use `workspaceId`.

## Execution passes

### Pass 1 — Aggregate contracts and schema

Status: **Authorized next implementation boundary**

1. Add canonical Knowledge OpenAPI contracts requiring `workspaceId`.
2. Define lifecycle, review, ownership, optimistic version, owner, summary, slug,
   review date, archive timestamp, and supersession fields.
3. Append the ordered SQLite migration; never edit prior migrations.
4. Backfill legacy rows conservatively and create a migration/audit report.
5. Add typed `knowledge_relationships`, but defer claim/citation tables to Pass 2.
6. Replace normal hard deletion with archive/restore.
7. Append Knowledge events atomically and make Activity projection-driven.
8. Rebuild Knowledge FTS5 from active records only.
9. Regenerate React/Zod clients and update current UI creation/save/archive flows.
10. Verify fresh/upgrade migrations, stale-write conflicts, Workspace guards,
    relationship invariants, event atomicity, replay, search, and type safety.

Pass 1 explicitly excludes claims, citations, Knowledge Intelligence, graph
visualization, automatic classification, and semantic/vector search.

### Pass 2 — Claims, citations, and versions

Status: **Proposed; not authorized**

Add ordered claims, Evidence source-version/locator citations, checkpoints,
review history, typed backlinks, and complete Studio panels.

### Pass 3 — Integrated experience and conformance

Status: **Proposed; not authorized**

Complete browser/Electron workflows, recovery and accessibility matrices,
performance benchmarks, compatibility retirement evidence, and the L3 decision.

### Pass 4 — Knowledge Intelligence

Status: **Future; requires separate evidence**

Consider deterministic freshness, coverage, contradiction, duplicate, and query
capabilities only after L3. Each capability requires version, watermark,
invalidation, explanations, evidence references, abstention, and human authority.

## Conformance gates

Route 04 cannot advance beyond L1 unless the applicable gates pass:

- domain correctness: ownership, lifecycle, claims, citations, relationships;
- contract completeness: documented commands, errors, and generated clients;
- traceability: citations resolve to governed Evidence source versions/locators;
- recovery: state and event are atomic; projections rebuild;
- accessibility: Library/Studio keyboard, focus, status, and conflict states;
- performance: named catalogue, search, detail, save, and citation workloads;
- security: Workspace boundaries and Evidence content authorization;
- observability: projection/review failures remain visible; and
- explainability: any derived support/freshness result identifies its method and
  evidence.

## Exit decision

This dossier accepts Route 04 at **L1 Defined** and authorizes only Pass 1.
Implementation evidence is required before L2. Route 03 remains governed and is
consumed through its public Evidence/source/locator contracts.
