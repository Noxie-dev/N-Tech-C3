# ADR-001 — Evidence Domain Definition and State Separation

Status: **Accepted**

Owner: Product Architecture / Evidence Domain

Date: 2026-07-29

## Context

Specification 01 originally defined Evidence as an “immutable-or-versioned
factual artifact.” The C³ Canon and Route 03 audit established that useful
engineering Evidence also includes observations, testimony, derived analyses, and
external references. Calling every artifact factual would collapse the distinction
between what a source contains, how it was produced, and whether a claim has been
reviewed.

The current implementation also combines source, content, checksum notes,
relationship state, and CRUD lifecycle without structured provenance or source
versions.

## Decision

Evidence is:

> A provenance-bearing artifact that supports, challenges, or contextualizes a
> claim.

Every new Evidence record belongs to exactly one Workspace. Its classification is
one of `FactualRecord`, `Observation`, `Testimony`, `DerivedAnalysis`, or
`ExternalReference`.

Evidence lifecycle, review, integrity, search/index state, and relationships are
separate dimensions:

- lifecycle and review are authoritative domain facts;
- source payloads are immutable or replaced through a new source version;
- integrity is a versioned, deterministic EIE result;
- indexing, backlinks, and link/reference counts are rebuildable projections; and
- being indexed, linked, or referenced is not a lifecycle transition.

Archive/restore is the normal removal workflow. Permanent deletion is not a normal
product action.

The accepted Route 03 dossier is the detailed implementation authority for source
versions, provenance, locators, capture recovery, contracts, events, migration,
experience, and conformance.

## Evidence and rationale

- Engineering records can support or challenge claims without themselves being an
  objectively verified fact.
- Explicit classification preserves epistemic meaning without excluding useful
  source material.
- Independent state dimensions prevent derived conditions from mutating domain
  truth.
- Immutable source versions preserve provenance across metadata and relationship
  changes.
- Archive-first behavior protects the evidence graph and supports local recovery.

## Compatibility impact

- Existing Evidence remains readable and is not reclassified as verified fact.
- Legacy rows are backfilled conservatively through the Route 03 migration plan.
- `projectId`, `storyId`, `source`, `content`, and checksum-in-notes remain
  compatibility fields during the measured migration window.
- Existing `EvidenceDeleted` events remain historical vocabulary; new product
  flows use archive/restore.
- No schema or executable behavior changes as part of this decision record.

## Migration plan

Execute Route 03 Pass 2A through Pass 3B as defined in
`Docs/Route-03-Evidence-execution-plan.md`. Require an ordered migration, legacy
audit report, OpenAPI-first contracts, feature flags, recovery evidence, and Tier
1–3 conformance before declaring Route 03 governed.

## Consequences

- Specification 01 and the repository Source of Truth adopt the broader canonical
  Evidence definition.
- Claims of truth or verification require an explicit review or downstream claim
  process; capture alone does not establish truth.
- The Evidence Integrity capability verifies source and provenance integrity, not
  semantic truth.
- Knowledge, Story, and Publication citations can rely on stable source-version
  and locator identity once implemented.

## Rejected alternatives

- **Restrict Evidence to verified facts:** excludes observations and primary source
  material before review.
- **Use one status for capture, indexing, linking, and verification:** creates
  invalid transitions between independent facts.
- **Allow source overwrite:** destroys the provenance chain.
- **Adopt full event sourcing:** unnecessary for this stage and contrary to the
  accepted incremental event/outbox direction.
