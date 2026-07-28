# Specification 01 — Domain Model

Status: **Accepted**
Owner: Product Architecture
Last reviewed: 2026-07-29

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
│   └── Media
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
  coherent narrative and Outputs.
- Belongs to exactly one Workspace for all newly created Stories.
- Lifecycle:
  `Idea → Research → EvidenceGathering → Outline → Draft → Review → Approved → Published → Archived`.
- Lifecycle transitions MUST be validated and recorded.
- A Published Story requires at least one ready or published Output.
- Story content is canonical HTML; Markdown is an Output.

### Evidence

- Is an immutable-or-versioned factual artifact with provenance and integrity
  metadata.
- Belongs to one Workspace in new flows and MAY link to many Stories.
- Binary content is linked, not copied per relationship.
- Evidence provenance MUST survive title, tag, and relationship changes.

### Knowledge

- Is durable explanatory or reference material.
- Belongs to one Workspace unless explicitly global in a future accepted amendment.
- Knowledge links are typed; backlinks are projections.

### Campaign

- Organizes communication objectives and Story/Output coordination.
- Belongs to one Workspace.
- Campaign membership does not own or duplicate Story content.

### Repository

- Represents a user-approved local source repository.
- Repository snapshots are immutable observations with analysis provenance.
- Repository analysis MUST NOT execute repository code.

### Media

- Represents reusable visual, audio, video, or document assets.
- Binary identity is distinct from metadata and domain links.

### Output

- Is a deliverable derived from a Story.
- Owns format, destination, readiness, publication status, and publication time.
- Output content MAY diverge from its source Story without replacing Story truth.

## Relationship invariants

- Cross-Workspace links are denied by default.
- Relationships MUST define source, target, type, timestamps, and deletion behavior.
- Links MUST NOT duplicate the target entity.
- Broken references are integrity failures and MUST be visible.
- Derived backlinks MUST be rebuildable from authoritative forward edges.

## Ownership rule

> Domains own truth; Intelligence derives insight.

Scores, classifications, suggestions, and recommendations are derived and MUST NOT
silently mutate authoritative domain facts.

## Acceptance evidence

- SQLite foreign-key migration tests.
- API lifecycle and cross-Workspace conflict tests.
- Route 01 and Route 02 invariant audit.

## Open questions

- Formal Vault switching model.
- Whether global Knowledge is required.
- Final Media versus Asset terminology.

## Amendment history

- 2026-07-29: Initial accepted platform domain model.
