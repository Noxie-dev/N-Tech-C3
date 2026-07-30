# Route 05 Campaign Pass 2 Execution Evidence

Status: **Accepted — L2 Functional**

Date: 2026-07-29

Route: 05 — Campaigns

## Decision

Route 05 Pass 2 satisfies the authorized Story portfolio, membership,
backlink, and Campaign milestone boundary. Route 05 remains **L2 Functional**;
Pass 3 evidence is required before an L3 decision.

This decision does not authorize Publications, Channels, scheduling, analytics,
external providers, or Campaign Intelligence.

## Contracts and migration

Ordered migration 13, `governed_campaign_portfolio_and_milestones`, extends
`story_campaigns` with explicit membership role, order, contribution note,
creator, and optimistic version. It adds a partial unique constraint for one
canonical primary Campaign per Story and creates ordered, versioned
`campaign_milestones`.

Legacy relationships are preserved. Existing primary flags become Anchor roles.
Where legacy data contains multiple primaries for one Story, the earliest
membership remains primary and the ambiguity is recorded in
`campaign_migration_audit`; no Campaign or Story ownership/content is invented.

OpenAPI and generated React/Zod clients expose:

- Campaign Story portfolio list, add, update, remove, and complete-set reorder;
- Story-side Campaign backlinks;
- Campaign milestone list, create, update, remove, and complete-set reorder; and
- explicit role, milestone status, expected aggregate version, and expected
  child-record version contracts.

## Governed behavior

- Campaign membership accepts only active, non-archived Stories from the same
  active Workspace.
- One Story can have at most one canonical primary Campaign.
- Membership role and primary status are explicit and independently visible.
- Removing a membership never removes or mutates the Story.
- Reorder commands require the exact current identity set and update order
  atomically.
- Milestone completion or skip requires a human note; terminal milestones cannot
  silently reopen.
- Archived Campaigns are read-only.
- Portfolio/milestone state, Campaign version checkpoint, and durable domain
  event append share one SQLite transaction.
- Generic Story-side Campaign link/unlink is rejected so callers cannot bypass
  Campaign ownership rules.

## Experience

Campaign Mission Control exposes ordered Story membership and milestone panels,
role and primary controls, contribution notes, target dates, explicit milestone
status commands, reorder controls, and confirmations that distinguish unlinking
from deletion. Story Studio exposes the authoritative Campaign backlinks.

The browser workflow created a same-Workspace Story, added it as an Anchor,
recorded a contribution note, created a milestone, saved mission fields,
activated the Campaign, archived it into read-only state, restored it, and
verified the Story-side backlink.

## Verification register

- OpenAPI client/Zod generation: passed.
- Workspace TypeScript checks: passed.
- Production build: passed.
- Repository suite: 5 files, 37 tests passed.
- Ordered migrations: 13 tests passed, including conservative portfolio
  migration and multiple-primary audit behavior.
- API conformance: 15 workflows passed, including Workspace isolation,
  one-primary enforcement, stale versions, membership roles/order/removal,
  backlinks, milestone completion notes/order/removal, archive guards, atomic
  events, and Story preservation.
- Browser conformance: 5 workflows passed; the Campaign workflow includes the
  Pass 2 portfolio and milestone path.
- Clean-Vault Campaign migration audit: zero unresolved findings; the report
  includes primary membership, milestone, terminal milestone, durable event, and
  legacy singular-pointer counts.
- Markdown whitespace validation: passed.

## Controlled residual work

- Route 05 Pass 3 remains future and requires separate authorization for
  accessibility, recovery/conflict matrices, named 10,000-Campaign/portfolio
  benchmarks, projection observability, backup/restore conformance,
  compatibility retirement, and an L3 governance decision.
- Publications and Channels remain first-class Canon domains and future Pass 4
  work after their independent foundations are accepted.
- Scheduling and analytics are future and unauthorized.
- Campaign Intelligence is future Pass 5 work and requires independent,
  versioned, explainable, evidence-backed contracts.
