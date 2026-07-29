# N-Tech C³ Route Discovery Framework

Version: **1.0**
Status: **Accepted**
Owner: Product Architecture
Last reviewed: 2026-07-29

## Purpose

The Route Discovery Framework (RDF) is the official method for defining,
validating, implementing, measuring, and evolving major routes in N-Tech C³.

A route is not a domain or capability owner. It is an experience adapter exposing
one or more domain or platform capabilities through a coherent workflow.

```text
User need
    ↓
Required outcome
    ↓
Domain or platform capability
    ↓
Workflow and executable contracts
    ↓
Experience surface
    ↓
Evidence and measurement
    ↓
Accept, revise, or remove
```

The same capability MAY also be exposed through an API, command palette, desktop
shortcut, background job, plugin, import, or future automation. Business rules
MUST remain in their owning domains or platform services, never in a route
component.

## Governing principles

- Every route MUST justify its user outcome and architectural cost.
- Outcomes precede features and layouts.
- Domains own authoritative facts and lifecycle rules.
- The Engineering Intelligence Engine derives insight.
- Routes present capabilities; they do not own algorithms or derived truth.
- Deterministic methods precede probabilistic or AI-assisted methods.
- Automation must earn its place through evidence.
- Critical conformance failures cannot be hidden by an aggregate score.
- Major route decisions require executable acceptance evidence.

## Tiered route dossier

### Tier 1 — Route identity

Required for every user-facing route:

1. Stable route ID and path.
2. Name and one-sentence mission.
3. User need and required outcome.
4. Domain owner.
5. Primary workflow.
6. No more than five primary actions.
7. Navigation and experience pattern.
8. Loading, empty, failure, and conflict states.
9. Testable success criteria.

### Tier 2 — Connected workflow

Required for routes that mutate or coordinate domain state:

1. Authoritative inputs and outputs.
2. Dependencies and downstream consumers.
3. Commands, queries, events, and projections.
4. Core objects and relationship semantics.
5. Lifecycle and invariants.
6. Platform-service dependencies.
7. Recovery, retry, conflict, and degraded behavior.
8. Authorization boundary, including future roles where relevant.
9. Operational and usability measurements.
10. Compatibility and migration requirements.

### Tier 3 — Intelligence-bearing route

Required only when derived insight is exposed:

1. Named EIE capability and version.
2. Deterministic baseline.
3. Input watermark and invalidation.
4. Result classification and provenance.
5. Explanation and evidence references.
6. Confidence only when calibrated.
7. Human approval, confirmation, or override.
8. AI/provider authorization boundaries.
9. Resource and performance budgets.
10. Abstention and insufficient-evidence behavior.

## Architectural layers

Route discovery proceeds through:

```text
Purpose
  ↓
Domain ownership and data
  ↓
Commands, queries, invariants, and events
  ↓
Deterministic algorithms and platform services
  ↓
Optional EIE and AI assistance
  ↓
Experience and interaction
  ↓
Evidence, measurement, and acceptance
```

UI design MUST NOT precede ownership, lifecycle, relationship, and contract
decisions for a stateful workflow.

## Responsibility classification

Every consequential action MUST be classified as one of:

- **Human approval required** — for example canonical Knowledge promotion,
  contradiction resolution, publication, or external disclosure.
- **Human confirmation required** — for reversible but consequential actions.
- **Policy-authorized automation** — bounded automation governed by an accepted
  policy and recorded evidence.
- **Deterministic maintenance** — projection rebuilds, cache cleanup, and similar
  recoverable operations.
- **Prohibited automation** — actions the platform may never perform silently.

## Route maturity model

| Level | Meaning | Exit evidence |
| --- | --- | --- |
| L0 — Proposed | Concept without an accepted contract | Recorded need and sponsor |
| L1 — Defined | Mission, owner, workflow, invariants, and acceptance criteria exist | Accepted dossier |
| L2 — Functional | Primary contract and workflow are implemented | API/domain tests |
| L3 — Integrated | Relationships, events, recovery, search, and observability are implemented | Integration and recovery evidence |
| L4 — Intelligence-assisted | Explainable EIE capabilities exist where justified | Provenance, quality, and benchmark evidence |
| L5 — Operationally mature | Route is measured, accessible, recoverable, secure, and change-controlled | Release-level conformance evidence |

