import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { all, get, getVaultInfo, run, transaction, type Row } from '@workspace/db';
import { executeCapability } from './intelligence';

type Component = { key: string; status: 'Pass' | 'Warning' | 'Fail'; explanation: string };
type IntegrityState = 'Pending' | 'Valid' | 'Missing' | 'Modified' | 'Unverifiable';

export type EvidenceIntegrityResult = {
  state: IntegrityState;
  capabilityId: 'evidence-integrity';
  capabilityVersion: '1.0.0';
  inputWatermark: string;
  calculatedAt: string;
  components: Component[];
  explanation: string;
  evidenceRefs: string[];
  repairGuidance: string[];
};

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath, { highWaterMark: 1024 * 1024 })) hash.update(chunk);
  return hash.digest('hex');
}

function managedPath(source: Row): { absolute?: string; issue?: string } {
  const relative = source.vault_path == null ? undefined : String(source.vault_path);
  if (!relative) return { issue: 'Managed source has no Vault path.' };
  const root = realpathSync(getVaultInfo().root);
  const candidate = path.resolve(root, relative);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) return { issue: 'Managed path escapes the Vault.' };
  if (!existsSync(candidate)) return { issue: 'Managed source file is missing.' };
  const real = realpathSync(candidate);
  if (real !== root && !real.startsWith(`${root}${path.sep}`)) return { issue: 'Managed source resolves outside the Vault.' };
  return { absolute: real };
}

export function invalidateEvidenceIntegrity(evidenceId: number) {
  run(`UPDATE intelligence_results SET invalidated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE capability_id = 'evidence-integrity' AND subject_type = 'evidence'
      AND subject_id = ? AND invalidated_at IS NULL`, [evidenceId]);
}

export function latestEvidenceIntegrity(evidenceId: number): EvidenceIntegrityResult | undefined {
  const row = get(`SELECT value FROM intelligence_results
    WHERE capability_id = 'evidence-integrity' AND capability_version = '1.0.0'
      AND subject_type = 'evidence' AND subject_id = ? AND invalidated_at IS NULL
    ORDER BY calculated_at DESC, id DESC LIMIT 1`, [evidenceId]);
  return row ? JSON.parse(String(row.value)) as EvidenceIntegrityResult : undefined;
}

