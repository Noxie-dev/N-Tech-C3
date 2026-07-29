import { Router, type IRouter } from 'express';
import {
  ListEvidenceQueryParams, ListEvidenceResponse, CreateEvidenceBody, CreateEvidenceResponse,
  GetEvidenceParams, GetEvidenceResponse, UpdateEvidenceParams, UpdateEvidenceBody,
  UpdateEvidenceResponse, DeleteEvidenceParams,
  ArchiveEvidenceParams, ArchiveEvidenceBody, ArchiveEvidenceResponse,
  RestoreEvidenceParams, RestoreEvidenceBody, RestoreEvidenceResponse,
  ListEvidenceSourcesParams, ListEvidenceSourcesResponse,
  ListEvidenceSourceLocatorsParams, ListEvidenceSourceLocatorsResponse,
  CreateEvidenceSourceLocatorParams, CreateEvidenceSourceLocatorBody, CreateEvidenceSourceLocatorResponse,
  DeleteEvidenceSourceLocatorParams,
  ListEvidenceStoryLinksParams, ListEvidenceStoryLinksResponse,
  LinkEvidenceToStoryParams, LinkEvidenceToStoryBody, LinkEvidenceToStoryResponse,
  UnlinkEvidenceFromStoryParams,
  GetEvidenceIntegrityParams, GetEvidenceIntegrityResponse,
  VerifyEvidenceIntegrityParams, VerifyEvidenceIntegrityResponse,
  ListRecoverableEvidenceIngestsResponse, CreateEvidenceIngestBody, CreateEvidenceIngestResponse,
  RecordEvidenceIngestStagedParams, RecordEvidenceIngestStagedBody,
  RecordEvidenceIngestStagedResponse, CompleteEvidenceIngestMetadataParams,
  CompleteEvidenceIngestMetadataResponse,
  FinalizeEvidenceIngestParams, FinalizeEvidenceIngestResponse, FailEvidenceIngestParams,
  FailEvidenceIngestBody, FailEvidenceIngestResponse,
} from '@workspace/api-zod';
import { createEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { all, get, run, transaction, type Row } from '@workspace/db';
import { appendDomainEvent, projectDomainEventsToActivity } from '../lib/events';
import { guardWorkspaceMutations, workspaceMutationError } from '../lib/workspace-guard';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  invalidateEvidenceIntegrity, latestEvidenceIntegrity, verifyEvidenceIntegrity,
} from '../lib/evidence-integrity';

const router: IRouter = Router();
const config = entityConfigs.evidence;
router.use(guardWorkspaceMutations(config.table));

function safeEvidenceName(name: string) {
  return path.basename(name)
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/\.{2,}/g, '-') || 'evidence.bin';
}

