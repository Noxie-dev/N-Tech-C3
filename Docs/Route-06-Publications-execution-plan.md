# Route 06 — Publications and Delivery Operations: RDF v1 Dossier

Status: **Accepted — L1 Defined; Pass 1A complete; implementation not authorized**

RDF version: **1.0**

Owner: Publication Domain / Delivery Platform Services

Prepared: 2026-07-30

## Decision correction

The original architecture describes Route 06 as a Publishing Pipeline that owns
the entire lifecycle from idea through publication. That ownership model is
superseded by the accepted C³ Canon.

Pipeline is an operational projection. It cannot own Publication content,
Channel capabilities, destination configuration, generated files, delivery
attempts, scheduling, Campaign milestones, or provider credentials.

The corrected model is:

```text
Story
  └── produces → Publication
                    ├── immutable Publication Versions
                    ├── Channel-specific Variants
                    ├── generated Renditions
                    └── independent Deployments
                              └── Channel Connection → Channel

Pipeline = projection over Publication + Deployment state
Calendar = temporal projection over Deployments + Campaign milestones
```

**Publication** and **Channel** are non-negotiable Canon terms.

## Route DNA

```yaml
route_id: publications
primary_path: /publications
future_connected_path: /calendar
status: proposed
maturity: L1
mission: >
  Govern, validate, prepare, and trace everything approved to leave a Workspace
  without collapsing content, destination, scheduling, and delivery into one
  generic Output lifecycle.
domain_owners:
  - Publication
  - Channel
platform_service_owners:
  - Export Service
  - Deployment and Job Service
  - Channel Adapter Service
  - Validation Service
experience_patterns:
  - Library
  - Studio
  - Pipeline Board
  - Calendar Projection
primary_actions:
  - Create Publication from Story
  - Review and approve Publication version
  - Prepare Channel Variant
  - Generate Rendition
  - Plan or inspect Deployment
human_approval:
  - Publication approval
  - External deployment
  - Retraction
dependencies:
  - Workspace ownership
  - Story provenance
  - Publication and Deployment events
  - secure Channel Connection model
  - durable job and retry contracts
  - Output compatibility migration
acceptance_evidence:
  - conservative migration audit
  - lifecycle and concurrency tests
  - idempotency and recovery tests
  - credential boundary tests
  - accessibility and performance evidence
```

## One-sentence definition

> Publications is the Workspace-owned operating surface for governing
> channel-neutral content packages and observing their independently owned
> preparation and delivery records.

The user mental model is **a governed publication prepared for delivery**, not a
calendar event, generic Output card, social platform string, or automation queue.

## Current implementation audit

The repository contains only a compatibility seed:

- `story_outputs` stores Story-linked type, title, status, content, format,
  destination, and timestamps;
- Story Studio lists and creates Draft Outputs;
- Output creation appends a Story event;
- no `/publications`, `/calendar`, or Pipeline production route exists;
- no Publication identity, immutable version, review, approval, supersession, or
  archive contract exists;
- no first-class Channel or Channel Connection exists;
- no Variant, Rendition, Deployment, attempt, idempotency, retry, cancellation,
  retraction, timezone, or provider-capability model exists;
- no Output inventory/migration report exists; and
- the Dashboard “See Scheduled Content” action currently points to Campaigns,
  while Calendar remains a planned navigation item.

Existing Outputs are valid current-state compatibility records. They are not
Publications and must not be silently renamed.

## Authoritative ownership

| Fact                                                               | Owner                           |
| ------------------------------------------------------------------ | ------------------------------- |
| Channel-neutral content and immutable versions                     | Publication                     |
| Primary Story and supporting-source relationships                  | Publication                     |
| Destination-specific editorial adaptation                          | Publication Variant             |
| Destination semantics and constraints                              | Channel                         |
| Configured destination identity                                    | Channel Connection              |
| Credential material                                                | OS-secure credential storage    |
| Generated file, checksum, and generator provenance                 | Rendition                       |
| Planned time, timezone, validation, attempts, outcome, external ID | Deployment                      |
| Communication objective and milestones                             | Campaign                        |
| Board columns, counts, overdue/readiness summaries                 | Rebuildable Pipeline projection |
| Calendar range and schedule conflicts                              | Rebuildable Calendar projection |
| Recommendations and derived readiness                              | Versioned EIE capability        |

## Core invariants

