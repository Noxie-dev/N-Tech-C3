# Specification 06 — Platform Services

Status: **Accepted**
Owner: Platform Architecture
Last reviewed: 2026-07-30

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

| Service         | Responsibility                                     | Explicit boundary                         |
| --------------- | -------------------------------------------------- | ----------------------------------------- |
| Vault           | Safe active-Vault access and managed paths         | Does not own domain metadata              |
| Database        | SQLite connection, transactions, migrations        | Does not encode domain policy             |
| Event runtime   | Durable append, consumers, checkpoints, quarantine | Not full event sourcing                   |
| Job             | Bounded scheduling, cancellation, retry, recovery  | Does not choose business actions          |
| Search          | FTS5 projection, query, rebuild                    | Semantic insight remains EIE capability   |
| Relationship    | Typed edge persistence and inverse projections     | Domains define permitted relationships    |
| Versioning      | Immutable checkpoints and comparisons              | Domains define checkpoint meaning         |
| Export          | Deterministic Rendition generation and manifests   | Does not own Publications                 |
| Backup          | Verified backup and recoverable restore            | Does not silently discard current Vault   |
| Settings        | Validated durable configuration                    | Secrets use OS-secure storage             |
| Channel adapter | Destination capability and delivery adapter        | Does not approve or schedule Publications |
| Deployment      | Durable external-delivery jobs and attempts        | Requires future Publication amendment     |
| Plugin runtime  | Permissioned extension execution                   | Deferred until two real integrations      |

## Route 06 accepted service contracts

Pass 1A accepts the following responsibilities and boundaries. Implementations
remain future work.

### Publication validation service

- Validates Publication and Variant structure against an immutable source version
  and versioned Channel definition.
- Returns deterministic findings with rule ID/version, severity, subject locator,
  explanation, and source watermark.
- Does not approve content, change lifecycle, schedule, or deploy.
- Validation results are snapshots and MUST be invalidated when source or Channel
  definition versions change.

### Export service

- Generates an immutable Rendition from one Publication version or Variant.
- Declares supported formats, generator/version, resource limits, and deterministic
  inputs.
- Uses persisted jobs, staged files, checksum verification, atomic promotion,
  compensation, and restart reconciliation.
- Produces a manifest and `RenditionGenerated` event only after success.
- Does not treat a file format as a Channel or approve a Publication.

### Channel catalogue service

- Creates, versions, queries, deprecates, and validates first-class Channel
  capability definitions.
- Provides format, metadata, scheduling, preview, update, and retraction
  capability queries.
- Does not store configured destinations or credentials.

### Channel Connection service

- Creates and validates explicitly scoped configured destination metadata.
- Stores only an opaque OS-secure credential reference.
- Resolves credential material only inside an authorized main-process/service
  boundary for the duration of an approved operation.
- Redacts credentials and provider payloads from events, logs, diagnostics,
  backups, exports, and Intelligence.
- Does not approve, schedule, retry, or initiate delivery.

### Deployment and Job service

- Persists Deployment commands, jobs, leases, attempts, idempotency, cancellation,
  retry classification, reconciliation, and terminal diagnostics.
- Claims jobs with bounded concurrency and an expiring lease.
- Requires an immutable source watermark, Connection, Channel definition version,
  human approval record, and idempotency key before external delivery.
- Separates `Planned`, `Ready`, and `Scheduled` state from job execution.
- Never silently retries an unknown or partially successful external effect.
- Does not choose the target, approve content, or infer policy authorization.

### Channel adapter service

- Implements one versioned Channel adapter contract.
- Declares supported validation, preview, delivery, update, cancellation,
  reconciliation, and retraction capabilities.
- Accepts one authorized attempt envelope and returns a redacted structured result.
- Must preserve idempotency when the provider supports it and expose limitations
  when it does not.
- Does not access unrelated Vault content or persist credentials.

## Route 06 job and attempt envelope

Every delivery job MUST identify:

- job, Deployment, attempt, Workspace, Connection, Channel, and adapter IDs;
- immutable source kind/ID/version/watermark;
- Channel definition and adapter versions;
- idempotency key;
- approval record;
- planned time and timezone;
- lease owner and expiry;
- retry count and classification;
- cancellation request; and
- redacted diagnostic state.

Credentials are resolved after authorization and excluded from the persisted
envelope.

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
- Time-based jobs persist UTC instants plus the user-selected IANA timezone and
  local intent needed to explain rescheduling.
- Job pickup after restart is idempotent and lease-aware.

## Failure classification

- Validation failure: no state change.
- Transaction failure: no authoritative state or event.
- Projection failure: authoritative fact remains; checkpoint does not advance.
- Retryable job failure: bounded retry with backoff.
- Permanent failure: terminal diagnostic plus user action.
- Partial external effect: reconciliation or compensation; never silent retry
  without idempotency analysis.
- Unknown provider outcome: stop automatic retry, reconcile using external
  identity/idempotency where possible, and require operator action otherwise.
- Unsupported cancellation/retraction: preserve actual external state and explain
  the capability boundary.

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
- Renderer and route code never receive raw Channel credentials.
- Provider authorization is connection- and operation-scoped, short-lived, and
  explicitly attributable to the approving user/policy.

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
- Credential leak/redaction, lease expiry, duplicate delivery, unknown outcome,
  restart reconciliation, cancellation, and unsupported-retraction tests before
  enabling adapters.

## Open decisions

- Persisted job schema and scheduler.
- Projection-lag diagnostics API.
- OS-secure credential adapter.
- Plugin permission manifest and isolation strategy.

## Amendment history

- 2026-07-29: Initial Platform Services constitution accepted.
- 2026-07-30: ADR-002 accepted the Route 06 validation, export, Channel catalogue,
  Connection, Deployment/job, and adapter service boundaries and job envelope.
