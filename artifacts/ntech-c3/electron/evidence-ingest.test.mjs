import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  compensateEvidenceFiles,
  managedFileState,
  promoteEvidenceFile,
  resolveManagedPath,
  stageEvidenceFile,
} from './evidence-ingest.mjs';

const temporaryRoots = [];

async function fixture(bytes = Buffer.from('recoverable evidence')) {
  const root = await mkdtemp(path.join(tmpdir(), 'ntc3-ingest-test-'));
  temporaryRoots.push(root);
  const sourcePath = path.join(root, 'external-source.bin');
  await writeFile(sourcePath, bytes);
  return { root, sourcePath, bytes };
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('recoverable Evidence filesystem ingestion', () => {
  it('streams, hashes, and atomically promotes a managed file', async () => {
    const { root, sourcePath, bytes } = await fixture(Buffer.alloc(1024 * 1024, 0x43));
    const stagedPath = 'evidence/.staging/ingest.part';
    const finalPath = 'evidence/final/ingest.bin';

    const staged = await stageEvidenceFile({ root, sourcePath, stagedPath });
    expect(staged).toEqual({
      byteSize: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
    expect(await managedFileState({ root, stagedPath, finalPath })).toEqual({
      stagedExists: true,
      finalExists: false,
    });

    await promoteEvidenceFile({ root, stagedPath, finalPath });
    expect(await managedFileState({ root, stagedPath, finalPath })).toEqual({
      stagedExists: false,
      finalExists: true,
    });
    expect(await readFile(resolveManagedPath(root, finalPath))).toEqual(bytes);
  });

  it('rejects traversal and oversized sources before a managed write', async () => {
    const { root, sourcePath } = await fixture(Buffer.alloc(32));
    expect(() => resolveManagedPath(root, '../escape.bin')).toThrow('escapes the Vault');
    await expect(stageEvidenceFile({
      root,
      sourcePath,
      stagedPath: 'evidence/.staging/too-large.part',
      maxBytes: 16,
    })).rejects.toThrow('limited to 100 MB');
  });

  it('rejects a managed staging directory that escapes through a symlink', async () => {
    const { root, sourcePath } = await fixture();
    const outside = await mkdtemp(path.join(tmpdir(), 'ntc3-ingest-outside-'));
    temporaryRoots.push(outside);
    await mkdir(path.join(root, 'evidence'), { recursive: true });
    await symlink(outside, path.join(root, 'evidence', '.staging'));

    await expect(stageEvidenceFile({
      root,
      sourcePath,
      stagedPath: 'evidence/.staging/escape.part',
    })).rejects.toThrow('escapes the Vault through a symlink');
  });

  it('compensates partial staging failures without leaving a file', async () => {
    const { root, sourcePath } = await fixture(Buffer.alloc(1024, 0x41));
    const stagedPath = 'evidence/.staging/failure.part';
    await expect(stageEvidenceFile({
      root,
      sourcePath,
      stagedPath,
      fault: 'during-stage',
    })).rejects.toThrow('Injected failure during staging');
    await expect(stat(resolveManagedPath(root, stagedPath))).rejects.toThrow();
  });

  it('preserves recoverable state on both sides of atomic promotion', async () => {
    const { root, sourcePath } = await fixture();
    const stagedPath = 'evidence/.staging/recovery.part';
    const finalPath = 'evidence/recovery.bin';
    await stageEvidenceFile({ root, sourcePath, stagedPath });

    await expect(promoteEvidenceFile({
      root,
      stagedPath,
      finalPath,
      fault: 'before-promote',
    })).rejects.toThrow('Injected failure before promotion');
    expect(await managedFileState({ root, stagedPath, finalPath })).toEqual({
      stagedExists: true,
      finalExists: false,
    });

    await expect(promoteEvidenceFile({
      root,
      stagedPath,
      finalPath,
      fault: 'after-promote',
    })).rejects.toThrow('Injected failure after promotion');
    expect(await managedFileState({ root, stagedPath, finalPath })).toEqual({
      stagedExists: false,
      finalExists: true,
    });

    await compensateEvidenceFiles({ root, stagedPath, finalPath });
    expect(await managedFileState({ root, stagedPath, finalPath })).toEqual({
      stagedExists: false,
      finalExists: false,
    });
  });
});