export async function verifyEvidenceIntegrity(evidenceId: number): Promise<EvidenceIntegrityResult | undefined> {
  const evidence = get('SELECT * FROM evidence WHERE id = ?', [evidenceId]);
  if (!evidence) return undefined;
  const existingJob = get(`SELECT id FROM evidence_integrity_jobs
    WHERE evidence_id = ? AND state IN ('Queued', 'Running') LIMIT 1`, [evidenceId]);
  if (existingJob) throw new Error('VerificationAlreadyRunning');

  const sources = all('SELECT * FROM evidence_sources WHERE evidence_id = ? ORDER BY version', [evidenceId]);
  const jobId = randomUUID();
  run("INSERT INTO evidence_integrity_jobs (id, evidence_id, state) VALUES (?, ?, 'Queued')", [jobId, evidenceId]);
  run(`UPDATE evidence_integrity_jobs SET state = 'Running',
    started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`, [jobId]);

  try {
    const components: Component[] = [];
    const evidenceRefs: string[] = [`evidence:${evidenceId}`];
    const repairGuidance: string[] = [];
    const sourceWatermarks: string[] = [];
    let missing = false;
    let modified = false;
    let unverifiable = false;

    if (evidence.project_id == null) {
      components.push({ key: 'workspace', status: 'Fail', explanation: 'Evidence has no canonical Workspace owner.' });
      repairGuidance.push('Assign this legacy Evidence to a Workspace.');
      unverifiable = true;
    } else {
      components.push({ key: 'workspace', status: 'Pass', explanation: `Owned by Workspace ${evidence.project_id}.` });
    }
    if (!sources.length) {
      components.push({ key: 'source', status: 'Fail', explanation: 'No immutable source version exists.' });
      repairGuidance.push('Capture or migrate a source version.');
      missing = true;
    }

    for (const source of sources) {
      evidenceRefs.push(`evidence-source:${source.id}`);
      const provenanceComplete = Boolean(source.capture_method && source.producer_metadata);
      components.push({
        key: `source-${source.id}-provenance`,
        status: provenanceComplete ? 'Pass' : 'Warning',
        explanation: provenanceComplete ? 'Capture method and producer metadata are present.' : 'Source provenance is incomplete.',
      });
      if (!provenanceComplete) {
        unverifiable = true;
        repairGuidance.push(`Complete provenance for source version ${source.version}.`);
      }

      if (source.source_kind === 'ManagedFile') {
        const resolved = managedPath(source);
        if (!resolved.absolute) {
          components.push({ key: `source-${source.id}-presence`, status: 'Fail', explanation: resolved.issue! });
          repairGuidance.push(`Restore the managed bytes for source version ${source.version}.`);
          missing = true;
          sourceWatermarks.push(`${source.id}:missing`);
          continue;
        }
        const stat = statSync(resolved.absolute);
        sourceWatermarks.push(`${source.id}:${stat.size}:${stat.mtimeMs}`);
        const actual = await sha256File(resolved.absolute);
        if (!source.sha256) {
          components.push({ key: `source-${source.id}-checksum`, status: 'Warning', explanation: 'Managed bytes exist but no expected SHA-256 is recorded.' });
          repairGuidance.push(`Record a trusted checksum through a new capture for source version ${source.version}.`);
          unverifiable = true;
        } else if (actual !== source.sha256) {
          components.push({ key: `source-${source.id}-checksum`, status: 'Fail', explanation: 'Managed bytes do not match the recorded SHA-256.' });
          repairGuidance.push(`Restore the original bytes or capture the changed artifact as a new source version.`);
          modified = true;
        } else {
          components.push({ key: `source-${source.id}-checksum`, status: 'Pass', explanation: 'Managed bytes match the recorded SHA-256.' });
        }
      } else {
        const present = Boolean(source.inline_content || source.origin_uri || source.repository_revision);
        components.push({ key: `source-${source.id}-presence`, status: present ? 'Pass' : 'Fail', explanation: present ? 'Source reference payload is present.' : 'Source reference payload is missing.' });
        sourceWatermarks.push(`${source.id}:${source.created_at}`);
        if (!present) missing = true;
        if (!source.sha256) unverifiable = true;
      }
    }

    const brokenLocators = Number(get(`SELECT count(*) count FROM evidence_source_locators l
      LEFT JOIN evidence_sources s ON s.id = l.source_id WHERE s.id IS NULL`)?.count ?? 0);
    components.push({ key: 'references', status: brokenLocators ? 'Fail' : 'Pass', explanation: brokenLocators ? `${brokenLocators} broken source locator references exist.` : 'Authoritative source references are intact.' });
    if (brokenLocators) missing = true;

    const state: IntegrityState = missing ? 'Missing' : modified ? 'Modified' : unverifiable ? 'Unverifiable' : 'Valid';
    const inputWatermark = createHash('sha256')
      .update(`${evidence.version}:${evidence.updated_at}:${sourceWatermarks.join('|')}`)
      .digest('hex');
    const result: EvidenceIntegrityResult = {
      state,
      capabilityId: 'evidence-integrity',
      capabilityVersion: '1.0.0',
      inputWatermark,
      calculatedAt: new Date().toISOString(),
      components,
      explanation: state === 'Valid'
        ? 'All governed provenance and integrity checks passed.'
        : `Evidence Integrity is ${state}; review failed or warning components.`,
      evidenceRefs,
      repairGuidance: [...new Set(repairGuidance)],
    };

    invalidateEvidenceIntegrity(evidenceId);
    executeCapability({
      subjectType: 'evidence',
      subjectId: evidenceId,
      inputWatermark,
      capability: {
        id: 'evidence-integrity', version: '1.0.0', resultKind: 'integrity',
        classification: 'deterministic',
        analyze: () => ({ value: result, explanation: result.explanation, evidenceRefs }),
      },
    });
    transaction(() => {
      run(`UPDATE evidence_integrity_jobs SET state = 'Completed', input_watermark = ?,
        completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`, [inputWatermark, jobId]);
    });
    return result;
  } catch (error) {
    run(`UPDATE evidence_integrity_jobs SET state = 'Failed', error_category = ?,
      completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    [error instanceof Error ? error.name : 'VerificationFailure', jobId]);
    throw error;
  }
}
