import { Router, type IRouter } from "express";
import {
  ListKnowledgeQueryParams,
  ListKnowledgeResponse,
  CreateKnowledgeBody,
  CreateKnowledgeResponse,
  GetKnowledgeParams,
  GetKnowledgeResponse,
  UpdateKnowledgeParams,
  UpdateKnowledgeBody,
  UpdateKnowledgeResponse,
  DeleteKnowledgeParams,
  TransitionKnowledgeParams,
  TransitionKnowledgeBody,
  TransitionKnowledgeResponse,
  ArchiveKnowledgeParams,
  ArchiveKnowledgeBody,
  ArchiveKnowledgeResponse,
  RestoreKnowledgeParams,
  RestoreKnowledgeBody,
  RestoreKnowledgeResponse,
  ListKnowledgeRelationshipsParams,
  ListKnowledgeRelationshipsResponse,
  CreateKnowledgeRelationshipParams,
  CreateKnowledgeRelationshipBody,
  CreateKnowledgeRelationshipResponse,
  DeleteKnowledgeRelationshipParams,
  ListKnowledgeClaimsParams,
  ListKnowledgeClaimsResponse,
  CreateKnowledgeClaimParams,
  CreateKnowledgeClaimBody,
  CreateKnowledgeClaimResponse,
  UpdateKnowledgeClaimParams,
  UpdateKnowledgeClaimBody,
  UpdateKnowledgeClaimResponse,
  ListKnowledgeClaimCitationsParams,
  ListKnowledgeClaimCitationsResponse,
  CreateKnowledgeClaimCitationParams,
  CreateKnowledgeClaimCitationBody,
  CreateKnowledgeClaimCitationResponse,
  DeleteKnowledgeClaimCitationParams,
  ListKnowledgeVersionsParams,
  ListKnowledgeVersionsResponse,
} from "@workspace/api-zod";
import { all, get, run, transaction, type Row } from "@workspace/db";
import {
  createEntity,
  entityConfigs,
  getEntity,
  listEntities,
} from "../lib/entity-store";
import {
  appendDomainEvent,
  projectDomainEventsToActivity,
} from "../lib/events";
import {
  guardWorkspaceMutations,
  workspaceMutationError,
} from "../lib/workspace-guard";
import { latestEvidenceIntegrity } from "../lib/evidence-integrity";

const router: IRouter = Router();
const config = entityConfigs.knowledge;
router.use(guardWorkspaceMutations(config.table));

const allowedTransitions: Record<string, string[]> = {
  Idea: ["Research", "Archived"],
  Research: ["Idea", "Draft", "Archived"],
  Draft: ["Research", "Verified", "Archived"],
  Verified: ["Draft", "Canonical", "Archived"],
  Canonical: ["Draft", "Archived"],
  Archived: [],
};

function appendKnowledgeEvent(
  eventType: string,
  id: number,
  title: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  appendDomainEvent({
    eventType,
    eventVersion: 1,
    aggregateType: "knowledge",
    aggregateId: id,
    payload: { entityTitle: title, action, ...payload },
  });
}

function checkpoint(id: number, changeSummary: string) {
  run(
    `INSERT INTO knowledge_versions (
    knowledge_id, version, title, summary, content, metadata, change_summary
  ) SELECT id, version, title, summary, content,
    json_object(
      'category', category, 'tags', json(tags), 'owner', owner,
      'lifecycleStatus', lifecycle_status, 'reviewStatus', review_status
    ), ?
  FROM knowledge WHERE id = ?`,
    [changeSummary, id],
  );
}

function knowledgeRow(id: number) {
  return getEntity(config, id);
}

function activeKnowledge(id: number) {
  const row = get("SELECT * FROM knowledge WHERE id = ?", [id]);
  if (!row) return { error: "Knowledge page not found", status: 404 as const };
  if (row.lifecycle_status === "Archived")
    return { error: "Archived Knowledge is read-only", status: 409 as const };
  return { row };
}