function hydrateIngest(row: Row) {
  return {
    id: String(row.id),
    workspaceId: Number(row.workspace_id),
    stagedPath: row.staged_path == null ? null : String(row.staged_path),
    finalPath: row.final_path == null ? null : String(row.final_path),
    originalName: String(row.original_name),
    mediaType: row.media_type == null ? null : String(row.media_type),
    byteSize: row.byte_size == null ? null : Number(row.byte_size),
    sha256: row.sha256 == null ? null : String(row.sha256),
    state: String(row.state),
    retryCount: Number(row.retry_count),
    errorCategory: row.error_category == null ? null : String(row.error_category),
    evidenceId: row.evidence_id == null ? null : Number(row.evidence_id),
    sourceId: row.source_id == null ? null : Number(row.source_id),
    idempotencyKey: String(row.idempotency_key),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getIngest(id: string) {
  const row = get('SELECT * FROM evidence_ingests WHERE id = ?', [id]);
  return row ? hydrateIngest(row) : undefined;
}

function getIngestRow(id: string) {
  return get('SELECT * FROM evidence_ingests WHERE id = ?', [id]);
}

function ingestResult(id: string) {
  const ingest = getIngest(id);
  if (!ingest?.evidenceId) return undefined;
  const evidence = getEntity(config, ingest.evidenceId);
  return evidence ? { ingest, evidence } : undefined;
}

function evidenceSource(row: Row) {
  let producerMetadata: Record<string, unknown> = {};
  try { producerMetadata = JSON.parse(String(row.producer_metadata ?? '{}')); } catch { /* preserve empty metadata */ }
  return {
    id: Number(row.id), evidenceId: Number(row.evidence_id), version: Number(row.version),
    sourceKind: String(row.source_kind), mediaType: row.media_type, originalName: row.original_name,
    byteSize: row.byte_size == null ? null : Number(row.byte_size), sha256: row.sha256,
    vaultPath: row.vault_path, inlineContent: row.inline_content, originUri: row.origin_uri,
    repositoryId: row.repository_id == null ? null : Number(row.repository_id),
    repositoryRevision: row.repository_revision, captureMethod: String(row.capture_method),
    producerMetadata, createdAt: row.created_at,
  };
}

function evidenceStoryLink(row: Row) {
  return {
    evidenceId: Number(row.evidence_id), storyId: Number(row.story_id),
    storyTitle: String(row.story_title), role: String(row.role),
    relevance: Number(row.relevance), notes: row.notes,
    sourceLocatorId: row.source_locator_id == null ? null : Number(row.source_locator_id),
    linkedAt: row.linked_at,
  };
}

function evidenceLocator(row: Row) {
  let coordinates: Record<string, unknown> = {};
  try { coordinates = JSON.parse(String(row.coordinates)); } catch { /* invalid legacy JSON is represented safely */ }
  return {
    id: Number(row.id), sourceId: Number(row.source_id),
    locatorVersion: Number(row.locator_version), kind: String(row.kind),
    coordinates, label: row.label, createdAt: row.created_at,
  };
}

function locatorCoordinatesError(kind: string, value: Record<string, unknown>): string | undefined {
  const finite = (key: string) => typeof value[key] === 'number' && Number.isFinite(value[key]);
  const positive = (key: string) => finite(key) && Number(value[key]) > 0;
  if (kind === 'WholeArtifact') return Object.keys(value).length ? 'WholeArtifact coordinates must be empty' : undefined;
  if (kind === 'Page') return positive('page') ? undefined : 'Page locator requires a positive page';
  if (kind === 'Timestamp') return finite('startMs') && (!('endMs' in value) || finite('endMs')) ? undefined : 'Timestamp locator requires startMs and optional endMs';
  if (kind === 'TextRange') return (positive('startLine') || finite('startOffset')) ? undefined : 'TextRange requires startLine or startOffset';
  if (kind === 'ImageRegion') return ['x', 'y', 'width', 'height'].every(finite) ? undefined : 'ImageRegion requires numeric x, y, width, and height';
  if (kind === 'RepositoryPath') return typeof value.path === 'string' && typeof value.revision === 'string' ? undefined : 'RepositoryPath requires path and immutable revision';
  if (kind === 'JsonPointer') return typeof value.pointer === 'string' && String(value.pointer).startsWith('/') ? undefined : 'JsonPointer requires an RFC 6901 pointer';
  return 'Unsupported locator kind';
}

function storyLinks(evidenceId: number) {
  return all(`
    SELECT se.*, s.title story_title
    FROM story_evidence se
    JOIN stories s ON s.id = se.story_id
    WHERE se.evidence_id = ?
    ORDER BY se.linked_at DESC, se.story_id
  `, [evidenceId]).map(evidenceStoryLink);
}

function appendEvidenceEvent(evidence: Row, eventType: string, action: string, payload: Record<string, unknown> = {}) {
  appendDomainEvent({
    eventType, eventVersion: 1, aggregateType: 'evidence', aggregateId: Number(evidence.id),
    payload: { entityTitle: String(evidence.title), action, ...payload },
  });
}

router.get('/evidence', (req, res) => {
  const query = ListEvidenceQueryParams.safeParse(req.query);
  if (!query.success) return void res.status(400).json({ error: query.error.message });
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (query.data.type) { conditions.push('type = ?'); params.push(query.data.type); }
  if (query.data.storyId != null) { conditions.push('story_id = ?'); params.push(query.data.storyId); }
  const workspaceId = query.data.workspaceId ?? query.data.projectId;
  if (workspaceId != null) { conditions.push('project_id = ?'); params.push(workspaceId); }
  if (query.data.classification) { conditions.push('classification = ?'); params.push(query.data.classification); }
  conditions.push('lifecycle_status = ?');
  params.push(query.data.lifecycleStatus ?? 'Active');
  if (query.data.reviewStatus) { conditions.push('review_status = ?'); params.push(query.data.reviewStatus); }
  if (query.data.search) { conditions.push('title LIKE ?'); params.push(`%${query.data.search}%`); }
  res.json(ListEvidenceResponse.parse(listEntities(config, {
    where: conditions.join(' AND ') || undefined, params, orderBy: 'created_at DESC',
  })));
});
router.post('/evidence', async (req, res) => {
  const parsed = CreateEvidenceBody.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: parsed.error.message });
  if (parsed.data.projectId != null && parsed.data.projectId !== parsed.data.workspaceId) {
    return void res.status(400).json({ error: 'projectId must match canonical workspaceId when both are supplied' });
  }
  const createData = { ...parsed.data, projectId: undefined };
  const row = transaction(() => {
    const created = createEntity(config, createData);
    if (!created) throw new Error('Evidence creation failed');
    appendDomainEvent({
      eventType: 'EvidenceCaptured', eventVersion: 1, aggregateType: 'evidence',
      aggregateId: Number(created.id),
      payload: { entityTitle: String(created.title), action: 'captured' },
    });
    return created;
  });
  projectDomainEventsToActivity();
  res.status(201).json(CreateEvidenceResponse.parse(row));
});

