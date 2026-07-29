# N-Tech C³ System Design Book

Status: **Accepted**
Owner: NaniTech Engineering
Last reviewed: 2026-07-29

This directory is the detailed Engineering Constitution for N-Tech C³.
`N-TC3_index.md` remains the repository-level authority for precedence and
implementation status. This book defines normative architecture, invariants,
standards, and acceptance evidence.

## Normative language

- **MUST / MUST NOT**: binding requirement.
- **SHOULD / SHOULD NOT**: expected unless evidence supports an approved exception.
- **MAY**: permitted but optional.
- `Proposed`: not binding.
- `Accepted`: binding and change-controlled.

## Accepted foundational specifications

| Specification | Status | Purpose |
| --- | --- | --- |
| [01 Domain Model](01-domain-model.md) | Accepted | Domain ownership, lifecycle, relationships, invariants |
| [02 Data Architecture](02-data-architecture.md) | Accepted | Persistence, migrations, authoritative and derived data |
| [03 Filesystem](03-filesystem.md) | Accepted | Portable Vault paths, managed files, integrity, backup, recovery |
| [06 Platform Services](06-platform-services.md) | Accepted | Shared service contracts, jobs, failure, security, observability |
| [08 Event Architecture](08-event-architecture.md) | Accepted | Durable domain events, outbox, consumers, replay |
| [09 Performance](09-performance.md) | Accepted | Measurement, workloads, proposed budgets, regression policy |
| [10 Engineering Standards](10-engineering-standards.md) | Accepted | Enforceable implementation and review standards |
| [11 Engineering Principles](11-engineering-principles.md) | Accepted | Timeless decision filters |
| [12 Intelligence Engine](12-intelligence-engine.md) | Accepted | Unified EIE, capabilities, provenance, recommendations |

Specifications 04, 05, and 07 remain to be completed in later platform-definition
passes. A subsystem governed by a proposed specification cannot be called
production-ready.

## Amendment process

1. Open a decision record under `decisions/`.
2. State the current rule, proposed change, evidence, compatibility impact, and
   migration plan.
3. Review affected specifications and executable contracts.
4. Accept or reject the amendment explicitly.
5. Update the specification, amendment history, source-of-truth index, tests, and
   migration artifacts in the same change where practical.

Silent architecture drift is prohibited.

Accepted amendments are indexed in
[`decisions/README.md`](decisions/README.md). ADR-001 establishes the canonical
Evidence definition and state separation required by Route 03.

## Evidence

Claims of conformance or performance require artifacts under `evidence/` or links
to reproducible repository tests. Diagrams under `diagrams/` explain architecture
but do not override normative text.
