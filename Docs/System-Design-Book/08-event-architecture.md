# Specification 08 — Event Architecture

Status: **Accepted**
Owner: Platform Architecture
Last reviewed: 2026-07-29

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

## Acceptance evidence

- Atomic rollback test.
- Idempotent Activity projection test.
- Replay-from-zero test.
- Unknown-version handling test.

## Amendment history

- 2026-07-29: Transactional outbox accepted; full event sourcing rejected for the
  current platform stage.