router.get('/evidence/ingests', (_req, res) => {
  const rows = all(`
    SELECT * FROM evidence_ingests
    WHERE state IN ('Staged', 'MetadataCommitted', 'Promoted', 'Compensating')
    ORDER BY created_at
  `).map(hydrateIngest);
  res.json(ListRecoverableEvidenceIngestsResponse.parse(rows));
});

router.post('/evidence/ingests', (req, res) => {
  const body = CreateEvidenceIngestBody.safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: body.error.message });
  const workspaceError = workspaceMutationError(body.data.workspaceId);
  if (workspaceError) {
    return void res.status(workspaceError === 'Workspace not found' ? 404 : 409).json({ error: workspaceError });
  }
  const existing = get(
    'SELECT * FROM evidence_ingests WHERE idempotency_key = ?',
    [body.data.idempotencyKey],
  );
  if (existing) {
    const existingPayload = JSON.parse(String(existing.capture_payload ?? '{}'));
    if (Number(existing.workspace_id) !== body.data.workspaceId
      || String(existing.original_name) !== body.data.originalName
      || JSON.stringify(existingPayload) !== JSON.stringify(body.data)) {
      return void res.status(409).json({ error: 'Idempotency key belongs to a different ingest request' });
    }
    return void res.json(CreateEvidenceIngestResponse.parse(hydrateIngest(existing)));
  }
  const id = randomUUID();
  const stagedPath = path.posix.join('evidence', '.staging', `${id}.part`);
  run(`
    INSERT INTO evidence_ingests (
      id, workspace_id, staged_path, original_name, media_type, state,
      idempotency_key, capture_payload
    ) VALUES (?, ?, ?, ?, ?, 'Staged', ?, ?)
  `, [
    id,
    body.data.workspaceId,
    stagedPath,
    body.data.originalName,
    body.data.mediaType ?? null,
    body.data.idempotencyKey,
    JSON.stringify(body.data),
  ]);
  res.status(201).json(CreateEvidenceIngestResponse.parse(getIngest(id)));
});

