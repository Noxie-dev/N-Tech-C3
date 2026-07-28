# Specification 02 — Data Architecture

Status: **Accepted**
Owner: Data Architecture
Last reviewed: 2026-07-29

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

## Deletion and retention

- Workspace and Story use reversible archive in normal workflows.
- Evidence content is immutable or versioned; provenance MUST remain auditable.
- Relationship removal deletes the edge, not the target.
- Hard deletion requires a maintenance policy, dependency checks, and backup or
  recovery evidence.
- Domain events are append-only; correction occurs through compensating events.

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

## Open questions

- Blob catalogue/CAS migration schema.
- Event retention and compaction policy.
- Final removal release for legacy Project storage names.

## Amendment history

- 2026-07-29: Initial accepted data architecture.
