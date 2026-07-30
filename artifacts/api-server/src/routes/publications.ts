import { Router, type IRouter } from "express";
import {
  ArchivePublicationBody,
  ArchivePublicationParams,
  ArchivePublicationResponse,
  CreatePublicationBody,
  CreatePublicationResponse,
  GetPublicationParams,
  GetPublicationResponse,
  ListChannelsResponse,
  ListPublicationsQueryParams,
  ListPublicationsResponse,
  ListPublicationVersionsParams,
  ListPublicationVersionsResponse,
  ListStoryPublicationsParams,
  ListStoryPublicationsResponse,
  RestorePublicationBody,
  RestorePublicationParams,
  RestorePublicationResponse,
  TransitionPublicationBody,
  TransitionPublicationParams,
  TransitionPublicationResponse,
  UpdatePublicationBody,
  UpdatePublicationParams,
  UpdatePublicationResponse,
} from "@workspace/api-zod";
import { all, get, run, transaction, type Row } from "@workspace/db";
import {
  appendDomainEvent,
  projectDomainEventsToActivity,
} from "../lib/events";

const router: IRouter = Router();

const transitions: Record<string, string[]> = {
  Draft: ["InReview"],
  InReview: ["Draft", "Approved"],
  Approved: ["Draft"],
  Archived: [],
};