router.post('/evidence/ingests/:ingestId/staged', (req, res) => {
  const params = RecordEvidenceIngestStagedParams.safeParse(req.params);
  const body = RecordEvidenceIngestStagedBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid staging metadata' });
  const ingest = getIngest(params.data.ingestId);
  if (!ingest) return void res.status(404).json({ error: 'Evidence ingest not found' });
  if (ingest.state !== 'Staged') {
    if (ingest.byteSize === body.data.byteSize && ingest.sha256 === body.data.sha256) {
      return void res.json(RecordEvidenceIngestStagedResponse.parse(ingest));
    }
    return void res.status(409).json({ error: `Cannot stage an ingest in ${ingest.state}` });
  }
  if (ingest.sha256 && (ingest.sha256 !== body.data.sha256 || ingest.byteSize !== body.data.byteSize)) {
    return void res.status(409).json({ error: 'Staging metadata conflicts with the idempotent ingest' });
  }
  const finalPath = path.posix.join(
    'evidence',
    `${body.data.sha256.slice(0, 16)}-${ingest.id}-${safeEvidenceName(ingest.originalName)}`,
  );
  run(`
    UPDATE evidence_ingests
    SET byte_size = ?, sha256 = ?, final_path = ?,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `, [body.data.byteSize, body.data.sha256, finalPath, ingest.id]);
  res.json(RecordEvidenceIngestStagedResponse.parse(getIngest(ingest.id)));
});

router.post('/evidence/ingests/:ingestId/complete', (req, res) => {
  const params = CompleteEvidenceIngestMetadataParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: 'Invalid Evidence ingest metadata' });
  const ingest = getIngest(params.data.ingestId);
  if (!ingest) return void res.status(404).json({ error: 'Evidence ingest not found' });
  const rawIngest = getIngestRow(ingest.id);
  const capture = CreateEvidenceIngestBody.safeParse(
    JSON.parse(String(rawIngest?.capture_payload ?? '{}')),
  );
  if (!capture.success) return void res.status(500).json({ error: 'Persisted Evidence capture payload is invalid' });
  const existingResult = ingestResult(ingest.id);
  if (existingResult && ['MetadataCommitted', 'Promoted', 'Completed'].includes(ingest.state)) {
    return void res.json(CompleteEvidenceIngestMetadataResponse.parse(existingResult));
  }
  if (ingest.state !== 'Staged' || !ingest.sha256 || ingest.byteSize == null || !ingest.finalPath) {
    return void res.status(409).json({ error: 'Ingest has not completed trusted file staging' });
  }
  const workspaceError = workspaceMutationError(ingest.workspaceId);
  if (workspaceError) {
    return void res.status(workspaceError === 'Workspace not found' ? 404 : 409).json({ error: workspaceError });
  }
  transaction(() => {
    const evidence = createEntity(config, {
      title: capture.data.title,
      type: capture.data.type,
      source: ingest.finalPath,
      notes: capture.data.notes,
      tags: capture.data.tags,
      storyId: capture.data.storyId,
      workspaceId: ingest.workspaceId,
      repository: capture.data.repository,
      classification: capture.data.classification ?? 'FactualRecord',
      lifecycleStatus: 'CapturePending',
    });
    if (!evidence) throw new Error('Evidence metadata creation failed');
    const source = run(`
      INSERT INTO evidence_sources (
        evidence_id, version, source_kind, media_type, original_name, byte_size,
        sha256, vault_path, capture_method, producer_metadata
      ) VALUES (?, 1, 'ManagedFile', ?, ?, ?, ?, ?, 'DesktopFileImport', ?)
    `, [
      Number(evidence.id),
      ingest.mediaType,
      ingest.originalName,
      ingest.byteSize,
      ingest.sha256,
      ingest.finalPath,
      JSON.stringify({ ingestId: ingest.id, idempotencyKey: ingest.idempotencyKey }),
    ]);
    run(`
      UPDATE evidence_ingests
      SET state = 'MetadataCommitted', evidence_id = ?, source_id = ?,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `, [Number(evidence.id), Number(source.lastInsertRowid), ingest.id]);
    appendDomainEvent({
      eventType: 'EvidenceCaptureRequested',
      eventVersion: 1,
      aggregateType: 'evidence',
      aggregateId: Number(evidence.id),
      payload: {
        entityTitle: String(evidence.title),
        action: 'capture requested',
        ingestId: ingest.id,
        sourceId: Number(source.lastInsertRowid),
      },
    });
  });
  projectDomainEventsToActivity();
  res.json(CompleteEvidenceIngestMetadataResponse.parse(ingestResult(ingest.id)));
});

