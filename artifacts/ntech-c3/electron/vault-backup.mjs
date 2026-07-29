import { execFile } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function validateArchiveListing(listing) {
  const entries = listing.split('\n').filter(Boolean);
  if (entries.some((entry) => entry.includes('\0') || entry.startsWith('/') || entry.split('/').includes('..'))) {
    throw new Error('Unsafe backup archive');
  }
  return entries;
}

export async function createVaultBackup({ root, destination, execute = execFileAsync }) {
  await stat(`${root}/database/ntc3.sqlite`);
  await execute('tar', ['-czf', destination, '-C', root, '.'], { timeout: 120000 });
  return destination;
}

export async function extractVaultBackup({ archive, destination, execute = execFileAsync }) {
  const listing = (await execute('tar', ['-tzf', archive], { timeout: 30000 })).stdout;
  validateArchiveListing(listing);
  await execute('tar', ['-xzf', archive, '-C', destination], { timeout: 120000 });
  await stat(`${destination}/database/ntc3.sqlite`);
  return listing.split('\n').filter(Boolean);
}
