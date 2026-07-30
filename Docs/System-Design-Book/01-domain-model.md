# Specification 01 — Domain Model

Status: **Accepted**
Owner: Product Architecture
Last reviewed: 2026-07-30

## Purpose

Define authoritative domain ownership independently from storage and UI.

## Aggregate hierarchy

```text
Vault
├── Workspaces
│   ├── Stories
│   ├── Repositories
│   ├── Evidence
│   ├── Knowledge
│   ├── Campaigns
│   ├── Publications
│   │   ├── Publication Versions
│   │   ├── Publication Variants
│   │   ├── Renditions
│   │   └── Deployments
│   └── Media
├── Channel Catalogue
│   └── Channel Connections (explicit Vault or Workspace scope)
└── Global Settings
```

## Domain rules

### Vault

- Owns the portable local database, files, schema version, global settings,
  plugins, backups, and integrity state.
- A desktop installation MAY open multiple Vaults in the future, but only one Vault
  is active in a process at a time.
- Vault-relative content MUST NOT depend on absolute machine paths.

### Workspace

- Is the operating context for one initiative.
- Owns Workspace DNA, lifecycle, repositories, and the default scope of child
  entities.
- Lifecycle: `Active → Archived`; `Corrupted` is an integrity state, not a normal
  workflow stage.
- Archived Workspaces are read-only until restored.
- Workspace deletion MUST NOT be a normal product action.

### Story

- Is the intellectual product that transforms Evidence and Knowledge into a
  coherent narrative that may produce Publications.
- Belongs to exactly one Workspace for all newly created Stories.
- Lifecycle:
  `Idea → Research → EvidenceGathering → Outline → Draft → Review → Approved → Published → Archived`.
- Lifecycle transitions MUST be validated and recorded.
- A Published Story requires at least one successful Deployment of a Publication
  for which it is the primary Story.
- Story content is canonical HTML. Markdown delivery is a Rendition, while legacy
  Markdown Outputs remain compatibility records.
- During the measured Output migration window, an existing Published Story that
  satisfied the former ready/published Output rule remains valid. New canonical
  transitions use Deployment evidence only after the Route 06 feature flag is
  accepted and enabled.

### Evidence

- Is a provenance-bearing artifact that supports, challenges, or contextualizes a
  claim.
- MUST classify its epistemic nature as `FactualRecord`, `Observation`,
  `Testimony`, `DerivedAnalysis`, or `ExternalReference`.
- Belongs to exactly one Workspace in new flows and MAY link to many Stories and,
  through accepted future contracts, Knowledge, Publications, and other domains.
- Source payloads are immutable or replaced through a new source version.
- Binary content is linked, not copied per relationship.
- Evidence provenance MUST survive title, tag, and relationship changes.
- Lifecycle, review, integrity, index state, and relationship state are independent
  dimensions.
- Lifecycle and review are authoritative domain facts; integrity is a versioned
  EIE result; indexing, backlinks, and link counts are rebuildable projections.
- Archive/restore is the normal removal workflow. Permanent deletion MUST NOT be a
  normal product action.

### Knowledge

- Is durable explanatory or reference material.
- Belongs to one Workspace unless explicitly global in a future accepted amendment.
- Knowledge links are typed; backlinks are projections.

### Campaign

- Organizes communication objectives and Story/Publication coordination.
- Belongs to one Workspace.
- Campaign membership does not own or duplicate Story or Publication content.

### Publication

- Is a governed, versioned, channel-neutral content package prepared for
  distribution.
- Belongs to exactly one active Workspace and initially references exactly one
  primary Story from that Workspace.
- Publication content MAY diverge from Story content but MUST NOT overwrite or
  replace Story truth.
- Lifecycle: `Draft → Review → Approved → Superseded → Archived`.
- Approved Publication versions are immutable. Revision creates a new version.
- Additional Story, Evidence, Knowledge, Media, and Campaign relationships are
  explicit typed edges and do not transfer ownership.
- Publication does not own destination capabilities, configured destination
  identity, generated files, schedules, attempts, or delivery outcomes.

### Publication Version

- Is an immutable snapshot of Publication content and editorial metadata.
- Records its source Publication, version number, change summary, author,
  approval/review facts, and source watermark.
- An approved version MUST NOT be edited in place.

### Publication Variant

- Is an editable Channel-specific adaptation of exactly one Publication version.
- Belongs to the Publication Workspace and targets exactly one first-class
  Channel.
- Variant content MAY diverge editorially without replacing its Publication
  version or primary Story.

### Channel