router.post('/evidence/ingests/:ingestId/promoted', (req, res) => {
  const params = FinalizeEvidenceIngestParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const ingest = getIngest(params.data.ingestId);
  if (!ingest) return void res.status(404).json({ error: 'Evidence ingest not found' });
  const existingResult = ingestResult(ingest.id);
  if (ingest.state === 'Completed' && existingResult) {
    return void res.json(FinalizeEvidenceIngestResponse.parse(existingResult));
  }
  if (!ingest.evidenceId || !['MetadataCommitted', 'Promoted'].includes(ingest.state)) {
    return void res.status(409).json({ error: `Cannot promote an ingest in ${ingest.state}` });
  }
  transaction(() => {
    run(`
      UPDATE evidence
      SET lifecycle_status = 'Active', version = version + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `, [ingest.evidenceId!]);
    run(`
      UPDATE evidence_ingests
      SET state = 'Completed', error_category = NULL,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?
    `, [ingest.id]);
    appendDomainEvent({
      eventType: 'EvidenceCaptured',
      eventVersion: 1,
      aggregateType: 'evidence',
      aggregateId: ingest.evidenceId!,
      payload: {
        entityTitle: String(getEntity(config, ingest.evidenceId!)?.title ?? ingest.originalName),
        action: 'captured',
        ingestId: ingest.id,
        sourceId: ingest.sourceId,
        sha256: ingest.sha256,
      },
    });
  });
  projectDomainEventsToActivity();
  res.json(FinalizeEvidenceIngestResponse.parse(ingestResult(ingest.id)));
});

router.post('/evidence/ingests/:ingestId/fail', (req, res) => {
  const params = FailEvidenceIngestParams.safeParse(req.params);
  const body = FailEvidenceIngestBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid ingest failure' });
  const ingest = getIngest(params.data.ingestId);
  if (!ingest) return void res.status(404).json({ error: 'Evidence ingest not found' });
  if (ingest.state === 'Completed') {
    return void res.status(409).json({ error: 'Completed Evidence ingest cannot be failed' });
  }
  if (ingest.state !== 'Failed') {
    transaction(() => {
      run(`
        UPDATE evidence_ingests
        SET state = 'Failed', error_category = ?, retry_count = retry_count + 1,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?
      `, [body.data.errorCategory, ingest.id]);
      if (ingest.evidenceId) {
        run(`
          UPDATE evidence
          SET lifecycle_status = 'IngestFailed',
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ?
        `, [ingest.evidenceId]);
        appendDomainEvent({
          eventType: 'EvidenceIngestFailed',
          eventVersion: 1,
          aggregateType: 'evidence',
          aggregateId: ingest.evidenceId,
          payload: {
            entityTitle: String(getEntity(config, ingest.evidenceId)?.title ?? ingest.originalName),
            action: body.data.compensated ? 'ingest failed and compensated' : 'ingest failed',
            ingestId: ingest.id,
            errorCategory: body.data.errorCategory,
          },
        });
      }
    });
    projectDomainEventsToActivity();
  }
  res.json(FailEvidenceIngestResponse.parse(getIngest(ingest.id)));
});

