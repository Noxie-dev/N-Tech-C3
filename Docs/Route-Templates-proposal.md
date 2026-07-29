# Templates Route Proposal

Status: **Proposed — architecturally approved, not authorized for implementation**
RDF version: **1.0**
Owner: Template domain
Last reviewed: 2026-07-29

## Route DNA

```yaml
route_id: templates
path: /templates
status: proposed-expansion
maturity: L1
mission: >
  Preserve repeatable expertise as governed blueprints that can safely
  create consistent domain objects and workflows.
domain_owner: Template
experience_pattern:
  - Library
  - Inspector
primary_capabilities:
  - Browse Templates
  - Preview Template
  - Create Template
  - Apply Template
  - Govern Template Versions
primary_inputs:
  - Approved domain structures
  - Existing Template versions
  - Explicit user-authored blueprint content
primary_outputs:
  - Validated creation plans
  - New domain objects
  - Template application records
platform_services:
  - Search
  - Events
  - Versioning
  - Jobs
intelligence_capabilities:
  - Completeness
  - Duplicate Suggestions
  - Improvement Recommendations
human_approval:
  - Official promotion
  - Template replacement
  - Multi-object application
dependencies:
  - Target-domain contracts
  - Workspace ownership
  - Transactional events
acceptance_evidence:
  - Schema validation tests
  - Preview and application tests
  - Rollback tests
  - Performance benchmarks
```

## Mission

Templates preserve repeatable expertise as reusable, versioned, governed
blueprints. They encode approved structure, parameters, validation, checklists, and
application policy rather than acting as pre-filled documents.

The route presents Template capabilities. It is not a productivity engine,
acceleration layer, workflow owner, or bypass around target-domain invariants.

## Current implementation boundary

The existing L2 catalogue seed supports list/type filter, create, read, update,
permanent delete, FTS5 indexing, and archived-Workspace mutation guards. SQLite
stores title, type, content, description, and optional physical `project_id`.

The UI has no detail/editor route, its Edit Blueprint action is non-functional,
Workspace ownership is not exposed in the canonical Template API, and there is no
preview, application, lifecycle, version, lineage, variable, validation, usage, or
provenance model. Creation still uses legacy Activity writing.

This current functionality MUST NOT be described as the proposed Template Library.

## Proposed domain definition

> A Template is a versioned, governed blueprint that produces a validated creation
> plan for one supported target capability.

Templates do not own generated objects. Target domains validate and own every
created Workspace, Story, Knowledge page, Campaign, Evidence record, or Output.

Before implementation, Specification 01 Domain Model requires an explicit,
change-controlled amendment accepting the Template aggregate, lifecycle,
relationships, and ownership rules.

## Capability progression

### Phase 1 — Content and single-object templates

- Story structures
- Knowledge page structures
- Output formats
- Checklists
- Metadata defaults

One Template application produces one target-domain command.

### Phase 2 — Domain-object blueprints

Templates may create validated Stories, Campaigns, Knowledge pages, or Repository
audit requests. Each target domain remains the authority for required fields,
lifecycle, relationships, and failure behavior.

### Phase 3 — Workspace blueprints

Workspace blueprints are deferred until provisioning contracts exist. They require
dry-run validation, full creation-plan preview, explicit confirmation, idempotency,
conflict detection, transactional or compensating execution, audit history, and
rollback/recovery evidence.

### Phase 4 — Workflow templates

Workflow templates are orchestration definitions and depend on accepted job,
retry, cancellation, compensation, permission, plugin, event, and observability
contracts. They are not part of initial Template implementation.

## Template and version model

```text
Template
├── identity, scope, governance, and lineage
├── current active version
└── immutable Template Versions
    ├── target capability and compatibility version
    ├── typed parameter schema
    ├── blueprint
    ├── validation rules
    ├── optional checklist
    ├── optional dependencies
    └── application policy
```

Proposed lifecycle:

```text
Draft → Review → Approved → Active → Deprecated → Archived
```

Published/active versions are immutable. Editing creates a new version. Updating a
Template never silently changes objects previously created from it.

## Variables

The initial variable language MUST use:

- declared variables only;
- explicit types and required/default state;
- deterministic resolution;
- an allowlisted context;
- output-specific escaping;
- bounded expansion size; and
- validation before object creation.

Arbitrary JavaScript, shell execution, unrestricted expressions, and secrets in
events or application logs are prohibited. Canonical names such as
`Workspace.Status` replace legacy Project terminology.

## Application provenance

Every application records:

- Template ID and exact version;
- application ID and time;
- subject Workspace;
- user-provided parameters;
- resolved non-secret values;
- target command and created object IDs;
- validation results and warnings; and
- completion, rollback, or compensation state.

## Governance and categories

Actions use governance language: submit for review, approve, activate, deprecate,
replace, and archive. “Publish to Library” is avoided because it conflicts with
content publishing and implies an unapproved external marketplace.

Categories are governed browsing intents rather than a permanent hard-coded enum.
Templates separately identify target type, intent, tags, scope, and governance
state.

## Conformance and measurement

Template conformance covers variable resolution, target-schema validity,
dependency integrity, deprecated references, and checklist structure.

Governance state covers owner, review currency, active version, and replacement
state. Route telemetry covers search latency, preview/application failures,
rollback, and abandonment. Usage may report applications, completions, active
Workspaces, and version distribution.

Time saved and success rate MUST NOT be claimed without an accepted collection and
interpretation method.

## Intelligence

All Intelligence remains under the single EIE:

- Template Conformance
- Template Similarity
- Duplicate Suggestions
- Improvement Recommendations

Deterministic progression begins with normalized equality, structural signatures,
and FTS5/TF-IDF. Suggestions require human review. AI-generated Templates remain
Draft and visibly model-assisted. Usage data does not silently alter Templates or
train external providers.

## Lineage

Lineage distinguishes:

1. version history within one Template;
2. derivation of a new Template from another;
3. replacement or supersession;
4. application provenance linking a version to generated objects.

These relationships may share one explorer but retain separate semantics.

## Initial implementation scope

The first authorized execution plan SHOULD cover:

1. Template detail/editor;
2. Vault/Workspace scope;
3. governance lifecycle and immutable versions;
4. one target capability, preferably Story;
5. typed variables and deterministic preview;
6. validated target-domain application;
7. application provenance and durable events;
8. archive/restore instead of normal hard delete; and
9. preview, validation, atomicity, provenance, and guard tests.

Workspace blueprints, drag-and-drop composition, workflow orchestration, AI
generation, adaptive recommendations, and marketplace behavior are deferred.

## Dependencies and sequencing

```text
NB3RP Pass 3 specifications and benchmarks
    ↓
Route 03 Evidence provenance foundation
    ↓
Target-domain Template contract
    ↓
Single-object Story Template application
    ↓
Additional targets
    ↓
Workspace blueprints
    ↓
Workflow Templates and Intelligence assistance
```

This proposal does not authorize implementation or displace the active platform
definition and Evidence Vault sequence.

## Amendment history

- 2026-07-29: Proposed route architecturally approved after RDF v1 revision.