“Self-improving” is not a maturity level. Automated recommendations MAY propose
changes, but domain rules, scoring algorithms, and constitutional behavior remain
change-controlled.

## Conformance gates

RDF uses a conformance matrix rather than a weighted Route Intelligence Score:

| Gate | Applies when | Blocking failure examples |
| --- | --- | --- |
| Domain correctness | Route reads or mutates domain state | Missing owner, illegal transition |
| Contract completeness | Route invokes commands or queries | Undocumented request or error |
| Traceability | Route creates claims or derived results | Missing provenance |
| Accessibility | User-facing route | Inoperable keyboard/focus workflow |
| Recovery | Route mutates durable state | Partial write or unrecoverable failure |
| Performance | Major or data-intensive route | Unmeasured critical workflow |
| Security | Route crosses file/provider/plugin boundaries | Unauthorized path or content access |
| Observability | Route has background or failure-prone work | Invisible failure or projection lag |
| Explainability | Route displays derived insight | Unexplained score or recommendation |
| Intelligence provenance | Route uses EIE output | Missing version or watermark |

A blocking failure prevents maturity advancement regardless of strengths elsewhere.
AI readiness and automation are not universal success criteria.

## Measurements

Measurements are separated by meaning:

- **Domain Health** assesses the quality or readiness of a domain subject.
- **Route telemetry** measures latency, failures, abandonment, and availability.
- **Data quality** measures completeness, freshness, provenance, and integrity.
- **Capability conformance** measures compliance with accepted contracts.

A route may display Domain Health but does not receive a domain-style Health score
merely because it exists.

## Route relationships

Routes form a typed graph with feedback loops, not a linear conveyor belt.

```text
Repository analysis ──produces──▶ Evidence
Evidence ──supports/challenges──▶ Knowledge and Stories
Knowledge ──informs──▶ Stories and Campaigns
Stories ──produce──▶ Outputs
Campaign and Output results ──produce──▶ Evidence
Evidence ──may revise──▶ Knowledge
```

Every dependency MUST identify direction, cardinality, ownership, deletion
behavior, Workspace boundary, and whether its inverse is authoritative or a
projection.

## Experience patterns

Routes compose approved patterns such as:

- Library
- Explorer
- Studio
- Workbench
- Timeline
- Graph
- Console
- Dashboard
- Wizard
- Canvas

The pattern describes how a workflow should feel; it does not override domain
semantics. Inspector sections, toolbars, and collection views are capability-driven
and expose only applicable, tested behavior.

## Route DNA dossier

Every major route MUST provide a concise dossier:

```yaml
route_id: knowledge
path: /knowledge
status: proposed
maturity: L1
mission: Transform Evidence into reviewed, reusable understanding.
domain_owner: Knowledge
experience_pattern:
  - Library
  - Editor
primary_capabilities:
  - Browse Knowledge
  - Author Knowledge
  - Review Claims
primary_inputs:
  - Evidence
  - Existing Knowledge
primary_outputs:
  - Knowledge Pages
  - Reviewed Claims
consumers:
  - Stories
  - Campaigns
  - Knowledge Query
platform_services:
  - Search
  - Events
  - Versioning
intelligence_capabilities:
  - Freshness
  - Coverage
human_approval:
  - Canonical promotion
  - Contradiction resolution
dependencies:
  - Evidence provenance
  - Workspace ownership
acceptance_evidence:
  - API tests
  - E2E workflows
  - Performance report
```

Route DNA is design-time architecture metadata. It MUST NOT become redundant
runtime state.

## Review and maintenance

- L0–L1 decisions are reviewed through product architecture.
- L2–L3 advancement requires executable contracts and integration evidence.
- L4 requires EIE provenance, quality evaluation, and performance evidence.
- L5 requires accessibility, recovery, security, operational, and release evidence.
- Material route changes update the dossier, source-of-truth index, affected
  specifications, tests, and migrations together.
- A route that no longer justifies its cost SHOULD be simplified, merged, or
  removed.

## Amendment history

- 2026-07-29: RDF v1 accepted; revised to treat routes as experience adapters,
  adopt tiered dossiers and conformance gates, remove weighted intelligence scoring,
  and replace self-improvement with operational maturity.
