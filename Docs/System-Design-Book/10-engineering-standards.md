# Specification 10 — Engineering Standards

Status: **Accepted**
Owner: NaniTech Engineering
Last reviewed: 2026-07-29

## Architecture

- Business rules live in domain services.
- UI and Express routes are adapters.
- OpenAPI changes precede generated clients and validators.
- Storage changes use new migrations.
- Derived Intelligence cannot become authoritative without an amendment.

## Naming and folders

- Product language uses Workspace; physical Project names are compatibility-only.
- Generated code is never hand-edited.
- New cross-cutting libraries live under `lib/`.
- API domain services live under `artifacts/api-server/src/lib/` until a justified
  extraction exists.
- Tests remain close to the code or in `e2e/` for browser workflows.

## Testing

Every applicable change MUST include:

- unit tests for deterministic business logic;
- migration tests for fresh and upgrade paths;
- API integration tests for validation, conflicts, and persistence;
- browser tests for critical user workflows;
- typecheck and production build.

High-risk desktop IPC requires a smoke test or documented evidence gap.

## Error handling

- Validation failures return actionable `400` errors.
- Missing resources return `404`.
- invariant/concurrency conflicts return `409` with blockers.
- Archived records reject mutation until restored.
- Errors MUST preserve user input where practical.
- Logs MUST NOT contain secrets or full sensitive content.

## Dependencies

- Prefer platform/runtime capabilities and existing dependencies.
- New dependencies require purpose, maintenance, security, size, and alternative
  analysis.
- The pnpm minimum-release-age policy MUST remain enabled.

## Git and review

- Default branches use `codex/` when created by Codex unless directed otherwise.
- Commit messages use an imperative, outcome-focused summary.
- Reviews verify contract-first changes, migrations, tests, documentation, and
  constitutional conformance.
- Destructive migrations require explicit approval and recovery evidence.

## Documentation

- `N-TC3_index.md` is updated when implementation status or architecture changes.
- README is updated when routes, commands, prerequisites, or architecture change.
- Accepted constitutional changes include amendment history.

## Definition of Done

A change is done only when behavior, contract, persistence, states, accessibility,
tests, documentation, migration safety, performance implications, and evidence are
addressed in proportion to risk.

## Evidence-Based Development

Engineering decisions record:

- question;
- evidence;
- alternatives;
- decision;
- consequences;
- verification.

## Amendment history

- 2026-07-29: Initial accepted engineering standards.