1. Every new Publication belongs to one active Workspace.
2. Every Publication begins with exactly one primary Story in the same Workspace.
3. Publication content never overwrites Story content.
4. Approved Publication versions are immutable; revision creates a new version.
5. A Variant references exactly one Publication version and one Channel.
6. A Channel is first-class; format or platform strings cannot substitute for it.
7. A Channel Connection references one Channel without storing credentials in
   SQLite, events, logs, backups, exports, or Intelligence results.
8. A Rendition is immutable and records generator version, checksum, source
   watermark, generation time, and vault-relative path.
9. A Deployment targets one immutable Publication version, Variant, or Rendition
   through one Channel Connection.
10. Deployment scheduling is never stored directly on Publication.
11. Provider attempts use durable idempotency keys and append-only attempt history.
12. Pipeline and Calendar are projections and remain rebuildable.
13. External deployment always requires explicit human approval until a separately
    accepted policy-authorized automation contract exists.
14. Deleting a Publication never deletes its Story, Evidence, Knowledge, Campaign,
    Channel, or completed Deployment history.

## Separate lifecycles

Publication:

```text
Draft → Review → Approved → Superseded → Archived
```

Deployment:

```text
Planned → Validating → Ready → Scheduled → Deploying
                                      └──→ Succeeded | Failed | Cancelled
```

Optional, capability-dependent retraction:

```text
RetractionRequested → Retracted
```

There is no authoritative Publication `Published` state. A Publication may have
several Deployments with different outcomes.

## Initial command and event vocabulary

Candidate commands:

- `CreatePublicationFromStory`
- `UpdatePublicationDraft`
- `SubmitPublicationForReview`
- `ApprovePublicationVersion`
- `CreatePublicationRevision`
- `ArchivePublication` / `RestorePublication`
- `CreatePublicationVariant`
- `GenerateRendition`
- `PlanDeployment`
- `ValidateDeployment`
- `ScheduleDeployment` / `RescheduleDeployment` / `UnscheduleDeployment`
- `ApproveDeployment`
- `CancelDeployment`
- `RequestRetraction`

Candidate durable events:

- `PublicationCreated`
- `PublicationDraftUpdated`
- `PublicationSubmittedForReview`
- `PublicationVersionApproved`
- `PublicationRevisionCreated`
- `PublicationArchived` / `PublicationRestored`
- `PublicationVariantCreated`
- `RenditionGenerated`
- `DeploymentPlanned`
- `DeploymentValidated`
- `DeploymentScheduled` / `DeploymentRescheduled` / `DeploymentUnscheduled`
- `DeploymentApproved`
- `DeploymentStarted`
- `DeploymentSucceeded` / `DeploymentFailed` / `DeploymentCancelled`
- `RetractionRequested` / `DeploymentRetracted`

Exact payloads, versions, sensitive-field exclusions, and replay behavior require
acceptance in the Event Architecture before implementation.

## Recovery and security boundary

- Publication state, checkpoint, and event append share one SQLite transaction.
- Rendition generation uses staged filesystem writes, checksum verification,
  atomic promotion, compensation, and restart reconciliation.
- Deployment jobs are durable and restart-safe.
- Idempotency is scoped to the target connection and immutable source watermark.
- Retry policy distinguishes transient, permanent, validation, authorization, and
  unknown failures.
- Cancellation and retraction reflect actual Channel capabilities; unsupported
  rollback is never promised.
- Connection credentials use OS-secure storage. SQLite stores only an opaque
  credential reference and non-secret destination metadata.
- Logs and events redact provider payloads by default.

## Output compatibility strategy

Migration must begin with an inventory report covering Output count, Workspace and
Story ownership, type, status, format, destination, timestamps, duplicates, and
ambiguous groupings.

Conservative rules:

1. preserve every Output and original identifier;
2. never infer that several Outputs form one Publication;
3. never convert free-text destination into a Channel Connection;
4. infer a provisional Channel only when an accepted deterministic mapping is
   unambiguous, retaining the original value;
5. expose ambiguous records for user-assisted grouping;
6. maintain read compatibility while consumers move to Publication contracts; and
7. remove Output compatibility only after migration, rollback, backup/restore,
   and usage evidence pass.

## Execution sequence

### Pass 0 — Prerequisite audit and RDF dossier

Status: **Complete**

This dossier and the controlled audit record correct ownership, document current
gaps, define invariants, and sequence the work. No executable Publication,
Channel, scheduling, provider, or deployment capability is authorized.

### Pass 1A — Constitutional contracts and compatibility design

