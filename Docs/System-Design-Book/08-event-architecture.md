# Specification 08 — Event Architecture

Status: **Accepted**
Owner: Platform Architecture
Last reviewed: 2026-07-30

## Purpose

Provide durable domain facts for projections and Intelligence without adopting full
event sourcing.

## Decision

N-Tech C³ uses a **transactional outbox/domain-event log**. Current entity tables
remain authoritative state. Events describe meaningful committed facts.

Activity is a projection and MUST NOT be the event source of truth.

## Event envelope

```ts
type DomainEvent<T = unknown> = {
  id: number;
  eventId: string;
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: number;
  payload: T;
  occurredAt: string;
};
```

## Normative rules

- Event type names use past-tense facts: `WorkspaceCreated`, `StoryUpdated`.
- Event schemas are versioned independently from application versions.
- Event append MUST be atomic with the domain mutation.
- Consumers MUST be idempotent.
- Consumers MUST checkpoint only after successful projection work.
- A failed consumer MUST NOT block unrelated domain writes.
- Replay MUST rebuild a projection from a known watermark.
- Events MUST NOT contain secrets, unrestricted absolute paths, or unnecessary
  binary content.
- Payloads contain stable IDs and changed facts, not UI state.

## Initial consumers

- Activity projection
- Intelligence capability dispatcher
- Future Search projection
- Future Timeline projection
- Future metrics/recommendation projections

## Failure model

- Domain transaction failure writes neither state nor event.
- Consumer failure retains its previous checkpoint.
- Reprocessing the same event produces the same projection result.
- Unknown event versions are quarantined and surfaced diagnostically.

## Scope boundary

Not every keystroke or page visit is a domain event. Meaningful facts include:

- Workspace created, updated, archived, restored;
- Story created, updated, transitioned, archived, restored;
- Evidence captured or linked;
- repository scanned;
- Output created, readied, or published.

`OutputCreated`, `OutputReadied`, and `OutputPublished` remain historical
compatibility vocabulary. New Route 06 facts use Publication, Rendition, Channel,
and Deployment events.

## Route 06 event contract

Pass 1A accepts these v1 event families. Exact generated payload schemas are Pass
1B/2/3 executable work, but they MUST conform to the following stable facts and
exclusions.

### Publication facts

- `PublicationCreated`
- `PublicationDraftUpdated`
- `PublicationSubmittedForReview`
- `PublicationVersionApproved`
- `PublicationRevisionCreated`
- `PublicationSuperseded`
- `PublicationArchived`
- `PublicationRestored`

Publication payloads identify Publication, Workspace, primary Story, aggregate
version, Publication version where applicable, change summary, actor, and source
watermark. Content bodies are excluded unless an accepted consumer requires a
bounded snapshot reference.

### Relationship and Variant facts

- `StoryLinkedToPublication`
- `StoryUnlinkedFromPublication`
- `PublicationLinkedToCampaign`
- `PublicationUnlinkedFromCampaign`
- `PublicationVariantCreated`
- `PublicationVariantUpdated`
- `PublicationVariantArchived`

Relationship payloads include source/target IDs, role/type, order where
applicable, Workspace, and aggregate/edge versions.

### Channel and Connection facts

- `ChannelCreated`
- `ChannelDefinitionUpdated`
- `ChannelDeprecated`
- `ChannelConnectionCreated`
- `ChannelConnectionUpdated`
- `ChannelConnectionDisabled`

Connection payloads MAY contain Connection ID, scope, Channel ID/version,
non-secret display name, and capability snapshot watermark. Credential references,
destination secrets, tokens, and provider response bodies are prohibited.

### Rendition and Deployment facts

- `RenditionGenerationRequested`
- `RenditionGenerated`
- `RenditionGenerationFailed`
- `DeploymentPlanned`
- `DeploymentValidated`
- `DeploymentScheduled`
- `DeploymentRescheduled`
- `DeploymentUnscheduled`
- `DeploymentApproved`
- `DeploymentStarted`
- `DeploymentSucceeded`
- `DeploymentFailed`
- `DeploymentCancelled`
- `RetractionRequested`
- `DeploymentRetracted`

Rendition events identify immutable source/version/watermark, generator/version,
format, checksum, byte size, and Vault-relative managed path after successful
promotion.

Deployment events identify Deployment, Workspace, immutable source,
Connection/Channel/adapter versions, aggregate version, planned UTC time and IANA
timezone, idempotency key hash/reference, attempt number, outcome classification,
external identity when safe, and redacted diagnostic code. Raw credential,
authorization header, provider request/response body, and user content are
prohibited.

## Ordering, replay, and correction

- Ordering is guaranteed only within one aggregate/event-log commit sequence;
  consumers MUST NOT assume global business ordering across aggregates.
- Deployment attempt number is monotonic within one Deployment.
- Reschedule and unschedule are new facts; historical schedule events remain.
- Provider outcome correction uses a new reconciliation/correction event and never
  edits an existing event.
- Pipeline and Calendar consumers replay Publication, Campaign, and Deployment
  facts from explicit watermarks.
- Unknown Route 06 event versions are quarantined without blocking unrelated
  domain writes or job processing.
- Activity projections summarize facts without copying content or sensitive
  provider diagnostics.

## Acceptance evidence

- Atomic rollback test.
- Idempotent Activity projection test.
- Replay-from-zero test.
- Unknown-version handling test.
- Route 06 payload redaction/size/schema tests.
- Pipeline and Calendar replay-from-zero/idempotency tests.
- Deployment attempt ordering and outcome-correction tests.

## Amendment history

- 2026-07-29: Transactional outbox accepted; full event sourcing rejected for the
  current platform stage.
- 2026-07-30: ADR-002 accepted Route 06 Publication, Channel, Connection,
  Rendition, and Deployment event families, redaction rules, ordering, replay, and
  correction semantics.
