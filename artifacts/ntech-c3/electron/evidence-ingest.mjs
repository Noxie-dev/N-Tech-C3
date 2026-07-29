import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, realpath, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

export const DEFAULT_MAX_EVIDENCE_BYTES = 100 * 1024 * 1024;

export function resolveManagedPath(root, relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) {
    throw new TypeError('Managed path must be Vault-relative');
  }
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new RangeError('Managed path escapes the Vault');
  }
  return resolved;
}

export function safeEvidenceName(name) {
  const base = path.basename(String(name))
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '-');
  return base || 'evidence.bin';
}

async function assertManagedParent(root, managedPath) {
  const [realRoot, realParent] = await Promise.all([
    realpath(root),
    realpath(path.dirname(managedPath)),
  ]);
  if (realParent !== realRoot && !realParent.startsWith(`${realRoot}${path.sep}`)) {
    throw new RangeError('Managed path escapes the Vault through a symlink');
  }
}

export async function stageEvidenceFile({
  root,
  sourcePath,
  stagedPath,
  maxBytes = DEFAULT_MAX_EVIDENCE_BYTES,
  fault,
}) {
  if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) {
    throw new TypeError('A trusted absolute source path is required');
  }
  const sourceStat = await stat(sourcePath);
  if (!sourceStat.isFile()) throw new TypeError('Evidence source must be a file');
  if (sourceStat.size > maxBytes) throw new RangeError('Evidence files are limited to 100 MB');
  if (fault === 'before-stage') throw new Error('Injected failure before staging');

  const destination = resolveManagedPath(root, stagedPath);
  await mkdir(path.dirname(destination), { recursive: true });
  await assertManagedParent(root, destination);
  const hash = createHash('sha256');
  let copied = 0;
  const hashingStream = new Transform({
    transform(chunk, _encoding, callback) {
      copied += chunk.length;
      if (copied > maxBytes) {
        callback(new RangeError('Evidence file exceeded the configured size limit'));
        return;
      }
      hash.update(chunk);
      if (fault === 'during-stage' && copied > 0) {
        callback(new Error('Injected failure during staging'));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      createReadStream(sourcePath),
      hashingStream,
      createWriteStream(destination, { flags: 'wx' }),
    );
  } catch (error) {
    await rm(destination, { force: true });
    throw error;
  }

  return {
    byteSize: copied,
    sha256: hash.digest('hex'),
  };
}

export async function promoteEvidenceFile({ root, stagedPath, finalPath, fault }) {
  const staged = resolveManagedPath(root, stagedPath);
  const final = resolveManagedPath(root, finalPath);
  await mkdir(path.dirname(final), { recursive: true });
  await assertManagedParent(root, staged);
  await assertManagedParent(root, final);
  if (fault === 'before-promote') throw new Error('Injected failure before promotion');
  await rename(staged, final);
  if (fault === 'after-promote') throw new Error('Injected failure after promotion');
  return finalPath;
}

export async function compensateEvidenceFiles({ root, stagedPath, finalPath }) {
  if (stagedPath) {
    const staged = resolveManagedPath(root, stagedPath);
    await mkdir(path.dirname(staged), { recursive: true });
    await assertManagedParent(root, staged);
    await rm(staged, { force: true });
  }
  if (finalPath) {
    const final = resolveManagedPath(root, finalPath);
    await mkdir(path.dirname(final), { recursive: true });
    await assertManagedParent(root, final);
    await rm(final, { force: true });
  }
}

export async function managedFileState({ root, stagedPath, finalPath }) {
  const exists = async (relativePath) => {
    if (!relativePath) return false;
    try {
      const managedPath = resolveManagedPath(root, relativePath);
      await assertManagedParent(root, managedPath);
      return (await stat(managedPath)).isFile();
    } catch {
      return false;
    }
  };
  return {
    stagedExists: await exists(stagedPath),
    finalExists: await exists(finalPath),
  };
}