- Is a first-class destination capability definition, not a platform string or
  export format.
- Defines supported content/media formats, validation constraints, required
  metadata, scheduling, preview, update, and retraction capabilities.
- Is held in the Vault Channel catalogue and MAY be built-in or user-defined.
- Does not contain provider credentials or configured destination identity.

### Channel Connection

- Is a configured destination for exactly one Channel.
- Has explicit `Vault` or `Workspace` scope; new Route 06 flows default to
  Workspace scope.
- Stores non-secret destination identity and an opaque credential reference only.
- Credential material MUST remain in OS-secure storage and MUST NOT appear in
  SQLite, events, logs, backups, exports, or Intelligence results.

### Rendition

- Is an immutable generated artifact derived from one Publication version or
  Publication Variant.
- Records format, generator/version, checksum, source watermark, generation time,
  and Vault-relative path.
- PDF, Markdown, HTML, DOCX, and JSON are Rendition formats, not Channels.

### Deployment

- Is a durable planned or attempted delivery of one immutable Publication
  version, Variant, or Rendition through one Channel Connection.
- Owns planned time, timezone, validation, approval, idempotency, attempt history,
  external identity, delivery outcome, cancellation, and capability-dependent
  retraction.
- Lifecycle:
  `Planned → Validating → Ready → Scheduled → Deploying → Succeeded | Failed | Cancelled`.
- Optional retraction uses `RetractionRequested → Retracted` only when the Channel
  supports it.
- A Publication has no authoritative `Published` state because its independent
  Deployments may have different outcomes.

### Pipeline and Calendar

- Pipeline is a rebuildable operational projection over Publication and
  Deployment state.
- Calendar is a rebuildable temporal projection over Deployments, Campaign
  milestones, and accepted future date-bearing domains.
- Neither route owns lifecycle, schedule, readiness, milestone, or delivery facts.

### Repository

- Represents a user-approved local source repository.
- Repository snapshots are immutable observations with analysis provenance.
- Repository analysis MUST NOT execute repository code.

### Media

- Represents reusable visual, audio, video, or document assets.
- Binary identity is distinct from metadata and domain links.

### Output

- Is deprecated compatibility terminology for the current `story_outputs` seed.
- Remains a Story-linked record during the measured Route 06 migration window.
- MUST NOT be silently renamed, grouped, or promoted into a Publication.
- Free-text type, format, destination, and status MUST NOT create a Channel,
  Channel Connection, Rendition, Deployment, or schedule without an accepted
  deterministic mapping and preserved original identity.
- Receives no new target-architecture responsibility.

## Relationship invariants

- Cross-Workspace links are denied by default.
- Relationships MUST define source, target, type, timestamps, and deletion behavior.
- Links MUST NOT duplicate the target entity.
- Broken references are integrity failures and MUST be visible.
- Derived backlinks MUST be rebuildable from authoritative forward edges.
- A Publication has exactly one primary Story and MAY reference additional
  Stories; all MUST share its Workspace.
- A Story MAY produce many Publications.
- A Campaign MAY coordinate many Publications without owning their content.
- A Publication Version MAY have many Variants and Renditions.
- A Variant targets exactly one Channel.
- A Connection targets exactly one Channel and has one explicit scope.
- A Deployment targets exactly one immutable source and one Connection.
- Removing a relationship deletes the edge, not its Story, Publication, Campaign,
  Channel, or historical Deployment target.

## Ownership rule

> Domains own truth; Intelligence derives insight.

Scores, classifications, suggestions, and recommendations are derived and MUST NOT
silently mutate authoritative domain facts.

## Acceptance evidence

- SQLite foreign-key migration tests.
- API lifecycle and cross-Workspace conflict tests.
- Route 01 and Route 02 invariant audit.
- Accepted Route 03 RDF v1 dossier and ADR-001.
- ADR-002 Publication and delivery ownership decision.
- Route 06 Output inventory/migration contract.

## Open questions

- Formal Vault switching model.
- Whether global Knowledge is required.
- Final Media versus Asset terminology.

## Amendment history

- 2026-07-29: Initial accepted platform domain model.
- 2026-07-29: ADR-001 broadened Evidence beyond objectively factual artifacts,
  required explicit classification and Workspace ownership, separated lifecycle,
  review, integrity, indexing, and relationship state, and adopted archive-first
  removal.
- 2026-07-30: ADR-002 accepted Publication, Publication Version, Variant, Channel,
  Connection, Rendition, and Deployment ownership; made Pipeline and Calendar
  projections; and restricted Output to compatibility status.