function hydratePublication(row: Row) {
  return {
    id: Number(row.id),
    workspaceId: Number(row.workspace_id),
    primaryStoryId: Number(row.primary_story_id),
    primaryStoryTitle: String(row.primary_story_title),
    title: String(row.title),
    summary: row.summary == null ? null : String(row.summary),
    content: row.content == null ? null : String(row.content),
    lifecycleStatus: String(row.lifecycle_status),
    version: Number(row.version),
    createdBy: String(row.created_by),
    archivedAt: row.archived_at == null ? null : String(row.archived_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function publicationRows(where = "1 = 1", params: Array<string | number> = []) {
  return all(
    `SELECT publication.*, story.title AS primary_story_title
     FROM publications publication
     JOIN stories story ON story.id = publication.primary_story_id
     WHERE ${where}
     ORDER BY publication.updated_at DESC, publication.id DESC`,
    params,
  ).map(hydratePublication);
}

function publicationRow(id: number) {
  return publicationRows("publication.id = ?", [id])[0];
}

function checkpoint(id: number, changeSummary: string) {
  run(
    `INSERT INTO publication_versions (
      publication_id, version, title, summary, content, lifecycle_status,
      primary_story_id, change_summary, created_by
    )
    SELECT id, version, title, summary, content, lifecycle_status,
      primary_story_id, ?, created_by
    FROM publications WHERE id = ?`,
    [changeSummary, id],
  );
}

function appendPublicationEvent(
  eventType: string,
  publication: ReturnType<typeof hydratePublication>,
  action: string,
  payload: Record<string, unknown> = {},
) {
  appendDomainEvent({
    eventType,
    eventVersion: 1,
    aggregateType: "publication",
    aggregateId: publication.id,
    payload: {
      entityTitle: publication.title,
      action,
      workspaceId: publication.workspaceId,
      primaryStoryId: publication.primaryStoryId,
      publicationVersion: publication.version,
      ...payload,
    },
  });
}

function currentPublication(id: number) {
  const row = publicationRow(id);
  if (!row) return { status: 404 as const, error: "Publication not found" };
  return { row };
}

function publicationMutationError(
  publication: ReturnType<typeof hydratePublication>,
) {
  const workspace = get("SELECT status FROM projects WHERE id = ?", [
    publication.workspaceId,
  ]);
  if (!workspace) return "Workspace not found";
  if (workspace.status === "Archived")
    return "Archived Workspaces are read-only; restore the Workspace first";
  return null;
}

function validateProvenance(workspaceId: number, storyId: number) {
  const workspace = get("SELECT status FROM projects WHERE id = ?", [
    workspaceId,
  ]);
  if (!workspace) return { status: 404 as const, error: "Workspace not found" };
  if (workspace.status === "Archived")
    return { status: 409 as const, error: "Workspace is archived" };
  const story = get(
    "SELECT project_id, archived_at FROM stories WHERE id = ?",
    [storyId],
  );
  if (!story) return { status: 404 as const, error: "Primary Story not found" };
  if (story.archived_at != null)
    return { status: 409 as const, error: "Primary Story is archived" };
  if (Number(story.project_id) !== workspaceId)
    return {
      status: 409 as const,
      error: "Primary Story must belong to the Publication Workspace",
    };
  return null;
}

router.get("/publications", (req, res) => {
  const query = ListPublicationsQueryParams.safeParse(req.query);
  if (!query.success)
    return void res.status(400).json({ error: query.error.message });
  const conditions: string[] = [];
  const params: Array<string | number> = [];
  if (query.data.workspaceId != null) {
    conditions.push("publication.workspace_id = ?");
    params.push(query.data.workspaceId);
  }
  if (query.data.storyId != null) {
    conditions.push("publication.primary_story_id = ?");
    params.push(query.data.storyId);
  }
  if (query.data.lifecycleStatus) {
    conditions.push("publication.lifecycle_status = ?");
    params.push(query.data.lifecycleStatus);
  } else {
    conditions.push("publication.lifecycle_status != 'Archived'");
  }
  if (query.data.search) {
    conditions.push(
      "(publication.title LIKE ? OR coalesce(publication.summary, '') LIKE ? OR coalesce(publication.content, '') LIKE ?)",
    );
    params.push(...Array(3).fill(`%${query.data.search}%`));
  }
  res.json(
    ListPublicationsResponse.parse(
      publicationRows(conditions.join(" AND "), params),
    ),
  );
});

router.post("/publications", (req, res) => {
  const body = CreatePublicationBody.safeParse(req.body);
  if (!body.success)
    return void res.status(400).json({ error: body.error.message });
  const provenanceError = validateProvenance(
    body.data.workspaceId,
    body.data.primaryStoryId,
  );
  if (provenanceError)
    return void res
      .status(provenanceError.status)
      .json({ error: provenanceError.error });
  try {
    const publication = transaction(() => {
      const created = run(
        `INSERT INTO publications (
          workspace_id, primary_story_id, title, summary, content
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          body.data.workspaceId,
          body.data.primaryStoryId,
          body.data.title.trim(),
          body.data.summary ?? null,
          body.data.content ?? null,
        ],
      );
      const row = publicationRow(Number(created.lastInsertRowid));
      if (!row) throw new Error("Publication creation failed");
      checkpoint(row.id, "Publication created");
      appendPublicationEvent("PublicationCreated", row, "created");
      return row;
    });
    projectDomainEventsToActivity();
    res.status(201).json(CreatePublicationResponse.parse(publication));
  } catch {
    res.status(500).json({ error: "Publication creation failed" });
  }
});

router.get("/publications/:id", (req, res) => {
  const params = GetPublicationParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: params.error.message });
  const publication = publicationRow(params.data.id);
  if (!publication)
    return void res.status(404).json({ error: "Publication not found" });
  res.json(GetPublicationResponse.parse(publication));
});

router.patch("/publications/:id", (req, res) => {
  const params = UpdatePublicationParams.safeParse(req.params);
  const body = UpdatePublicationBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid Publication update" });
  const current = currentPublication(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const workspaceError = publicationMutationError(current.row);
  if (workspaceError)
    return void res.status(409).json({ error: workspaceError });
  if (current.row.lifecycleStatus === "Archived")
    return void res
      .status(409)
      .json({ error: "Archived Publication is read-only" });
  if (current.row.lifecycleStatus === "Approved")
    return void res
      .status(409)
      .json({
        error: "Approved Publication must return to Draft before editing",
      });
  if (current.row.version !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Publication version conflict" });
  try {
    const publication = transaction(() => {
      const changes: string[] = [];
      const values: Array<string | number | null> = [];
      if (body.data.title !== undefined) {
        changes.push("title = ?");
        values.push(body.data.title.trim());
      }
      if (body.data.summary !== undefined) {
        changes.push("summary = ?");
        values.push(body.data.summary);
      }
      if (body.data.content !== undefined) {
        changes.push("content = ?");
        values.push(body.data.content);
      }
      if (!changes.length) throw new Error("No Publication changes supplied");
      const result = run(
        `UPDATE publications SET ${changes.join(", ")},
          version = version + 1,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ? AND version = ?`,
        [...values, params.data.id, body.data.expectedVersion],
      );
      if (Number(result.changes) !== 1)
        throw new Error("Publication version conflict");
      const row = publicationRow(params.data.id);
      if (!row) throw new Error("Publication not found");
      checkpoint(row.id, body.data.changeSummary ?? "Publication updated");
      appendPublicationEvent("PublicationUpdated", row, "updated");
      return row;
    });
    projectDomainEventsToActivity();
    res.json(UpdatePublicationResponse.parse(publication));
  } catch (error) {
    res
      .status(String(error).includes("version conflict") ? 409 : 400)
      .json({
        error: error instanceof Error ? error.message : "Update failed",
      });
  }
});

router.post("/publications/:id/transition", (req, res) => {
  const params = TransitionPublicationParams.safeParse(req.params);
  const body = TransitionPublicationBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res
      .status(400)
      .json({ error: "Invalid Publication transition" });
  const current = currentPublication(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const workspaceError = publicationMutationError(current.row);
  if (workspaceError)
    return void res.status(409).json({ error: workspaceError });
  if (current.row.version !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Publication version conflict" });
  if (
    !(transitions[current.row.lifecycleStatus] ?? []).includes(
      body.data.lifecycleStatus,
    )
  )
    return void res
      .status(409)
      .json({ error: "Invalid Publication transition" });
  const publication = transaction(() => {
    const result = run(
      `UPDATE publications SET lifecycle_status = ?, version = version + 1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND version = ?`,
      [body.data.lifecycleStatus, params.data.id, body.data.expectedVersion],
    );
    if (Number(result.changes) !== 1)
      throw new Error("Publication version conflict");
    const row = publicationRow(params.data.id)!;
    checkpoint(
      row.id,
      body.data.changeSummary ??
        `Publication transitioned to ${body.data.lifecycleStatus}`,
    );
    appendPublicationEvent(
      "PublicationLifecycleTransitioned",
      row,
      "transitioned",
      {
        from: current.row.lifecycleStatus,
        to: body.data.lifecycleStatus,
      },
    );
    return row;
  });
  projectDomainEventsToActivity();
  res.json(TransitionPublicationResponse.parse(publication));
});

router.post("/publications/:id/archive", (req, res) => {
  const params = ArchivePublicationParams.safeParse(req.params);
  const body = ArchivePublicationBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid archive command" });
  const current = currentPublication(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const workspaceError = publicationMutationError(current.row);
  if (workspaceError)
    return void res.status(409).json({ error: workspaceError });
  if (current.row.lifecycleStatus === "Archived")
    return void res
      .status(409)
      .json({ error: "Publication is already archived" });
  if (current.row.version !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Publication version conflict" });
  const publication = transaction(() => {
    const result = run(
      `UPDATE publications SET lifecycle_status = 'Archived',
       archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
       version = version + 1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND version = ?`,
      [params.data.id, body.data.expectedVersion],
    );
    if (Number(result.changes) !== 1)
      throw new Error("Publication version conflict");
    const row = publicationRow(params.data.id)!;
    checkpoint(row.id, body.data.reason ?? "Publication archived");
    appendPublicationEvent("PublicationArchived", row, "archived");
    return row;
  });
  projectDomainEventsToActivity();
  res.json(ArchivePublicationResponse.parse(publication));
});

router.post("/publications/:id/restore", (req, res) => {
  const params = RestorePublicationParams.safeParse(req.params);
  const body = RestorePublicationBody.safeParse(req.body);
  if (!params.success || !body.success)
    return void res.status(400).json({ error: "Invalid restore command" });
  const current = currentPublication(params.data.id);
  if (!current.row)
    return void res.status(current.status).json({ error: current.error });
  const workspaceError = publicationMutationError(current.row);
  if (workspaceError)
    return void res.status(409).json({ error: workspaceError });
  if (current.row.lifecycleStatus !== "Archived")
    return void res.status(409).json({ error: "Publication is not archived" });
  if (current.row.version !== body.data.expectedVersion)
    return void res.status(409).json({ error: "Publication version conflict" });
  const provenanceError = validateProvenance(
    current.row.workspaceId,
    current.row.primaryStoryId,
  );
  if (provenanceError)
    return void res
      .status(provenanceError.status)
      .json({ error: provenanceError.error });
  const publication = transaction(() => {
    const result = run(
      `UPDATE publications SET lifecycle_status = 'Draft', archived_at = NULL,
       version = version + 1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ? AND version = ?`,
      [params.data.id, body.data.expectedVersion],
    );
    if (Number(result.changes) !== 1)
      throw new Error("Publication version conflict");
    const row = publicationRow(params.data.id)!;
    checkpoint(row.id, body.data.reason ?? "Publication restored");
    appendPublicationEvent("PublicationRestored", row, "restored");
    return row;
  });
  projectDomainEventsToActivity();
  res.json(RestorePublicationResponse.parse(publication));
});

router.get("/publications/:id/versions", (req, res) => {
  const params = ListPublicationVersionsParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: params.error.message });
  if (!publicationRow(params.data.id))
    return void res.status(404).json({ error: "Publication not found" });
  const rows = all(
    `SELECT id, publication_id AS publicationId, version, title, summary,
      content, lifecycle_status AS lifecycleStatus,
      primary_story_id AS primaryStoryId, change_summary AS changeSummary,
      created_by AS createdBy, created_at AS createdAt
     FROM publication_versions
     WHERE publication_id = ? ORDER BY version DESC`,
    [params.data.id],
  );
  res.json(ListPublicationVersionsResponse.parse(rows));
});

router.get("/stories/:id/publications", (req, res) => {
  const params = ListStoryPublicationsParams.safeParse(req.params);
  if (!params.success)
    return void res.status(400).json({ error: params.error.message });
  if (!get("SELECT id FROM stories WHERE id = ?", [params.data.id]))
    return void res.status(404).json({ error: "Story not found" });
  res.json(
    ListStoryPublicationsResponse.parse(
      publicationRows("publication.primary_story_id = ?", [params.data.id]),
    ),
  );
});

router.get("/channels", (_req, res) => {
  const rows = all(
    `SELECT id, key, name, capability_version AS capabilityVersion,
      status, created_at AS createdAt, updated_at AS updatedAt
     FROM channels ORDER BY name, id`,
  );
  res.json(ListChannelsResponse.parse(rows));
});

export default router;
