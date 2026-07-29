# Route 03 Pass 2A — Legacy Evidence Migration Audit

Status: **Accepted implementation evidence**

Date: 2026-07-29

Scope: Migration 6 contract, controlled legacy fixture, and executable audit
reporter. This report does not claim that an external user Vault was migrated.

## Migration under test

`evidence_contracts_and_legacy_backfill` appends schema version 6 without rewriting
historical migrations. It:

- adds Evidence classification, lifecycle, review, optimistic version, and archive
  metadata;
- creates immutable source-version, ingest-state, locator, migration-audit, and
  rollout-flag tables;
- preserves legacy `source`, `content`, `notes`, `story_id`, and physical
  `project_id`;
- creates one conservative source version for every legacy Evidence row;
- copies SHA-256 only from an exact `SHA-256: <64 lowercase/uppercase hex>` note;
- preserves legacy Story relationships idempotently; and
- records unresolved ownership, source, and checksum conditions rather than
  inventing facts.

## Controlled fixture

The migration test constructs three pre-migration Evidence records:

| Fixture | Legacy state | Expected result |
| --- | --- | --- |
| Managed proof | Workspace, Story, vault path, exact SHA-256 note | `ManagedFile`; structured checksum recovered; Story link preserved |
| Unassigned notes | Inline meeting content; no Workspace | `InlineText`; `Testimony`; ownership action required |
| Unknown legacy Evidence | No Workspace, source, content, or checksum | Placeholder `ExternalReference`; missing-source and ownership actions required |

## Verified results

| Assertion | Result |
| --- | --- |
| Ordered migration applies once | Passed |
| Every legacy row receives source version 1 | Passed |
| Legacy source and content remain present | Passed |
| Exact SHA-256 is copied into structured metadata | Passed |
| Missing/ambiguous checksum is not invented | Passed |
| Unassigned Workspace is reported, not inferred | Passed |
| Missing source is reported | Passed |
| Singular legacy Story link is preserved in `story_evidence` | Passed |
| Canonical-contract feature flag defaults on | Passed |
| Source-version, recoverable-ingest, and detail-route flags default off | Passed |
| Migration, API compatibility, and capture utility suites | 17 assertions passed |
| Repository typecheck and production builds | Passed |
| Audit reporter against disposable Vault | Passed |

The fixture intentionally contains unresolved audit entries. Their presence is the
correct outcome: Pass 2A reports compatibility debt and does not silently repair
unknown provenance.

## Rollout flags

| Flag | Default | Meaning |
| --- | --- | --- |
| `evidence.canonical-contracts` | Enabled | Require Workspace ownership and expose governed Evidence metadata |
| `evidence.source-versions` | Disabled | Gate canonical source-version reads and writes |
| `evidence.recoverable-ingest` | Disabled | Gate Pass 2B staged ingestion |
| `evidence.detail-route` | Disabled | Gate the future Evidence inspector |

## Vault audit command

Run against a selected Vault:

```bash
NTC3_VAULT_PATH=/absolute/path/to/vault pnpm audit:evidence-migration
```

The command emits JSON containing Evidence/source counts, unresolved issues grouped
by severity and code, and the current Evidence rollout flags. Opening the Vault
applies pending ordered migrations; back up a material Vault before first use.

## Remaining actions

- Run the reporter against each real Vault selected for upgrade and retain the
  resulting evidence.
- Assign every `UnassignedWorkspace` row through a future user-directed workflow.
- Verify managed files and resolve `ChecksumUnavailable` through
  `evidence-integrity@1.0.0`.
- Do not enable source-version or recoverable-ingest flags before their APIs,
  compensation, restart reconciliation, and failure-injection tests exist.
