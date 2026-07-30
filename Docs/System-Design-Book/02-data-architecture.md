# Specification 02 — Data Architecture

Status: **Accepted**
Owner: Data Architecture
Last reviewed: 2026-07-30

## Authoritative stores

- SQLite is the authoritative structured-data store.
- The filesystem vault is authoritative for managed binary/file content.
- OpenAPI is authoritative for HTTP contracts.
- FTS5, Activity, health scores, recommendations, and backlinks are projections.

## Required SQLite practices

- Foreign keys MUST be enabled.
- WAL mode MUST be enabled for the local desktop database.
- Schema changes MUST use ordered, transactional, append-only migrations.
- Applied migrations MUST NOT be edited.
- Fresh-database and populated-upgrade paths MUST be tested.
- Relationship lookup directions MUST be indexed.
- JSON columns MUST have documented shape and safe parse behavior.
- Timestamps MUST use UTC ISO-8601 values.

## Authoritative versus derived data

Authoritative:

- domain entity records;
- explicit relationship edges;
- lifecycle transitions;
- managed blob identity and provenance;
- accepted settings;
- durable domain events.

Derived and rebuildable:

- Activity feed;
- FTS5 index;
- health and readiness scores;
- backlinks;
- relationship suggestions;
- recommendations;
- analytics and dashboard metrics.

Derived records MUST store algorithm/capability version and input watermark.

## Compatibility

- Physical `projects` and `project_id` names are accepted compatibility debt while
  public product contracts migrate to Workspace terminology.
- Legacy single Story relationship columns may remain during a measured migration
  window while graph tables are canonical.
- Compatibility mappings MUST have a removal condition and cannot expand into new
  product APIs.
- `story_outputs` remains readable compatibility data while Publication consumers
  migrate. It is not a write authority for Publication, Channel, Rendition,
  Deployment, or schedule facts.
- Compatibility inventory and migration findings MUST preserve the original
  Output ID and field values.

## Route 06 conceptual persistence contract

Pass 1A defines the following logical records. It does not create production
tables; physical names and the ordered migration are Pass 1B work.

### Publication aggregate

```text
Publication
- id, workspace_id, primary_story_id
- title, slug, summary
- lifecycle_status
- current_draft_version, latest_approved_version
- owner, tags
- optimistic_version
- archived_at
- created_at, updated_at

PublicationVersion
- id, publication_id, version
- content, editorial_metadata
- source_watermark
- review_status, reviewed_by, reviewed_at
- approved_by, approved_at
- change_summary
- created_at
```

`(publication_id, version)` is unique. Approved version content and editorial
metadata are immutable.

### Relationships and adaptations

```text
PublicationStory
- publication_id, story_id, role, position, contribution_note, version

PublicationEvidence / PublicationKnowledge / PublicationCampaign / PublicationMedia
- publication_id, target_id, relationship_type, created_at

PublicationVariant
- id, publication_id, publication_version_id, channel_id
- title, content, metadata
- lifecycle_status, optimistic_version
- created_at, updated_at
```

Every relationship and Variant shares the Publication Workspace. A Publication has
exactly one `Primary` Story edge.

### Channels and Connections

```text
Channel
- id, key, name, definition_version
- capabilities, validation_contract
- lifecycle_status, optimistic_version
- built_in, created_at, updated_at

ChannelConnection
- id, channel_id
- scope_type, workspace_id
- display_name, destination_identity
- credential_reference
- capability_snapshot, lifecycle_status, optimistic_version
- created_at, updated_at
```

Channel capability and validation fields use versioned, documented JSON shapes.
`credential_reference` is opaque. Credential material is prohibited.

### Renditions

```text
Rendition
- id, publication_id, publication_version_id, variant_id
- format, generator_id, generator_version
- source_watermark, checksum_sha256
- vault_relative_path, byte_size, media_type
- generation_status, created_at
```

A successful Rendition is immutable. Failed/staged generation state belongs to a
recoverable job/ingest record, not to an allegedly complete Rendition.

### Deployments and attempts