router.get('/evidence/:id', (req, res) => {
  const params = GetEvidenceParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const row = getEntity(config, params.data.id);
  if (!row) return void res.status(404).json({ error: 'Evidence not found' });
  res.json(GetEvidenceResponse.parse(row));
});
router.patch('/evidence/:id', (req, res) => {
  const params = UpdateEvidenceParams.safeParse(req.params);
  const body = UpdateEvidenceBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid evidence update' });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  if (existing.lifecycleStatus === 'Archived') {
    return void res.status(409).json({ error: 'Archived Evidence is read-only; restore it before editing' });
  }
  if (body.data.expectedVersion !== existing.version) {
    return void res.status(409).json({ error: 'Evidence has changed; reload before saving', currentVersion: existing.version });
  }
  const { expectedVersion: _expectedVersion, ...updateData } = body.data;
  const row = transaction(() => {
    updateEntity(config, params.data.id, updateData);
    run('UPDATE evidence SET version = version + 1 WHERE id = ?', [params.data.id]);
    const versioned = getEntity(config, params.data.id)!;
    invalidateEvidenceIntegrity(params.data.id);
    appendEvidenceEvent(versioned, 'EvidenceMetadataUpdated', 'metadata updated', {
      previousVersion: existing.version, version: versioned.version,
    });
    if (body.data.reviewStatus != null && body.data.reviewStatus !== existing.reviewStatus) {
      appendEvidenceEvent(versioned, 'EvidenceReviewChanged', `review marked ${body.data.reviewStatus}`, {
        previousReviewStatus: existing.reviewStatus, reviewStatus: body.data.reviewStatus,
      });
    }
    return versioned;
  });
  projectDomainEventsToActivity();
  res.json(UpdateEvidenceResponse.parse(row));
});
router.delete('/evidence/:id', (req, res) => {
  const params = DeleteEvidenceParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  res.status(409).json({ error: 'Permanent Evidence deletion is disabled; archive it instead' });
});

router.post('/evidence/:id/archive', (req, res) => {
  const params = ArchiveEvidenceParams.safeParse(req.params);
  const body = ArchiveEvidenceBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid archive command' });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  if (existing.lifecycleStatus === 'Archived') return void res.json(ArchiveEvidenceResponse.parse(existing));
  if (existing.lifecycleStatus !== 'Active') return void res.status(409).json({ error: `Evidence in ${existing.lifecycleStatus} cannot be archived` });
  if (body.data.expectedVersion !== existing.version) {
    return void res.status(409).json({ error: 'Evidence has changed; reload before archiving', currentVersion: existing.version });
  }
  const row = transaction(() => {
    run(`UPDATE evidence SET lifecycle_status = 'Archived', archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`, [params.data.id]);
    const archived = getEntity(config, params.data.id)!;
    invalidateEvidenceIntegrity(params.data.id);
    appendEvidenceEvent(archived, 'EvidenceArchived', 'archived');
    return archived;
  });
  projectDomainEventsToActivity();
  res.json(ArchiveEvidenceResponse.parse(row));
});

router.post('/evidence/:id/restore', (req, res) => {
  const params = RestoreEvidenceParams.safeParse(req.params);
  const body = RestoreEvidenceBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid restore command' });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  if (existing.lifecycleStatus === 'Active') return void res.json(RestoreEvidenceResponse.parse(existing));
  if (existing.lifecycleStatus !== 'Archived') return void res.status(409).json({ error: `Evidence in ${existing.lifecycleStatus} cannot be restored` });
  if (body.data.expectedVersion !== existing.version) {
    return void res.status(409).json({ error: 'Evidence has changed; reload before restoring', currentVersion: existing.version });
  }
  const workspaceError = workspaceMutationError(existing.workspaceId);
  if (workspaceError) return void res.status(workspaceError === 'Workspace not found' ? 404 : 409).json({ error: workspaceError });
  const row = transaction(() => {
    run(`UPDATE evidence SET lifecycle_status = 'Active', archived_at = NULL, version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`, [params.data.id]);
    const restored = getEntity(config, params.data.id)!;
    invalidateEvidenceIntegrity(params.data.id);
    appendEvidenceEvent(restored, 'EvidenceRestored', 'restored');
    return restored;
  });
  projectDomainEventsToActivity();
  res.json(RestoreEvidenceResponse.parse(row));
});

router.get('/evidence/:id/sources', (req, res) => {
  const params = ListEvidenceSourcesParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Evidence not found' });
  const rows = all('SELECT * FROM evidence_sources WHERE evidence_id = ? ORDER BY version DESC', [params.data.id])
    .map(evidenceSource);
  res.json(ListEvidenceSourcesResponse.parse(rows));
});

