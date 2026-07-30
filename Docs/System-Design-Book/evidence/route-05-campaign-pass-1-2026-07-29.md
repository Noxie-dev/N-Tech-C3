# Route 05 Campaign Pass 1 Conformance and L2 Decision

Status: **Accepted — L2 Functional**

Date: 2026-07-29

Route: 05 — Campaigns

## Decision

Route 05 Pass 1 satisfies the accepted aggregate, contract, compatibility,
lifecycle, traceability, recovery, and core browser-experience gates. Campaign is
designated **L2 Functional**. This decision authorizes no Pass 2 Story portfolio
or milestone work, Pass 4 Publication/Channel work, scheduling, external
publishing, providers, analytics, or Campaign Intelligence.

## Contracts and migration

Canonical creation requires `workspaceId`. The aggregate exposes mission and
success definitions, type, audience, owner, optional timeframe and strategy,
planning targets, lifecycle, phase, completion assessment, optimistic version,
archive state, and timestamps.

Ordered migration 12, `governed_campaign_domain`, preserves legacy Campaign rows,
timestamps, objective, status, `duration_weeks`, `platforms`, and existing
`story_campaigns` edges. It does not infer ownership, dates, transition history,
Channels, Publications, Connections, Deployments, schedules, or external
identities. Initial checkpoints and migration-audit rows make legacy state
explicit; active-only Campaign search excludes archived records.

`pnpm run audit:campaign-migration` reports ownership, active/archive counts,
versions, Story memberships, durable events, legacy platform/status
compatibility, and unresolved findings. A clean disposable Vault reported zero
unresolved findings. The migration suite separately verifies conservative
unowned and legacy-platform behavior.

## Governed behavior

- Active Workspace ownership is mandatory for new canonical Campaigns.
- New Campaigns begin in `Planning`; lifecycle state cannot be patched directly.
- Activation requires mission, success definition, owner, and a linked or
  explicitly targeted Story.
- Pausing requires a reason. Completion requires a human note and success
  assessment. Reopening requires a reason.
- Phase is an explicit command separate from lifecycle.
- Every write requires the expected version; stale writes return conflict.
- Start dates cannot follow end dates, and visual assets must share the
  Campaign Workspace.
- Archived Campaigns are read-only, excluded from the default catalogue/search,
  and restored to their recorded prior state.
- Normal hard deletion is deprecated and rejected.
- Aggregate mutation, checkpoint, and durable event append share one SQLite
  transaction; Activity is projected idempotently from domain events.

## Experience

The Campaign Library requires an active Workspace at creation and supports
Workspace, lifecycle, and text filters. Cards show lifecycle, phase, version,
mission, and factual Story planning counts.

Mission Control exposes the accepted aggregate fields, explicit save checkpoints,
visible version history, lifecycle and phase commands, conflict/invariant alerts,
completion assessment, and reversible archive. Archived fields are visibly
disabled. No Publication, Channel, Deployment, scheduling, fabricated progress,
analytics, or Intelligence panel is shown.

## Verification register

- OpenAPI generation: passed.
- Workspace TypeScript checks: passed.
- Production build: passed.
- Repository suite: 5 files, 35 tests passed.
- Ordered migrations: 12 tests passed.
- API conformance: 14 workflows passed, including Campaign ownership, conflicts,
  lifecycle, phase, completion/reopen, archive/search/restore, versions, events,
  and Activity.
- Browser conformance: 5 workflows passed. The Campaign workflow loaded, saved,
  activated, archived into read-only state, restored, and verified persistence;
  initial route readiness remained inside five seconds.
- Clean-Vault Campaign migration audit: passed with zero unresolved findings.

## Residual controlled work

- Existing personal Vaults may contain unowned Campaigns, unknown legacy status,
  platform strings, or invalid Story edges. The audit reports these for explicit
  user remediation; they are not silently corrected.
- Physical `project_id`, `duration_weeks`, `platforms`, and legacy status remain
  compatibility fields during the observation window.
- Story portfolio roles/order/backlinks and milestones are future Pass 2 work
  requiring separate authorization.
- L3 performance, accessibility/recovery matrices, backup/restore conformance,
  and compatibility-retirement evidence are future Pass 3 work.
- Publications and Channels remain first-class, non-negotiable Canon terms and
  are separately owned future Pass 4 foundations.
- Campaign Intelligence is future Pass 5 work and requires independent versioned,
  explainable, evidence-backed contracts.