function hydrateCitation(row: Row) {
  return {
    id: Number(row.id),
    claimId: Number(row.claim_id),
    evidenceId: Number(row.evidence_id),
    evidenceTitle: String(row.evidence_title),
    sourceId: Number(row.source_id),
    sourceVersion: Number(row.source_version),
    sourceKind: String(row.source_kind),
    locatorId: row.locator_id == null ? null : Number(row.locator_id),
    locatorLabel: row.locator_label == null ? null : String(row.locator_label),
    integrityStatus:
      latestEvidenceIntegrity(Number(row.evidence_id))?.state ?? "Pending",
    notes: row.notes == null ? null : String(row.notes),
    createdAt: String(row.created_at),
  };
}

function citationRows(claimId: number) {
  return all(
    `SELECT c.*, e.title evidence_title, s.version source_version,
      s.source_kind, l.label locator_label
    FROM knowledge_claim_citations c
    JOIN evidence e ON e.id = c.evidence_id
    JOIN evidence_sources s ON s.id = c.source_id
    LEFT JOIN evidence_source_locators l ON l.id = c.locator_id
    WHERE c.claim_id = ? ORDER BY c.created_at, c.id`,
    [claimId],
  ).map(hydrateCitation);
}

function hydrateClaim(row: Row) {
  return {
    id: Number(row.id),
    knowledgeId: Number(row.knowledge_id),
    position: Number(row.position),
    statement: String(row.statement),
    claimKind: String(row.claim_kind),
    supportStatus: String(row.support_status),
    reviewStatus: String(row.review_status),
    reviewer: row.reviewer == null ? null : String(row.reviewer),
    reviewedAt: row.reviewed_at == null ? null : String(row.reviewed_at),
    version: Number(row.version),
    citations: citationRows(Number(row.id)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

router.get("/knowledge", (req, res) => {
  const query = ListKnowledgeQueryParams.safeParse(req.query);
  if (!query.success)
    return void res.status(400).json({ error: query.error.message });
  const conditions = ["project_id IS NOT NULL"];
  const params: Array<string | number> = [];
  if (query.data.category) {
    conditions.push("category = ?");
    params.push(query.data.category);
  }
  if (query.data.search) {
    conditions.push(
      "(title LIKE ? OR coalesce(summary, '') LIKE ? OR coalesce(content, '') LIKE ?)",
    );
    params.push(...Array(3).fill(`%${query.data.search}%`));
  }
  if (query.data.workspaceId != null) {
    conditions.push("project_id = ?");
    params.push(query.data.workspaceId);
  }
  if (query.data.lifecycleStatus)
    conditions.push(`lifecycle_status = '${query.data.lifecycleStatus}'`);
  else conditions.push("lifecycle_status != 'Archived'");
  if (query.data.reviewStatus)
    conditions.push(`review_status = '${query.data.reviewStatus}'`);
  res.json(
    ListKnowledgeResponse.parse(
      listEntities(config, {
        where: conditions.join(" AND "),
        params,
        orderBy: "updated_at DESC",
      }),
    ),
  );
});

router.post("/knowledge", (req, res) => {
  const parsed = CreateKnowledgeBody.safeParse(req.body);
  if (!parsed.success)
    return void res.status(400).json({ error: parsed.error.message });
  const workspaceError = workspaceMutationError(parsed.data.workspaceId);
  if (workspaceError)
    return void res
      .status(workspaceError === "Workspace not found" ? 404 : 409)
      .json({ error: workspaceError });
  try {
    const row = transaction(() => {
      const created = createEntity(config, {
        ...parsed.data,
        lifecycleStatus: "Draft",
        reviewStatus: "Unreviewed",
        version: 1,
      });
      if (!created) throw new Error("Knowledge creation failed");
      checkpoint(Number(created.id), "Knowledge created");
      appendKnowledgeEvent(
        "KnowledgeCreated",
        Number(created.id),
        String(created.title),
        "created",
        { workspaceId: parsed.data.workspaceId },
      );
      return knowledgeRow(Number(created.id));
    });
    projectDomainEventsToActivity();
    res.status(201).json(CreateKnowledgeResponse.parse(row));
  } catch (error) {
    res
      .status(String(error).includes("UNIQUE") ? 409 : 500)
      .json({ error: "Knowledge creation failed" });
  }
});

router.get("/knowledge/:id", (req, res) => {
  const params = GetKnowledgeParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: params.error.message });
  const row = knowledgeRow(params.data.id);
  if (!row?.workspaceId)
    return void res.status(404).json({ error: "Knowledge page not found" });
  res.json(GetKnowledgeResponse.parse(row));
});

router.patch("/knowledge/:id", (req, res) => {
  const params = UpdateKnowledgeParams.safeParse(req.params);
  const body = UpdateKnowledgeBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid Knowledge update" });
  const current = activeKnowledge(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  if (Number(current.row.version) !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Knowledge version conflict" });
  if (body.data.supersedesKnowledgeId != null) {
    const target = get("SELECT project_id FROM knowledge WHERE id = ?", [
      body.data.supersedesKnowledgeId,
    ]);
    if (
      !target ||
      target.project_id !== current.row.project_id ||
      body.data.supersedesKnowledgeId === params.data.id
    ) {
      return void res.status(409).json({
        error:
          "Superseded Knowledge must be a different page in the same Workspace",
      });
    }
  }
  const { expectedVersion: _, changeSummary, ...changes } = body.data;
  transaction(() => {
    const entries = Object.entries(changes).filter(
      ([, value]) => value !== undefined,
    );
    const mapping = config.fields as Record<string, string>;
    const assignments = entries.map(([field]) => `${mapping[field]} = ?`);
    const values = entries.map(([field, value]) => {
      if (field === "tags") return JSON.stringify(value);
      if (value instanceof Date) return value.toISOString();
      return value as string | number | null;
    });
    run(
      `UPDATE knowledge SET ${assignments.join(", ") || "title = title"},
      version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
      [...values, params.data.id],
    );
    checkpoint(params.data.id, changeSummary ?? "Knowledge updated");
    appendKnowledgeEvent(
      "KnowledgeContentUpdated",
      params.data.id,
      String(changes.title ?? current.row.title),
      "updated",
      { version: body.data.expectedVersion + 1 },
    );
  });
  projectDomainEventsToActivity();
  res.json(UpdateKnowledgeResponse.parse(knowledgeRow(params.data.id)));
});

router.delete("/knowledge/:id", (req, res) => {
  const params = DeleteKnowledgeParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid Knowledge ID" });
  res.status(409).json({
    error: "Permanent deletion is disabled; archive Knowledge instead",
  });
});

router.post("/knowledge/:id/transition", (req, res) => {
  const params = TransitionKnowledgeParams.safeParse(req.params);
  const body = TransitionKnowledgeBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid transition" });
  const current = activeKnowledge(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  if (Number(current.row.version) !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Knowledge version conflict" });
  const next = body.data.lifecycleStatus;
  if (!allowedTransitions[String(current.row.lifecycle_status)]?.includes(next))
    return void res
      .status(409)
      .json({ error: "Invalid Knowledge lifecycle transition" });
  if (next === "Verified") {
    const supported = get(
      `SELECT count(*) count FROM knowledge_claims c
      WHERE c.knowledge_id = ? AND c.review_status = 'HumanVerified'
        AND EXISTS (SELECT 1 FROM knowledge_claim_citations x WHERE x.claim_id = c.id)`,
      [params.data.id],
    );
    if (Number(supported?.count ?? 0) === 0)
      return void res.status(409).json({
        error: "Verified Knowledge requires a human-verified cited claim",
      });
  }
  if (
    next === "Canonical" &&
    (!current.row.owner ||
      !current.row.reviewed_at ||
      current.row.review_status !== "Approved")
  ) {
    return void res.status(409).json({
      error:
        "Canonical Knowledge requires owner, review date, and Approved review",
    });
  }
  transaction(() => {
    run(
      `UPDATE knowledge SET lifecycle_status = ?, version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [next, params.data.id],
    );
    checkpoint(params.data.id, `Lifecycle changed to ${next}`);
    appendKnowledgeEvent(
      "KnowledgeLifecycleChanged",
      params.data.id,
      String(current.row.title),
      `transitioned to ${next}`,
      { from: current.row.lifecycle_status, to: next },
    );
  });
  projectDomainEventsToActivity();
  res.json(TransitionKnowledgeResponse.parse(knowledgeRow(params.data.id)));
});

router.post("/knowledge/:id/archive", (req, res) => {
  const params = ArchiveKnowledgeParams.safeParse(req.params);
  const body = ArchiveKnowledgeBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res
      .status(400)
      .json({ error: "Invalid Knowledge archive command" });
  const row = get("SELECT * FROM knowledge WHERE id = ?", [params.data.id]);
  if (!row)
    return void res.status(404).json({ error: "Knowledge page not found" });
  if (Number(row.version) !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Knowledge version conflict" });
  if (row.lifecycle_status !== "Archived")
    transaction(() => {
      run(
        `UPDATE knowledge SET lifecycle_status = 'Archived', archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        [params.data.id],
      );
      checkpoint(params.data.id, "Knowledge archived");
      appendKnowledgeEvent(
        "KnowledgeArchived",
        params.data.id,
        String(row.title),
        "archived",
        { previousLifecycle: row.lifecycle_status },
      );
    });
  projectDomainEventsToActivity();
  res.json(ArchiveKnowledgeResponse.parse(knowledgeRow(params.data.id)));
});

router.post("/knowledge/:id/restore", (req, res) => {
  const params = RestoreKnowledgeParams.safeParse(req.params);
  const body = RestoreKnowledgeBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res
      .status(400)
      .json({ error: "Invalid Knowledge restore command" });
  const row = get("SELECT * FROM knowledge WHERE id = ?", [params.data.id]);
  if (!row)
    return void res.status(404).json({ error: "Knowledge page not found" });
  if (Number(row.version) !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Knowledge version conflict" });
  if (row.lifecycle_status === "Archived")
    transaction(() => {
      run(
        `UPDATE knowledge SET lifecycle_status = 'Draft', archived_at = NULL,
      version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
        [params.data.id],
      );
      checkpoint(params.data.id, "Knowledge restored");
      appendKnowledgeEvent(
        "KnowledgeRestored",
        params.data.id,
        String(row.title),
        "restored",
      );
    });
  projectDomainEventsToActivity();
  res.json(RestoreKnowledgeResponse.parse(knowledgeRow(params.data.id)));
});

router.get("/knowledge/:id/relationships", (req, res) => {
  const params = ListKnowledgeRelationshipsParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid Knowledge ID" });
  const rows = all(
    `SELECT r.*,
      CASE WHEN r.source_knowledge_id = ? THEN 'Outbound' ELSE 'Backlink' END direction,
      CASE WHEN r.source_knowledge_id = ? THEN target.title ELSE source.title END target_title
    FROM knowledge_relationships r
    JOIN knowledge source ON source.id = r.source_knowledge_id
    JOIN knowledge target ON target.id = r.target_knowledge_id
    WHERE r.source_knowledge_id = ? OR r.target_knowledge_id = ?
    ORDER BY r.created_at DESC`,
    [params.data.id, params.data.id, params.data.id, params.data.id],
  ).map((row) => ({
    id: Number(row.id),
    sourceKnowledgeId: Number(row.source_knowledge_id),
    targetKnowledgeId: Number(row.target_knowledge_id),
    relationshipType: String(row.relationship_type),
    direction: String(row.direction),
    targetTitle: String(row.target_title),
    notes: row.notes == null ? null : String(row.notes),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
  }));
  res.json(ListKnowledgeRelationshipsResponse.parse(rows));
});

router.post("/knowledge/:id/relationships", (req, res) => {
  const params = CreateKnowledgeRelationshipParams.safeParse(req.params);
  const body = CreateKnowledgeRelationshipBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid relationship" });
  const source = activeKnowledge(params.data.id);
  if (!source.row)
    return void res.status(source.status).json({ error: source.error });
  const target = get("SELECT * FROM knowledge WHERE id = ?", [
    body.data.targetKnowledgeId,
  ]);
  if (
    !target ||
    target.project_id !== source.row.project_id ||
    target.lifecycle_status === "Archived" ||
    body.data.targetKnowledgeId === params.data.id
  ) {
    return void res.status(409).json({
      error:
        "Knowledge relationships require distinct active pages in the same Workspace",
    });
  }
  if (body.data.relationshipType === "Supersedes") {
    const cycle = get(
      `
      WITH RECURSIVE reachable(id) AS (
        SELECT target_knowledge_id
        FROM knowledge_relationships
        WHERE source_knowledge_id = ? AND relationship_type = 'Supersedes'
        UNION
        SELECT relationship.target_knowledge_id
        FROM knowledge_relationships relationship
        JOIN reachable ON relationship.source_knowledge_id = reachable.id
        WHERE relationship.relationship_type = 'Supersedes'
      )
      SELECT 1 AS found FROM reachable WHERE id = ? LIMIT 1
    `,
      [body.data.targetKnowledgeId, params.data.id],
    );
    if (cycle)
      return void res
        .status(409)
        .json({ error: "Supersedes relationships cannot form a cycle" });
  }
  try {
    const id = transaction(() => {
      const result = run(
        `INSERT INTO knowledge_relationships
        (source_knowledge_id, target_knowledge_id, relationship_type, notes)
        VALUES (?, ?, ?, ?)`,
        [
          params.data.id,
          body.data.targetKnowledgeId,
          body.data.relationshipType,
          body.data.notes ?? null,
        ],
      );
      appendKnowledgeEvent(
        "KnowledgeLinked",
        params.data.id,
        String(source.row.title),
        "linked",
        {
          targetKnowledgeId: body.data.targetKnowledgeId,
          relationshipType: body.data.relationshipType,
        },
      );
      return Number(result.lastInsertRowid);
    });
    projectDomainEventsToActivity();
    const response = {
      id,
      sourceKnowledgeId: params.data.id,
      targetKnowledgeId: body.data.targetKnowledgeId,
      relationshipType: body.data.relationshipType,
      direction: "Outbound",
      targetTitle: String(target.title),
      notes: body.data.notes ?? null,
      createdBy: "Local Owner",
      createdAt: String(
        get("SELECT created_at FROM knowledge_relationships WHERE id = ?", [id])
          ?.created_at,
      ),
    };
    res.status(201).json(CreateKnowledgeRelationshipResponse.parse(response));
  } catch {
    res.status(409).json({ error: "Knowledge relationship already exists" });
  }
});

router.delete("/knowledge/:id/relationships/:relationshipId", (req, res) => {
  const params = DeleteKnowledgeRelationshipParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid relationship" });
  const source = activeKnowledge(params.data.id);
  if (!source.row)
    return void res.status(source.status).json({ error: source.error });
  const link = get(
    "SELECT * FROM knowledge_relationships WHERE id = ? AND source_knowledge_id = ?",
    [params.data.relationshipId, params.data.id],
  );
  if (!link)
    return void res.status(404).json({ error: "Relationship not found" });
  transaction(() => {
    run("DELETE FROM knowledge_relationships WHERE id = ?", [
      params.data.relationshipId,
    ]);
    appendKnowledgeEvent(
      "KnowledgeUnlinked",
      params.data.id,
      String(source.row.title),
      "unlinked",
      { relationshipId: params.data.relationshipId },
    );
  });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

router.get("/knowledge/:id/claims", (req, res) => {
  const params = ListKnowledgeClaimsParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid Knowledge ID" });
  res.json(
    ListKnowledgeClaimsResponse.parse(
      all(
        "SELECT * FROM knowledge_claims WHERE knowledge_id = ? ORDER BY position, id",
        [params.data.id],
      ).map(hydrateClaim),
    ),
  );
});

router.post("/knowledge/:id/claims", (req, res) => {
  const params = CreateKnowledgeClaimParams.safeParse(req.params);
  const body = CreateKnowledgeClaimBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid claim" });
  const current = activeKnowledge(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const id = transaction(() => {
    const position =
      body.data.position ??
      Number(
        get(
          "SELECT coalesce(max(position), -1) + 1 next FROM knowledge_claims WHERE knowledge_id = ?",
          [params.data.id],
        )?.next,
      );
    const result = run(
      `INSERT INTO knowledge_claims (knowledge_id, position, statement, claim_kind)
      VALUES (?, ?, ?, ?)`,
      [
        params.data.id,
        position,
        body.data.statement,
        body.data.claimKind ?? "Assertion",
      ],
    );
    appendKnowledgeEvent(
      "KnowledgeClaimAdded",
      params.data.id,
      String(current.row.title),
      "claim added",
      { claimId: Number(result.lastInsertRowid) },
    );
    return Number(result.lastInsertRowid);
  });
  projectDomainEventsToActivity();
  res
    .status(201)
    .json(
      CreateKnowledgeClaimResponse.parse(
        hydrateClaim(get("SELECT * FROM knowledge_claims WHERE id = ?", [id])!),
      ),
    );
});

router.patch("/knowledge/:id/claims/:claimId", (req, res) => {
  const params = UpdateKnowledgeClaimParams.safeParse(req.params);
  const body = UpdateKnowledgeClaimBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid claim update" });
  const current = activeKnowledge(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const claim = get(
    "SELECT * FROM knowledge_claims WHERE id = ? AND knowledge_id = ?",
    [params.data.claimId, params.data.id],
  );
  if (!claim) return void res.status(404).json({ error: "Claim not found" });
  if (Number(claim.version) !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Claim version conflict" });
  const mapping: Record<string, string> = {
    statement: "statement",
    position: "position",
    claimKind: "claim_kind",
    supportStatus: "support_status",
    reviewStatus: "review_status",
    reviewer: "reviewer",
  };
  const entries = Object.entries(body.data).filter(
    ([key, value]) => key !== "expectedVersion" && value !== undefined,
  );
  transaction(() => {
    run(
      `UPDATE knowledge_claims SET ${entries.map(([key]) => `${mapping[key]} = ?`).join(", ") || "statement = statement"},
      reviewed_at = CASE WHEN ? = 'HumanVerified' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ELSE reviewed_at END,
      version = version + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
      [
        ...entries.map(([, value]) => value),
        body.data.reviewStatus ?? null,
        params.data.claimId,
      ],
    );
    appendKnowledgeEvent(
      "KnowledgeClaimUpdated",
      params.data.id,
      String(current.row.title),
      "claim updated",
      { claimId: params.data.claimId },
    );
  });
  projectDomainEventsToActivity();
  res.json(
    UpdateKnowledgeClaimResponse.parse(
      hydrateClaim(
        get("SELECT * FROM knowledge_claims WHERE id = ?", [
          params.data.claimId,
        ])!,
      ),
    ),
  );
});

router.get("/knowledge/:id/claims/:claimId/citations", (req, res) => {
  const params = ListKnowledgeClaimCitationsParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid citation query" });
  const claim = get(
    "SELECT id FROM knowledge_claims WHERE id = ? AND knowledge_id = ?",
    [params.data.claimId, params.data.id],
  );
  if (!claim) return void res.status(404).json({ error: "Claim not found" });
  res.json(
    ListKnowledgeClaimCitationsResponse.parse(
      citationRows(params.data.claimId),
    ),
  );
});

router.post("/knowledge/:id/claims/:claimId/citations", (req, res) => {
  const params = CreateKnowledgeClaimCitationParams.safeParse(req.params);
  const body = CreateKnowledgeClaimCitationBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid citation" });
  const current = activeKnowledge(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const claim = get(
    "SELECT id FROM knowledge_claims WHERE id = ? AND knowledge_id = ?",
    [params.data.claimId, params.data.id],
  );
  const evidence = get(
    "SELECT project_id, lifecycle_status FROM evidence WHERE id = ?",
    [body.data.evidenceId],
  );
  const source = get("SELECT evidence_id FROM evidence_sources WHERE id = ?", [
    body.data.sourceId,
  ]);
  const locator =
    body.data.locatorId == null
      ? undefined
      : get("SELECT source_id FROM evidence_source_locators WHERE id = ?", [
          body.data.locatorId,
        ]);
  if (
    !claim ||
    !evidence ||
    evidence.project_id !== current.row.project_id ||
    evidence.lifecycle_status === "Archived" ||
    Number(source?.evidence_id) !== body.data.evidenceId ||
    (locator && Number(locator.source_id) !== body.data.sourceId) ||
    (body.data.locatorId != null && !locator)
  ) {
    return void res.status(409).json({
      error:
        "Citation must reference active same-Workspace Evidence and its source/locator",
    });
  }
  try {
    const id = transaction(() => {
      const result = run(
        `INSERT INTO knowledge_claim_citations
        (claim_id, evidence_id, source_id, locator_id, notes) VALUES (?, ?, ?, ?, ?)`,
        [
          params.data.claimId,
          body.data.evidenceId,
          body.data.sourceId,
          body.data.locatorId ?? null,
          body.data.notes ?? null,
        ],
      );
      appendKnowledgeEvent(
        "KnowledgeCitationAdded",
        params.data.id,
        String(current.row.title),
        "citation added",
        { claimId: params.data.claimId, evidenceId: body.data.evidenceId },
      );
      return Number(result.lastInsertRowid);
    });
    projectDomainEventsToActivity();
    const response = citationRows(params.data.claimId).find(
      (item) => item.id === id,
    );
    res.status(201).json(CreateKnowledgeClaimCitationResponse.parse(response));
  } catch {
    res.status(409).json({ error: "Citation already exists" });
  }
});

router.delete(
  "/knowledge/:id/claims/:claimId/citations/:citationId",
  (req, res) => {
    const params = DeleteKnowledgeClaimCitationParams.safeParse(req.params);
    if (!params.success)
      return void res.status(400).json({ error: "Invalid citation" });
    const current = activeKnowledge(params.data.id);
    if (!current.row)
      return void res.status(current.status).json({ error: current.error });
    const citation = get(
      `SELECT c.id FROM knowledge_claim_citations c JOIN knowledge_claims k ON k.id = c.claim_id
    WHERE c.id = ? AND c.claim_id = ? AND k.knowledge_id = ?`,
      [params.data.citationId, params.data.claimId, params.data.id],
    );
    if (!citation)
      return void res.status(404).json({ error: "Citation not found" });
    transaction(() => {
      run("DELETE FROM knowledge_claim_citations WHERE id = ?", [
        params.data.citationId,
      ]);
      appendKnowledgeEvent(
        "KnowledgeCitationRemoved",
        params.data.id,
        String(current.row.title),
        "citation removed",
        { citationId: params.data.citationId },
      );
    });
    projectDomainEventsToActivity();
    res.sendStatus(204);
  },
);

router.get("/knowledge/:id/versions", (req, res) => {
  const params = ListKnowledgeVersionsParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: "Invalid Knowledge ID" });
  const rows = all(
    "SELECT * FROM knowledge_versions WHERE knowledge_id = ? ORDER BY version DESC",
    [params.data.id],
  ).map((row) => ({
    id: Number(row.id),
    knowledgeId: Number(row.knowledge_id),
    version: Number(row.version),
    title: String(row.title),
    summary: row.summary == null ? null : String(row.summary),
    content: row.content == null ? null : String(row.content),
    metadata: JSON.parse(String(row.metadata)),
    changeSummary:
      row.change_summary == null ? null : String(row.change_summary),
    createdAt: String(row.created_at),
  }));
  res.json(ListKnowledgeVersionsResponse.parse(rows));
});

export default router;
