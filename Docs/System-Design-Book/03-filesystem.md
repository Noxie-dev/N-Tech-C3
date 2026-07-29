# Specification 03 — Filesystem

Status: **Accepted**
Owner: Platform Architecture
Last reviewed: 2026-07-29

## Purpose

Define the portable local Vault filesystem, managed-file ownership, integrity,
recovery, and safe interaction with user-selected external files.

## Authority

- SQLite is authoritative for structured records and managed-file metadata.
- The Vault filesystem is authoritative for managed binary and exported content.
- Database records store Vault-relative paths, never portable absolute paths.
- User-selected repositories remain external, read-only sources and are not copied
  into the Vault unless an explicit import creates Evidence.

## Canonical directories

```text
Vault/
├── database/
├── repositories/
├── workspaces/
├── stories/
├── campaigns/
├── knowledge/
├── evidence/
├── media/
├── exports/
├── drafts/
├── templates/
├── backups/
├── logs/
└── settings/
```

Existing `assets/` content remains compatibility terminology while Media is
resolved through the Domain Model amendment process. Directories MAY be present
before their owning feature is implemented.

## Path and naming rules

- Managed paths MUST be relative to the active Vault root.
- Path traversal, device paths, and escaped symlink targets MUST be rejected.
- Imported filenames MUST be sanitized while preserving a user-visible original
  name in metadata.
- Managed binary identity MUST include SHA-256.
- Filename uniqueness MUST NOT be treated as content identity.
- Case-only collisions MUST be handled for cross-platform portability.
- Temporary writes MUST use a sibling temporary file followed by atomic rename
  where supported.

## File ownership

| Content | Owner | Mutation policy |
| --- | --- | --- |
| SQLite database/WAL | Database service | SQLite only |
| Imported Evidence | Evidence domain + Vault service | Immutable or versioned |
| Media blobs | Media domain + Vault service | Blob immutable; metadata mutable |
| Renditions/exports | Export service | Reproducible output, versioned provenance |
| Backups | Backup service | Immutable archive |
| Logs | Logging service | Retention policy |
| Settings files | Settings service | Atomic replace |
| External repositories | User/external tool | Read-only observation |

## Import and attachment rules

1. Validate source, size, type, and authorization.
2. Stream or copy into a managed temporary path.
3. Calculate checksum while bounded by resource policy.
4. Atomically promote the file to its final Vault-relative path.
5. Commit metadata and durable event in one recoverable workflow.
6. Remove orphan temporary content after failure.

Database/file operations cannot share one native transaction. Workflows MUST use
staging plus compensation and MUST surface orphan/integrity failures.

## Backup and restore

- Backups MUST include the database and all managed content required for recovery.
- Active SQLite state MUST be checkpointed or safely copied before archiving.
- Restore MUST validate archive paths, schema compatibility, and required content.
- Restore MUST create a recoverable copy of the current Vault before replacement.
- A failed restore MUST preserve or restore the prior Vault.
- Backup and restore evidence MUST name application version, schema version,
  checksum, creation time, and source Vault identity.

## Human-readable content

Exports, manifests, recovery reports, and constitutional documentation SHOULD use
human-readable formats. SQLite, indexes, caches, and internal job state are not
required to be directly human-editable.

## Security

- Renderer code never receives unrestricted filesystem access.
- Electron IPC handlers validate every relative path and operation.
- External repository traversal is bounded, ignore-aware, and symlink-aware.
- Secrets, credentials, and provider tokens MUST NOT be stored in managed content,
  events, logs, backups, or export manifests.
- Reveal/open operations MUST resolve inside the allowed Vault or an explicitly
  authorized external source.

## Integrity and recovery

- Missing managed files, checksum mismatch, broken references, orphan staged files,
  and escaped paths are visible integrity failures.
- Rebuildable thumbnails, previews, and indexes MUST be marked derived.
- Destructive cleanup requires dependency checks and recoverable evidence.
- Integrity checks MUST be cancellable and resource-bounded for large Vaults.

## Performance

File import, hashing, backup, restore, preview, and integrity scanning require named
datasets and hardware. Large files MUST be streamed; UI work MUST NOT block on
unbounded synchronous filesystem operations.

## Acceptance evidence

- Path traversal and symlink tests.
- Atomic write/compensation tests.
- Checksum and duplicate-content tests.
- Backup/restore rollback tests.
- Representative copy/hash/scan benchmarks.

## Open decisions

- Content-addressed blob catalogue and deduplication migration.
- Final Media versus Asset directory transition.
- Retention budgets for logs, backups, and orphan staging.

## Amendment history

- 2026-07-29: Initial filesystem constitution accepted.
