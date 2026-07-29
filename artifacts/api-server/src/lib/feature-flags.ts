import { get } from '@workspace/db';

export const evidenceFeatureFlags = {
  canonicalContracts: 'evidence.canonical-contracts',
  sourceVersions: 'evidence.source-versions',
  recoverableIngest: 'evidence.recoverable-ingest',
  detailRoute: 'evidence.detail-route',
} as const;

export type EvidenceFeatureFlag =
  (typeof evidenceFeatureFlags)[keyof typeof evidenceFeatureFlags];

export function isFeatureEnabled(flag: EvidenceFeatureFlag): boolean {
  const row = get('SELECT enabled FROM feature_flags WHERE flag_key = ?', [flag]);
  return Number(row?.enabled) === 1;
}