router.get('/evidence/:id/sources/:sourceId/locators', (req, res) => {
  const params = ListEvidenceSourceLocatorsParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const source = get('SELECT id FROM evidence_sources WHERE id = ? AND evidence_id = ?', [params.data.sourceId, params.data.id]);
  if (!source) return void res.status(404).json({ error: 'Evidence source not found' });
  res.json(ListEvidenceSourceLocatorsResponse.parse(
    all('SELECT * FROM evidence_source_locators WHERE source_id = ? ORDER BY created_at, id', [params.data.sourceId])
      .map(evidenceLocator),
  ));
});

router.post('/evidence/:id/sources/:sourceId/locators', (req, res) => {
  const params = CreateEvidenceSourceLocatorParams.safeParse(req.params);
  const body = CreateEvidenceSourceLocatorBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid source locator' });
  const evidence = getEntity(config, params.data.id);
  if (!evidence) return void res.status(404).json({ error: 'Evidence not found' });
  if (evidence.lifecycleStatus !== 'Active') return void res.status(409).json({ error: 'Archived or incomplete Evidence is read-only' });
  const source = get('SELECT id FROM evidence_sources WHERE id = ? AND evidence_id = ?', [params.data.sourceId, params.data.id]);
  if (!source) return void res.status(404).json({ error: 'Evidence source not found' });
  const coordinatesError = locatorCoordinatesError(body.data.kind, body.data.coordinates);
  if (coordinatesError) return void res.status(400).json({ error: coordinatesError });
  const row = transaction(() => {
    const result = run(`INSERT INTO evidence_source_locators (source_id, kind, coordinates, label)
      VALUES (?, ?, ?, ?)`, [params.data.sourceId, body.data.kind, JSON.stringify(body.data.coordinates), body.data.label ?? null]);
    const created = get('SELECT * FROM evidence_source_locators WHERE id = ?', [Number(result.lastInsertRowid)])!;
    invalidateEvidenceIntegrity(params.data.id);
    appendEvidenceEvent(evidence, 'EvidenceSourceLocatorAdded', 'source locator added', {
      sourceId: params.data.sourceId, locatorId: Number(created.id), locatorKind: body.data.kind,
    });
    return evidenceLocator(created);
  });
  projectDomainEventsToActivity();
  res.status(201).json(CreateEvidenceSourceLocatorResponse.parse(row));
});

