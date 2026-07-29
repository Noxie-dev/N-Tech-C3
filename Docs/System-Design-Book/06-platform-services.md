# Specification 06 — Platform Services

Status: **Accepted**
Owner: Platform Architecture
Last reviewed: 2026-07-29

## Purpose

Define shared capabilities that support domains without taking ownership of domain
truth, lifecycle, or user-interface state.

## Service contract

Every Platform Service MUST define:

- stable name and owner;
- purpose and explicit non-responsibilities;
- commands, queries, events, and result contracts;
- dependencies and authorization boundary;
- lifecycle, cancellation, retry, and idempotency;
- failure, recovery, and degraded behavior;
- observability and diagnostic state; and
- representative performance and resource budgets.

## Initial catalogue

| Service | Responsibility | Explicit boundary |
| --- | --- | --- |
| Vault | Safe active-Vault access and managed paths | Does not own domain metadata |
| Database | SQLite connection, transactions, migrations | Does not encode domain policy |
| Event runtime | Durable append, consumers, checkpoints, quarantine | Not full event sourcing |
| Job | Bounded scheduling, cancellation, retry, recovery | Does not choose business actions |
| Search | FTS5 projection, query, rebuild | Semantic insight remains EIE capability |
| Relationship | Typed edge persistence and inverse projections | Domains define permitted relationships |
| Versioning | Immutable checkpoints and comparisons | Domains define checkpoint meaning |
| Export | Deterministic Rendition generation and manifests | Does not own Publications |
| Backup | Verified backup and recoverable restore | Does not silently discard current Vault |
| Settings | Validated durable configuration | Secrets use OS-secure storage |
| Channel adapter | Destination capability and delivery adapter | Does not approve or schedule Publications |
| Deployment | Durable external-delivery jobs and attempts | Requires future Publication amendment |
| Plugin runtime | Permissioned extension execution | Deferred until two real integrations |

## Domain and EIE boundary

```text
Domain command
    ↓
Domain service validates and writes truth + event
    ↓
Platform Services persist, project, schedule, search, export, or deliver
    ↓
EIE capabilities derive explainable insight
```

Platform Services MUST NOT silently redefine domain status, ownership,
relationships, Health meaning, or approval.

## Events and jobs

- New canonical mutations append durable events atomically with SQLite state.
- Consumers are idempotent, checkpointed, replayable, and quarantined on unknown
  versions.
- Long-running work uses persisted jobs rather than HTTP request lifetime.
- Jobs declare resource limits, cancellation, retry classification, and
  compensation.
- External side effects use idempotency keys where supported.
- Projection lag and failure MUST be diagnosable.

## Failure classification

- Validation failure: no state change.
- Transaction failure: no authoritative state or event.
- Projection failure: authoritative fact remains; checkpoint does not advance.
- Retryable job failure: bounded retry with backoff.
- Permanent failure: terminal diagnostic plus user action.
- Partial external effect: reconciliation or compensation; never silent retry
  without idempotency analysis.

## Observability

Services expose structured logs and, where applicable:

- current state and version;
- queue depth and oldest age;
- consumer watermark and lag;
- attempts, failures, and quarantine count;
- duration and resource use; and
- recovery or operator action.

Decorative telemetry MUST NOT be presented as live operational state.

## Security

- Least privilege applies to filesystem, provider, repository, Channel, and plugin
  access.
- Secrets use OS-secure storage and are referenced indirectly.
- IPC and plugin inputs are validated.
- External content requires explicit authorization.
- Service events and diagnostics exclude secrets and unnecessary content.

## Compatibility

Current direct Activity writes and synchronous route-owned operations are migration
debt. New work MUST use accepted service contracts. Legacy paths may remain only
with documented removal conditions and cannot become dependencies of new features.

## Acceptance evidence

- Atomic domain-write/event tests.
- Consumer replay, quarantine, and idempotency tests.
- Job cancellation/retry/recovery tests before job-backed features.
- Search rebuild tests.
- Backup/restore recovery tests.
- Service performance and failure-injection evidence.

## Open decisions

- Persisted job schema and scheduler.
- Projection-lag diagnostics API.
- OS-secure credential adapter.
- Plugin permission manifest and isolation strategy.

## Amendment history

- 2026-07-29: Initial Platform Services constitution accepted.
