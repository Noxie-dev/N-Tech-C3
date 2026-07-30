# Route 06 Publications Prerequisite Audit

Status: **Complete — implementation not authorized**

Date: 2026-07-30

## Finding

Route 06 is the next route in the original product architecture, but the original
“Publishing Pipeline owns the lifecycle” model conflicts with the accepted Canon.
The safe next pass is the corrected RDF dossier and constitutional contract work,
not production implementation.

## Existing executable seed

- `story_outputs` exists and is scoped to a Story.
- Story Studio can list and create Draft Outputs.
- Story Output creation appends a Story event.
- Output fields include type, title, status, content, format, destination, and
  timestamps.

## Missing prerequisites

- Publication aggregate and immutable versions
- first-class Channel and secure Channel Connection
- Publication Variant and Rendition
- Deployment aggregate, attempts, idempotency, retry, cancellation, and retraction
- durable scheduling and timezone semantics
- Publication/Deployment event contracts
- Export, validation, adapter, job, and credential platform services
- Output inventory, compatibility migration, rollback, and audit
- `/publications`, Pipeline, and `/calendar` production routes
- named performance, recovery, accessibility, security, and observability evidence

## Compatibility risk

Outputs cannot be silently renamed to Publications. Multiple Outputs may represent
separate Publications, several Variants of one Publication, generated files, or
legacy delivery intentions. Free-text destinations cannot safely create Channels
or Connections.

Every Output must remain identifiable and auditable until a conservative,
user-correctable migration is accepted.

## Decision

`Docs/Route-06-Publications-execution-plan.md` is the corrected RDF v1 dossier.
Route 06 is recorded at **L1 Defined**.

The next proposed authorization boundary is **Pass 1A — Constitutional contracts
and compatibility design**. It amends the Domain Model, Data Architecture,
Platform Services, Event Architecture, Filesystem, performance budgets, and Output
inventory contract without adding production tables, routes, scheduling, or
external provider behavior.