```text
Deployment
- id, workspace_id, channel_connection_id
- publication_version_id, variant_id, rendition_id
- lifecycle_status
- planned_for, timezone
- validation_snapshot, approval_record
- idempotency_key, external_identity
- optimistic_version
- last_error_class, cancelled_at, completed_at
- created_at, updated_at

DeploymentAttempt
- id, deployment_id, attempt_number
- adapter_id, adapter_version, idempotency_key
- started_at, finished_at, outcome
- error_class, redacted_diagnostic
- external_identity
```

Exactly one immutable source is selected for each Deployment. The database MUST
enforce source exclusivity, Workspace scope, unique attempt order, and a unique
idempotency key within the Connection/source operation boundary.

### Jobs, audit, and projections

```text
PublicationMigrationAudit
- output_id, issue_code, severity, detail, proposed_action, resolved_at

OutputMigrationMapping
- output_id, publication_id, variant_id, rendition_id, deployment_id
- mapping_method, mapping_version, confirmed_by, created_at

DurableJob / JobAttempt
- command, state, idempotency, lease, retry, cancellation, diagnostic

PipelineProjection / CalendarProjection
- rebuildable consumer-owned records and watermarks
```

Output mappings are append-only audit facts and never destroy the source Output.
Projection tables are derived and may be discarded/rebuilt.

## Route 06 indexing and constraints

- Publication catalogue indexes cover Workspace, lifecycle, owner, and updated
  time.
- Relationship lookup indexes cover both forward and backlink directions.
- Variant identity is unique for its Publication version and Channel where the
  accepted product rule requires one current adaptation.
- Deployment indexes cover Connection, lifecycle, planned time, oldest job age,
  and source identity.
- Attempt and failure indexes support reconciliation and operator diagnostics.
- FTS5 indexes active Publications and approved-version text according to an
  accepted domain mapping; it does not index secrets or provider payloads.

## Deletion and retention

- Workspace and Story use reversible archive in normal workflows.
- Evidence content is immutable or versioned; provenance MUST remain auditable.
- Relationship removal deletes the edge, not the target.
- Hard deletion requires a maintenance policy, dependency checks, and backup or
  recovery evidence.
- Domain events are append-only; correction occurs through compensating events.
- Successful Renditions and Deployment attempts remain auditable after archive.
- Output compatibility rows MUST remain until the accepted removal gate passes.

## Event/outbox tables

The platform MUST provide:

```text
domain_events
- id
- event_id
- event_type
- event_version
- aggregate_type
- aggregate_id
- payload
- occurred_at

event_consumers
- consumer_name
- last_event_id
- updated_at
```

Domain writes and event append MUST share one SQLite transaction when the operation
is part of the new event architecture.

## Derived Intelligence records

The accepted minimum contract contains:

- result ID;
- capability ID and version;
- result kind;
- subject type and ID;
- input event watermark or entity version;
- deterministic/probabilistic classification;
- value/payload;
- explanation;
- evidence references;
- confidence where applicable;
- calculated and invalidated timestamps.

## FTS5

- FTS5 remains the exact local search fast path.
- Search projections MUST be rebuildable.
- Indexed fields and boosts MUST be declared by domain.
- Semantic/vector search cannot replace FTS5 without an accepted amendment.

## Acceptance evidence

- Migration idempotency and foreign-key tests.
- Transaction rollback test proving event and domain write atomicity.
- Consumer replay/idempotency tests.
- Publication/Version immutability and Workspace-boundary tests.
- Channel Connection credential-exclusion tests.
- Deployment source-exclusivity, idempotency, and attempt-order tests.
- Conservative Output inventory/mapping/rollback tests.

## Open questions

- Blob catalogue/CAS migration schema.
- Event retention and compaction policy.
- Final removal release for legacy Project storage names.

## Amendment history

- 2026-07-29: Initial accepted data architecture.
- 2026-07-30: ADR-002 added the Route 06 conceptual persistence, indexing,
  compatibility, idempotency, and projection contract without creating production
  schema.