router.delete('/evidence/:id/sources/:sourceId/locators/:locatorId', (req, res) => {
  const params = DeleteEvidenceSourceLocatorParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const evidence = getEntity(config, params.data.id);
  if (!evidence) return void res.status(404).json({ error: 'Evidence not found' });
  if (evidence.lifecycleStatus !== 'Active') return void res.status(409).json({ error: 'Archived or incomplete Evidence is read-only' });
  const locator = get(`SELECT l.id FROM evidence_source_locators l JOIN evidence_sources s ON s.id = l.source_id
    WHERE l.id = ? AND l.source_id = ? AND s.evidence_id = ?`, [params.data.locatorId, params.data.sourceId, params.data.id]);
  if (!locator) return void res.status(404).json({ error: 'Evidence source locator not found' });
  try {
    transaction(() => {
      run('DELETE FROM evidence_source_locators WHERE id = ?', [params.data.locatorId]);
      invalidateEvidenceIntegrity(params.data.id);
      appendEvidenceEvent(evidence, 'EvidenceSourceLocatorRemoved', 'source locator removed', {
        sourceId: params.data.sourceId, locatorId: params.data.locatorId,
      });
    });
  } catch {
    return void res.status(409).json({ error: 'Locator is referenced by an Evidence relationship' });
  }
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

router.get('/evidence/:id/stories', (req, res) => {
  const params = ListEvidenceStoryLinksParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Evidence not found' });
  res.json(ListEvidenceStoryLinksResponse.parse(storyLinks(params.data.id)));
});

router.post('/evidence/:id/stories', (req, res) => {
  const params = LinkEvidenceToStoryParams.safeParse(req.params);
  const body = LinkEvidenceToStoryBody.safeParse(req.body);
  if (!params.success || !body.success) return void res.status(400).json({ error: 'Invalid Evidence Story link' });
  const evidence = getEntity(config, params.data.id);
  if (!evidence) return void res.status(404).json({ error: 'Evidence not found' });
  if (evidence.lifecycleStatus !== 'Active') return void res.status(409).json({ error: 'Only active Evidence can be linked' });
  const story = get('SELECT id, title, project_id, status FROM stories WHERE id = ?', [body.data.storyId]);
  if (!story) return void res.status(404).json({ error: 'Story not found' });
  if (story.status === 'Archived') return void res.status(409).json({ error: 'Archived Stories are read-only' });
  if (story.project_id !== evidence.workspaceId) return void res.status(409).json({ error: 'Evidence and Story must belong to the same Workspace' });
  if (body.data.sourceLocatorId != null) {
    const locator = get(`SELECT l.id FROM evidence_source_locators l JOIN evidence_sources s ON s.id = l.source_id
      WHERE l.id = ? AND s.evidence_id = ?`, [body.data.sourceLocatorId, params.data.id]);
    if (!locator) return void res.status(404).json({ error: 'Evidence source locator not found' });
  }
  transaction(() => {
    const previous = get('SELECT * FROM story_evidence WHERE story_id = ? AND evidence_id = ?', [body.data.storyId, params.data.id]);
    run(`INSERT INTO story_evidence (story_id, evidence_id, role, relevance, notes, source_locator_id)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(story_id, evidence_id) DO UPDATE SET
        role = excluded.role, relevance = excluded.relevance, notes = excluded.notes,
        source_locator_id = excluded.source_locator_id`,
    [body.data.storyId, params.data.id, body.data.role, body.data.relevance, body.data.notes ?? null, body.data.sourceLocatorId ?? null]);
    if (!previous) appendEvidenceEvent(evidence, 'EvidenceLinkedToStory', `linked to Story ${story.title}`, { storyId: body.data.storyId });
  });
  projectDomainEventsToActivity();
  res.status(201).json(LinkEvidenceToStoryResponse.parse(storyLinks(params.data.id)
    .find((link) => link.storyId === body.data.storyId)));
});

router.delete('/evidence/:id/stories/:storyId', (req, res) => {
  const params = UnlinkEvidenceFromStoryParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const evidence = getEntity(config, params.data.id);
  if (!evidence) return void res.status(404).json({ error: 'Evidence not found' });
  if (evidence.lifecycleStatus !== 'Active') return void res.status(409).json({ error: 'Only active Evidence can be unlinked' });
  transaction(() => {
    const existing = get('SELECT 1 FROM story_evidence WHERE story_id = ? AND evidence_id = ?', [params.data.storyId, params.data.id]);
    run('DELETE FROM story_evidence WHERE story_id = ? AND evidence_id = ?', [params.data.storyId, params.data.id]);
    if (existing) appendEvidenceEvent(evidence, 'EvidenceUnlinkedFromStory', `unlinked from Story ${params.data.storyId}`, { storyId: params.data.storyId });
  });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

router.get('/evidence/:id/integrity', (req, res) => {
  const params = GetEvidenceIntegrityParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  if (!getEntity(config, params.data.id)) return void res.status(404).json({ error: 'Evidence not found' });
  const result = latestEvidenceIntegrity(params.data.id);
  if (!result) return void res.status(404).json({ error: 'Evidence has not been verified or the result is stale' });
  res.json(GetEvidenceIntegrityResponse.parse(result));
});

router.post('/evidence/:id/verify', async (req, res) => {
  const params = VerifyEvidenceIntegrityParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  try {
    const result = await verifyEvidenceIntegrity(params.data.id);
    if (!result) return void res.status(404).json({ error: 'Evidence not found' });
    res.json(VerifyEvidenceIntegrityResponse.parse(result));
  } catch (error) {
    if (error instanceof Error && error.message === 'VerificationAlreadyRunning') {
      return void res.status(409).json({ error: 'Evidence verification is already running' });
    }
    throw error;
  }
});

export default router;
