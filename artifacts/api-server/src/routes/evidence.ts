import { Router, type IRouter } from 'express';
import {
  ListEvidenceQueryParams, ListEvidenceResponse, CreateEvidenceBody, CreateEvidenceResponse,
  GetEvidenceParams, GetEvidenceResponse, UpdateEvidenceParams, UpdateEvidenceBody,
  UpdateEvidenceResponse, DeleteEvidenceParams,
  ListRecoverableEvidenceIngestsResponse, CreateEvidenceIngestBody, CreateEvidenceIngestResponse,
  RecordEvidenceIngestStagedParams, RecordEvidenceIngestStagedBody,
  RecordEvidenceIngestStagedResponse, CompleteEvidenceIngestMetadataParams,
  CompleteEvidenceIngestMetadataResponse,
  FinalizeEvidenceIngestParams, FinalizeEvidenceIngestResponse, FailEvidenceIngestParams,
  FailEvidenceIngestBody, FailEvidenceIngestResponse,
} from '@workspace/api-zod';
import { createEntity, deleteEntity, entityConfigs, getEntity, listEntities, updateEntity } from '../lib/entity-store';
import { all, get, run, transaction, type Row } from '@workspace/db';
import { appendDomainEvent, projectDomainEventsToActivity } from '../lib/events';
import { guardWorkspaceMutations, workspaceMutationError } from '../lib/workspace-guard';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

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
  if (body.data.projectId != null && body.data.workspaceId != null
    && body.data.projectId !== body.data.workspaceId) {
    return void res.status(400).json({ error: 'projectId must match canonical workspaceId when both are supplied' });
  }
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  const updateData = body.data.workspaceId == null
    ? body.data
    : { ...body.data, projectId: undefined };
  const row = transaction(() => {
    const updated = updateEntity(config, params.data.id, updateData)!;
    appendDomainEvent({
      eventType: 'EvidenceUpdated', eventVersion: 1, aggregateType: 'evidence',
      aggregateId: params.data.id,
      payload: { entityTitle: String(updated.title), action: 'updated' },
    });
    return updated;
  });
  projectDomainEventsToActivity();
  res.json(UpdateEvidenceResponse.parse(row));
});
router.delete('/evidence/:id', (req, res) => {
  const params = DeleteEvidenceParams.safeParse(req.params);
  if (!params.success) return void res.status(400).json({ error: params.error.message });
  const existing = getEntity(config, params.data.id);
  if (!existing) return void res.status(404).json({ error: 'Evidence not found' });
  transaction(() => {
    deleteEntity(config, params.data.id);
    appendDomainEvent({
      eventType: 'EvidenceDeleted', eventVersion: 1, aggregateType: 'evidence',
      aggregateId: params.data.id,
      payload: { entityTitle: String(existing.title), action: 'deleted' },
    });
  });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

export default router;
