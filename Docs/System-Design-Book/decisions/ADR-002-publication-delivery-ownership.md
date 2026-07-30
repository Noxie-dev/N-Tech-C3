# ADR-002 — Publication and Delivery Ownership

Status: **Accepted**

Owner: Product Architecture / Publication Domain / Delivery Platform Services

Date: 2026-07-30

## Context

The original Route 06 architecture described a Publishing Pipeline that owned the
full idea-to-publication lifecycle. That model conflicts with the accepted C³
Canon because one route or generic lifecycle would own content, destinations,
generated files, scheduling, attempts, and provider state.

The repository currently contains only `story_outputs`, Story-side Draft Output
creation, and historical Output events. It has no canonical Publication,
Channel, Connection, Variant, Rendition, Deployment, or delivery-job contract.
Silently renaming Outputs would erase ambiguity in legacy type, destination,
format, grouping, and status fields.

## Decision

**Publication** and **Channel** are canonical, non-negotiable domain terms:

- Publication owns Workspace-scoped, channel-neutral content, primary Story
  provenance, review, and immutable approved versions.
- Publication Variant owns an editable Channel-specific adaptation of one
  Publication version.
- Channel owns destination semantics and capability definitions.
- Channel Connection identifies a configured destination. Credential material
  remains in OS-secure storage and is referenced only by an opaque identifier.
- Rendition owns an immutable generated file and its checksum, generator, source
  watermark, manifest, and Vault-relative path.
- Deployment owns target, planned time and timezone, validation, approval,
  attempts, idempotency, outcome, external identity, cancellation, and optional
  retraction.
- Campaign owns communication objectives and milestones, not Publication content
  or delivery state.
- Pipeline and Calendar are rebuildable projections over authoritative domain
  facts.

Publication and Deployment have separate lifecycles. A Publication has no
authoritative `Published` state because its Deployments can have independent
outcomes.

The durable event/outbox model remains authoritative; this decision does not
adopt full event sourcing. Provider adapters and external delivery remain
unauthorized until later Route 06 gates are separately accepted.

## Compatibility impact

- Existing Outputs remain valid compatibility records and retain their original
  identifiers and values.
- Output reads remain available during a measured migration window.
- No Output is automatically grouped with another Output.
- Free-text destinations cannot create Channel Connections.
- A provisional Channel mapping is permitted only when an accepted deterministic
  mapping is unambiguous and the original value remains available.
- Historical Output events remain readable but cannot be emitted as canonical
  Publication or Deployment facts.
- Compatibility cannot be retired until inventory, migration, rollback,
  backup/restore, consumer-usage, and user-correction evidence pass.

## Migration plan

1. Complete the read-only Output inventory and compatibility report defined in
   `../contracts/route-06-output-compatibility.md`.
2. Add canonical OpenAPI contracts, generated clients/Zod, and ordered SQLite
   migrations in Route 06 Pass 1B.
3. Preserve legacy read compatibility while explicit or deterministic mappings
   create canonical records.
4. Implement Variants, Connections, Renditions, Deployments, and projections only
   in their separately authorized passes.
5. Retire compatibility only after the removal gates in the contract pass.

## Consequences

- Domain ownership stays independent of route layout and provider behavior.
- Delivery can be retried or reconciled without mutating approved content.
- Credentials cannot leak into SQLite, events, logs, backups, Renditions, or
  Intelligence results.
- Projection rebuilds and provider-independent conformance can be tested before
  enabling external adapters.
- The compatibility period adds explicit audit and dual-read complexity.

## Rejected alternatives

- **Let Pipeline own the complete lifecycle:** collapses several authoritative
  domains into a route projection.
- **Rename Output to Publication in place:** converts ambiguous legacy values
  without evidence or user correction.
- **Store scheduling on Publication:** cannot represent independent Channel
  delivery times and outcomes.
- **Store provider credentials in SQLite:** violates the accepted credential and
  backup boundary.
- **Adopt full event sourcing now:** adds unnecessary migration and operational
  complexity beyond the accepted transactional outbox model.
- **Implement providers before contracts:** makes external behavior define the
  domain and weakens recovery guarantees.
