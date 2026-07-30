# Route 06 Output Inventory and Compatibility Contract

Status: **Accepted — specification only**

Owner: Publication Domain / Data Architecture

Date: 2026-07-30

## Purpose

Define the executable, read-only audit that must precede any conversion of legacy
`story_outputs` records into Publications or related Route 06 concepts.

This contract does not authorize a migration, production table, route, Channel
Connection, schedule, or external delivery.

## Command contract

Route 06 Pass 1B MUST provide:

```bash
pnpm run audit:output-migration -- --vault <disposable-vault> --json <report-path>
```

The command MUST:

- open the selected Vault without mutating it;
- validate the schema version before reading;
- produce deterministic JSON with stable object and finding order;
- preserve original Output identifiers and values;
- redact content, credentials, tokens, and secret-like destination parameters;
- distinguish an audit execution failure from records requiring user action; and
- write no canonical Publication, Channel, Connection, Variant, Rendition, or
  Deployment records.

Exit codes are:

| Code | Meaning                                                          |
| ---: | ---------------------------------------------------------------- |
|  `0` | Audit completed with no `ActionRequired` findings                |
|  `1` | Audit could not complete or its report is invalid                |
|  `2` | Audit completed and at least one `ActionRequired` finding exists |

Warnings do not change a successful exit code unless they prevent deterministic
migration.

## Report shape

The versioned JSON report MUST contain:

```json
{
  "contractVersion": "1.0.0",
  "generatedAt": "2026-07-30T00:00:00.000Z",
  "applicationRevision": "<git-sha>",
  "schemaVersion": 0,
  "vaultFingerprint": "<non-secret-sha256>",
  "inventory": {
    "totalOutputs": 0,
    "workspaceAssigned": 0,
    "workspaceUnassigned": 0,
    "storyAssigned": 0,
    "storyMissing": 0,
    "countsByType": {},
    "countsByStatus": {},
    "countsByFormat": {},
    "countsByDestination": {}
  },
  "findings": [],
  "summary": {
    "info": 0,
    "warning": 0,
    "actionRequired": 0,
    "deterministicallyMappable": 0,
    "userResolutionRequired": 0
  }
}
```

Each finding MUST contain:

- `outputId`;
- `issueCode`;
- `severity`: `Info`, `Warning`, or `ActionRequired`;
- `originalFingerprint`;
- redacted `originalValues`;
- `details`;
- zero or more `candidateMappings`;
- `deterministic`: boolean; and
- `requiredResolution`, or `null` when no user action is needed.

Reports MUST NOT contain Output body content, credentials, authorization headers,
provider payloads, or absolute filesystem paths.

## Finding vocabulary

The initial stable issue codes are:

| Code                            | Minimum severity | Meaning                                              |
| ------------------------------- | ---------------- | ---------------------------------------------------- |
| `UnassignedWorkspace`           | `ActionRequired` | Workspace ownership cannot be established            |
| `MissingStory`                  | `ActionRequired` | Referenced Story does not exist                      |
| `CrossWorkspaceOwnership`       | `ActionRequired` | Output and Story ownership conflict                  |
| `UnknownStatus`                 | `ActionRequired` | Status has no accepted compatibility meaning         |
| `AmbiguousGrouping`             | `ActionRequired` | One or more Outputs might represent one Publication  |
| `AmbiguousDestination`          | `ActionRequired` | Destination cannot map deterministically             |
| `InvalidFormat`                 | `Warning`        | Format is absent or outside the accepted vocabulary  |
| `DuplicateCandidate`            | `Warning`        | Record resembles another Output but cannot be merged |
| `MissingTitle`                  | `Warning`        | A usable display title is absent                     |
| `MissingContent`                | `Warning`        | The Output has no body content                       |
| `DeterministicChannelCandidate` | `Info`           | Accepted mapping can propose a provisional Channel   |

New issue codes require a contract-version change and fixtures proving backward
compatibility.

## Mapping rules

1. Every Output remains independently identifiable and readable.
2. Outputs MUST NOT be grouped, merged, or deduplicated automatically.
3. A candidate Publication retains the Output ID as migration provenance; it does
   not reuse the legacy ID as an unversioned canonical identity.
4. Workspace and Story ownership MUST be resolved before any candidate can be
   marked deterministically mappable.
5. Free-text destination values MUST NOT create a Channel Connection.
6. A provisional Channel candidate is allowed only through a versioned,
   case-normalized, exact mapping table accepted before the audit runs.
7. The original type, status, format, destination, timestamps, and fingerprint
   MUST remain available for rollback and user review.
8. Ambiguous values require explicit user confirmation through a separately
   authorized migration workflow.
9. Re-running the audit against unchanged data and the same contract/mapping
   versions MUST produce the same inventory, findings, and fingerprints, excluding
   `generatedAt` and `applicationRevision`.

## Compatibility read and retirement rules

During migration, legacy reads MUST remain isolated behind a compatibility
adapter. New writes MUST use canonical Publication contracts after their feature
flag is enabled; dual-writing Output and Publication facts is prohibited.

Output compatibility may be retired only when:

- all records are migrated, explicitly deferred, or retained by an accepted
  exception;
- migration and rollback reports reconcile identifiers and fingerprints;
- backup and restore preserve both legacy and canonical data;
- consumer-usage instrumentation shows no remaining legacy reads for the accepted
  observation window;
- search, Story backlinks, events, and exports use canonical identities;
- user-corrected groupings and destinations remain reproducible; and
- the retirement migration and recovery procedure pass on representative Vaults.

## Required acceptance fixtures

The executable audit MUST test:

- an empty Vault and a clean deterministic inventory;
- unassigned and cross-Workspace Outputs;
- missing Stories and unknown statuses;
- duplicate-looking Outputs that remain separate;
- ambiguous and deterministic destination examples;
- redaction of content, secrets, query parameters, and absolute paths;
- stable ordering and repeat-run equality;
- exit codes `0`, `1`, and `2`; and
- a legacy Vault opened without writes.

## Change control

This contract is governed by ADR-002. Changes to fields, issue semantics, mapping
rules, redaction, or removal gates require a compatible contract version,
decision-record amendment, fixtures, and updates to the Route 06 dossier and
repository Source of Truth.