Status: **Complete — accepted 2026-07-30**

Completed:

- Domain Model definitions and relationship cardinality;
- Data Architecture for Publication, versions, Channels, Connections, Variants,
  Renditions, Deployments, attempts, and compatibility records;
- Platform Services for export, validation, durable jobs, adapters, and secure
  credential references;
- Event Architecture payloads, redaction, consumers, failures, and replay;
- Filesystem layout for immutable Renditions and staging;
- performance budgets; and
- the executable Output inventory/migration report contract.

ADR-002 records the controlling ownership and compatibility decision. The
accepted Output contract defines the future read-only audit command, versioned
report, issue vocabulary, deterministic mapping constraints, redaction, exit
codes, fixtures, and compatibility-retirement gates.

This pass was specification-only and created no production tables, OpenAPI
operations, migrations, application routes, provider behavior, or delivery jobs.

### Pass 1B — Publication foundation and conservative migration

Status: **Future; requires accepted Pass 1A**

Add canonical OpenAPI contracts, generated clients/Zod, ordered migrations,
Publication aggregate/version/checkpoint/event behavior, primary Story
provenance, Output compatibility inventory and migration audit, active search,
archive/restore, and Library/Studio foundations.

Channels must exist as first-class governed definitions in the schema even though
Connections and external delivery remain disabled.

### Pass 2 — Variants, Channels, Connections, and Renditions

Status: **Future**

Implement Channel capability definitions, secure Connection references,
Publication Variants, deterministic validation, staged Rendition generation,
filesystem recovery, previews, and export history. No external deployment.

### Pass 3 — Deployment domain and durable scheduling

Status: **Future**

Implement Deployment aggregate, attempt history, idempotency, validation, durable
jobs, retry/cancel semantics, timezones, schedule commands, and provider-free
adapter conformance. External providers remain disabled until separately
authorized.

### Pass 4 — Pipeline and Publishing Calendar experience

Status: **Future**

Build Pipeline board and Calendar projections over accepted Publication and
Deployment queries. Connect conventional commands first, then the separately
accepted AFI interaction work. Neither surface owns authoritative schedule facts.

### Pass 5 — Authorized adapters and optional Intelligence

Status: **Future**

Consider explicit provider connections and human-approved deployment only after
security and recovery gates pass. Publication Readiness, Channel Fit, Schedule
Risk, and recommendations require independent EIE contracts, versions, input
watermarks, explanations, resource budgets, and abstention.

## Conformance gates

Route 06 cannot advance beyond L1 until applicable gates pass:

- domain correctness and separate lifecycle ownership;
- contract completeness and generated clients;
- Story/Evidence/Knowledge/Campaign traceability;
- conservative Output compatibility and recovery;
- credential isolation and provider redaction;
- transactional state/events and recoverable filesystem/jobs;
- keyboard/focus/conflict/confirmation accessibility;
- named validation, catalogue, version, rendition, queue, and schedule benchmarks;
- projection lag, job failure, retry, and dead-letter observability; and
- Canon conformance for Publication, Channel, Deployment, and Pipeline.

## Exit decision

Route 06 is **L1 Defined**. The next decision is whether to authorize **Pass 1B —
Publication foundation and conservative migration**.

This dossier does not authorize production Publication tables, Output migration,
Channels, Connections, scheduling, external deployment, provider access, AFI
production integration, analytics, or Publication Intelligence.

## Pass 1A execution report

Executed: **2026-07-30**

Result: **Accepted; specification boundary passed**

The pass:

1. amended the Domain Model with canonical Publication, version, Variant,
   Channel, Connection, Rendition, Deployment, Pipeline, and Calendar definitions,
   ownership, cardinalities, and separate lifecycles;
2. defined conceptual persistence, immutability, credential-reference,
   idempotency, retention, indexing, and compatibility rules without creating
   schema;
3. accepted validation, export, Channel catalogue/Connection, durable job, and
   adapter service boundaries;
4. accepted versioned Publication/Deployment event families, ordering, replay,
   correction, and sensitive-field exclusions;
5. defined staged Rendition layout, manifests, atomic promotion, restart
   reconciliation, backup, and path-security rules;
6. added proposed named Publication, projection, scheduling, job, and Rendition
   performance budgets and representative scale fixtures; and
7. accepted ADR-002 and the executable Output inventory/compatibility report
   contract.

Validation evidence is recorded in
`System-Design-Book/evidence/route-06-pass-1a-2026-07-30.md`.
