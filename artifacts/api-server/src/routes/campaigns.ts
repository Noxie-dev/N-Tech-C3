import { Router, type IRouter } from "express";
import {
  ListCampaignsQueryParams,
  ListCampaignsResponse,
  CreateCampaignBody,
  CreateCampaignResponse,
  GetCampaignParams,
  GetCampaignResponse,
  UpdateCampaignParams,
  UpdateCampaignBody,
  UpdateCampaignResponse,
  DeleteCampaignParams,
  TransitionCampaignParams,
  TransitionCampaignBody,
  TransitionCampaignResponse,
  ChangeCampaignPhaseParams,
  ChangeCampaignPhaseBody,
  ChangeCampaignPhaseResponse,
  CompleteCampaignParams,
  CompleteCampaignBody,
  CompleteCampaignResponse,
  ReopenCampaignParams,
  ReopenCampaignBody,
  ReopenCampaignResponse,
  ArchiveCampaignParams,
  ArchiveCampaignBody,
  ArchiveCampaignResponse,
  RestoreCampaignParams,
  RestoreCampaignBody,
  RestoreCampaignResponse,
  ListCampaignVersionsParams,
  ListCampaignVersionsResponse,
  ListCampaignStoriesParams,
  ListCampaignStoriesResponse,
  AddCampaignStoryParams,
  AddCampaignStoryBody,
  AddCampaignStoryResponse,
  ReorderCampaignStoriesParams,
  ReorderCampaignStoriesBody,
  ReorderCampaignStoriesResponse,
  UpdateCampaignStoryParams,
  UpdateCampaignStoryBody,
  UpdateCampaignStoryResponse,
  RemoveCampaignStoryParams,
  RemoveCampaignStoryBody,
  ListStoryCampaignBacklinksParams,
  ListStoryCampaignBacklinksResponse,
  ListCampaignMilestonesParams,
  ListCampaignMilestonesResponse,
  CreateCampaignMilestoneParams,
  CreateCampaignMilestoneBody,
  CreateCampaignMilestoneResponse,
  ReorderCampaignMilestonesParams,
  ReorderCampaignMilestonesBody,
  ReorderCampaignMilestonesResponse,
  UpdateCampaignMilestoneParams,
  UpdateCampaignMilestoneBody,
  UpdateCampaignMilestoneResponse,
  RemoveCampaignMilestoneParams,
  RemoveCampaignMilestoneBody,
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

const router: IRouter = Router();
const config = entityConfigs.campaigns;
router.use(guardWorkspaceMutations(config.table));

const allowedTransitions: Record<string, string[]> = {
  Planning: ["Active"],
  Active: ["Paused"],
  Paused: ["Active"],
  Completed: [],
  Archived: [],
};

function appendCampaignEvent(
  eventType: string,
  id: number,
  title: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  appendDomainEvent({
    eventType,
    eventVersion: 1,
    aggregateType: "campaign",
    aggregateId: id,
    payload: { entityTitle: title, action, ...payload },
  });
}

function checkpoint(id: number, changeSummary: string) {
  run(
    `INSERT INTO campaign_versions (
      campaign_id, version, title, mission_statement, success_definition,
      metadata, change_summary
    ) SELECT id, version, title, mission_statement, success_definition,
      json_object(
        'objective', objective, 'campaignType', campaign_type,
        'lifecycleStatus', lifecycle_status, 'phase', phase,
        'audience', audience, 'owner', owner, 'startAt', start_at, 'endAt', end_at,
        'targetStoryCount', target_story_count,
        'targetPublicationCount', target_publication_count,
        'tags', json(tags)
      ), ?
    FROM campaigns WHERE id = ?`,
    [changeSummary, id],
  );
}

function campaignRow(id: number) {
  const row = getEntity(config, id);
  if (!row) return undefined;
  const storyCount = Number(
    get("SELECT count(*) count FROM story_campaigns WHERE campaign_id = ?", [
      id,
    ])?.count ?? 0,
  );
  return { ...row, storyCount };
}

function activeCampaign(id: number) {
  const row = get("SELECT * FROM campaigns WHERE id = ?", [id]);
  if (!row) return { error: "Campaign not found", status: 404 as const };
  if (row.project_id == null) {
    return {
      error: "Legacy Campaign requires Workspace assignment before mutation",
      status: 409 as const,
    };
  }
  if (row.lifecycle_status === "Archived") {
    return { error: "Archived Campaigns are read-only", status: 409 as const };
  }
  return { row };
}

function versionConflict(row: Row, expectedVersion: number) {
  return Number(row.version) !== expectedVersion;
}

function normalizePatch(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

function validateAssetWorkspace(
  workspaceId: number,
  assetId: number | null | undefined,
) {
  if (assetId == null) return true;
  return Boolean(
    get("SELECT id FROM assets WHERE id = ? AND project_id = ?", [
      assetId,
      workspaceId,
    ]),
  );
}

function campaignStories(campaignId: number) {
  return all(
    `SELECT membership.*, story.title, story.status, story.story_type
    FROM story_campaigns membership
    JOIN stories story ON story.id = membership.story_id
    WHERE membership.campaign_id = ?
    ORDER BY membership.position, membership.story_id`,
    [campaignId],
  ).map((row) => ({
    campaignId: Number(row.campaign_id),
    storyId: Number(row.story_id),
    title: String(row.title),
    status: String(row.status),
    storyType: row.story_type == null ? null : String(row.story_type),
    role: String(row.role),
    position: Number(row.position),
    contributionNote:
      row.contribution_note == null ? null : String(row.contribution_note),
    createdBy: String(row.created_by),
    isPrimary: Number(row.is_primary) === 1,
    version: Number(row.version),
    linkedAt: String(row.linked_at),
  }));
}

function campaignStory(campaignId: number, storyId: number) {
  return campaignStories(campaignId).find((item) => item.storyId === storyId);
}

function campaignMilestones(campaignId: number) {
  return all(
    `SELECT * FROM campaign_milestones
    WHERE campaign_id = ? ORDER BY position, id`,
    [campaignId],
  ).map((row) => ({
    id: Number(row.id),
    campaignId: Number(row.campaign_id),
    title: String(row.title),
    description: row.description == null ? null : String(row.description),
    position: Number(row.position),
    targetDate: row.target_date == null ? null : String(row.target_date),
    status: String(row.status),
    completionNote:
      row.completion_note == null ? null : String(row.completion_note),
    completedAt: row.completed_at == null ? null : String(row.completed_at),
    version: Number(row.version),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

function campaignMilestone(campaignId: number, milestoneId: number) {
  return campaignMilestones(campaignId).find((item) => item.id === milestoneId);
}

function advanceCampaign(
  id: number,
  title: string,
  summary: string,
  eventType: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  run(
    `UPDATE campaigns SET version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    [id],
  );
  checkpoint(id, summary);
  appendCampaignEvent(eventType, id, title, action, payload);
}

router.get("/campaigns", (req, res) => {
  const query = ListCampaignsQueryParams.safeParse(req.query);
  if (!query.success) {
    return void res.status(400).json({ error: query.error.message });
  }
  const conditions = ["project_id IS NOT NULL"];
  const params: Array<string | number> = [];
  if (query.data.workspaceId != null) {
    conditions.push("project_id = ?");
    params.push(query.data.workspaceId);
  }
  if (query.data.lifecycleStatus) {
    conditions.push("lifecycle_status = ?");
    params.push(query.data.lifecycleStatus);
  } else {
    conditions.push("lifecycle_status != 'Archived'");
  }
  if (query.data.campaignType) {
    conditions.push("campaign_type = ?");
    params.push(query.data.campaignType);
  }
  if (query.data.owner) {
    conditions.push("owner = ?");
    params.push(query.data.owner);
  }
  if (query.data.search) {
    conditions.push(`(
      title LIKE ? OR coalesce(mission_statement, '') LIKE ?
      OR coalesce(success_definition, '') LIKE ? OR coalesce(objective, '') LIKE ?
    )`);
    params.push(...Array(4).fill(`%${query.data.search}%`));
  }
  const rows = listEntities(config, {
    where: conditions.join(" AND "),
    params,
    orderBy: "updated_at DESC",
  }).map((row) => campaignRow(Number(row.id)));
  res.json(ListCampaignsResponse.parse(rows));
});

router.post("/campaigns", (req, res) => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({ error: parsed.error.message });
  }
  const workspaceError = workspaceMutationError(parsed.data.workspaceId);
  if (workspaceError) {
    return void res
      .status(workspaceError === "Workspace not found" ? 404 : 409)
      .json({ error: workspaceError });
  }
  const id = transaction(() => {
    const created = createEntity(config, {
      ...parsed.data,
      lifecycleStatus: "Planning",
      phase: "Planning",
      version: 1,
    });
    if (!created) throw new Error("Campaign creation failed");
    checkpoint(Number(created.id), "Campaign created");
    appendCampaignEvent(
      "CampaignCreated",
      Number(created.id),
      String(created.title),
      "created",
      { workspaceId: parsed.data.workspaceId },
    );
    return Number(created.id);
  });
  projectDomainEventsToActivity();
  res.status(201).json(CreateCampaignResponse.parse(campaignRow(id)));
});

router.get("/campaigns/:id", (req, res) => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    return void res.status(400).json({ error: params.error.message });
  }
  const source = get("SELECT project_id FROM campaigns WHERE id = ?", [
    params.data.id,
  ]);
  if (source?.project_id == null) {
    return void res.status(409).json({
      error:
        "Legacy Campaign requires Workspace assignment before canonical use",
    });
  }
  const row = campaignRow(params.data.id);
  if (!row) return void res.status(404).json({ error: "Campaign not found" });
  res.json(GetCampaignResponse.parse(row));
});

router.patch("/campaigns/:id", (req, res) => {
  const params = UpdateCampaignParams.safeParse(req.params);
  const body = UpdateCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid Campaign update" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  if (
    !validateAssetWorkspace(
      Number(current.row.project_id),
      body.data.bannerAssetId,
    ) ||
    !validateAssetWorkspace(
      Number(current.row.project_id),
      body.data.coverAssetId,
    )
  ) {
    return void res.status(409).json({
      error: "Campaign visual assets must belong to the same Workspace",
    });
  }
  const proposedStartAt =
    body.data.startAt === undefined ? current.row.start_at : body.data.startAt;
  const proposedEndAt =
    body.data.endAt === undefined ? current.row.end_at : body.data.endAt;
  if (
    proposedStartAt != null &&
    proposedEndAt != null &&
    String(proposedStartAt) > String(proposedEndAt)
  ) {
    return void res
      .status(409)
      .json({ error: "Campaign start date must not be after its end date" });
  }
  const {
    expectedVersion: _expectedVersion,
    changeSummary,
    ...changes
  } = body.data;
  transaction(() => {
    const entries = Object.entries(normalizePatch(changes)).filter(
      ([, value]) => value !== undefined,
    );
    const assignments = entries.map(
      ([field]) => `${(config.fields as Record<string, string>)[field]} = ?`,
    );
    const values = entries.map(([field, value]) =>
      config.jsonFields?.includes(field) ? JSON.stringify(value ?? []) : value,
    );
    run(
      `UPDATE campaigns SET ${assignments.join(", ") || "title = title"},
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
      [...values, params.data.id] as Array<string | number | null>,
    );
    checkpoint(params.data.id, changeSummary ?? "Campaign mission updated");
    appendCampaignEvent(
      "CampaignMissionUpdated",
      params.data.id,
      String(current.row.title),
      "updated",
    );
  });
  projectDomainEventsToActivity();
  res.json(UpdateCampaignResponse.parse(campaignRow(params.data.id)));
});

router.post("/campaigns/:id/transition", (req, res) => {
  const params = TransitionCampaignParams.safeParse(req.params);
  const body = TransitionCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid Campaign transition" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const from = String(current.row.lifecycle_status);
  const to = body.data.lifecycleStatus;
  if (!allowedTransitions[from]?.includes(to)) {
    return void res
      .status(409)
      .json({ error: `Campaign cannot transition from ${from} to ${to}` });
  }
  if (to === "Paused" && !body.data.reason?.trim()) {
    return void res
      .status(409)
      .json({ error: "Pausing a Campaign requires a reason" });
  }
  if (to === "Active") {
    const linkedStories = Number(
      get("SELECT count(*) count FROM story_campaigns WHERE campaign_id = ?", [
        params.data.id,
      ])?.count ?? 0,
    );
    if (
      !current.row.mission_statement ||
      !current.row.success_definition ||
      !current.row.owner ||
      (linkedStories === 0 && Number(current.row.target_story_count) === 0)
    ) {
      return void res.status(409).json({
        error:
          "Active Campaigns require mission, success definition, owner, and at least one linked or targeted Story",
      });
    }
  }
  transaction(() => {
    run(
      `UPDATE campaigns SET lifecycle_status = ?,
        pause_reason = CASE WHEN ? = 'Paused' THEN ? ELSE NULL END,
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
      [to, to, body.data.reason ?? null, params.data.id],
    );
    checkpoint(params.data.id, `Campaign transitioned ${from} → ${to}`);
    appendCampaignEvent(
      "CampaignLifecycleChanged",
      params.data.id,
      String(current.row.title),
      `transitioned to ${to}`,
      { from, to, reason: body.data.reason ?? null },
    );
  });
  projectDomainEventsToActivity();
  res.json(TransitionCampaignResponse.parse(campaignRow(params.data.id)));
});

router.post("/campaigns/:id/phase", (req, res) => {
  const params = ChangeCampaignPhaseParams.safeParse(req.params);
  const body = ChangeCampaignPhaseBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res
      .status(400)
      .json({ error: "Invalid Campaign phase command" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  transaction(() => {
    run(
      `UPDATE campaigns SET phase = ?, version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [body.data.phase, params.data.id],
    );
    checkpoint(params.data.id, `Campaign phase changed to ${body.data.phase}`);
    appendCampaignEvent(
      "CampaignPhaseChanged",
      params.data.id,
      String(current.row.title),
      `phase changed to ${body.data.phase}`,
      { from: current.row.phase, to: body.data.phase },
    );
  });
  projectDomainEventsToActivity();
  res.json(ChangeCampaignPhaseResponse.parse(campaignRow(params.data.id)));
});

router.post("/campaigns/:id/complete", (req, res) => {
  const params = CompleteCampaignParams.safeParse(req.params);
  const body = CompleteCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid Campaign completion" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  if (!["Active", "Paused"].includes(String(current.row.lifecycle_status))) {
    return void res
      .status(409)
      .json({ error: "Only Active or Paused Campaigns can complete" });
  }
  if (!current.row.success_definition) {
    return void res
      .status(409)
      .json({ error: "Campaign completion requires a success definition" });
  }
  transaction(() => {
    run(
      `UPDATE campaigns SET lifecycle_status = 'Completed',
        completion_note = ?, success_assessment = ?,
        completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [body.data.completionNote, body.data.successAssessment, params.data.id],
    );
    checkpoint(params.data.id, "Campaign completed");
    appendCampaignEvent(
      "CampaignCompleted",
      params.data.id,
      String(current.row.title),
      "completed",
      { successAssessment: body.data.successAssessment },
    );
  });
  projectDomainEventsToActivity();
  res.json(CompleteCampaignResponse.parse(campaignRow(params.data.id)));
});

router.post("/campaigns/:id/reopen", (req, res) => {
  const params = ReopenCampaignParams.safeParse(req.params);
  const body = ReopenCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res
      .status(400)
      .json({ error: "Invalid Campaign reopen command" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  if (current.row.lifecycle_status !== "Completed") {
    return void res
      .status(409)
      .json({ error: "Only Completed Campaigns can reopen" });
  }
  transaction(() => {
    run(
      `UPDATE campaigns SET lifecycle_status = 'Active',
        completion_note = NULL, success_assessment = NULL, completed_at = NULL,
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [params.data.id],
    );
    checkpoint(params.data.id, `Campaign reopened: ${body.data.reason}`);
    appendCampaignEvent(
      "CampaignReopened",
      params.data.id,
      String(current.row.title),
      "reopened",
      { reason: body.data.reason },
    );
  });
  projectDomainEventsToActivity();
  res.json(ReopenCampaignResponse.parse(campaignRow(params.data.id)));
});

router.post("/campaigns/:id/archive", (req, res) => {
  const params = ArchiveCampaignParams.safeParse(req.params);
  const body = ArchiveCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res
      .status(400)
      .json({ error: "Invalid Campaign archive command" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  transaction(() => {
    run(
      `UPDATE campaigns SET archived_from_status = lifecycle_status,
        lifecycle_status = 'Archived',
        archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [params.data.id],
    );
    checkpoint(params.data.id, "Campaign archived");
    appendCampaignEvent(
      "CampaignArchived",
      params.data.id,
      String(current.row.title),
      "archived",
      { previousLifecycle: current.row.lifecycle_status },
    );
  });
  projectDomainEventsToActivity();
  res.json(ArchiveCampaignResponse.parse(campaignRow(params.data.id)));
});

router.post("/campaigns/:id/restore", (req, res) => {
  const params = RestoreCampaignParams.safeParse(req.params);
  const body = RestoreCampaignBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res
      .status(400)
      .json({ error: "Invalid Campaign restore command" });
  }
  const current = get("SELECT * FROM campaigns WHERE id = ?", [params.data.id]);
  if (!current)
    return void res.status(404).json({ error: "Campaign not found" });
  if (current.lifecycle_status !== "Archived") {
    return void res.status(409).json({ error: "Campaign is not archived" });
  }
  if (versionConflict(current, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const restoreStatus = ["Planning", "Active", "Paused", "Completed"].includes(
    String(current.archived_from_status),
  )
    ? String(current.archived_from_status)
    : "Planning";
  transaction(() => {
    run(
      `UPDATE campaigns SET lifecycle_status = ?, archived_at = NULL,
        archived_from_status = NULL, version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      [restoreStatus, params.data.id],
    );
    checkpoint(params.data.id, "Campaign restored");
    appendCampaignEvent(
      "CampaignRestored",
      params.data.id,
      String(current.title),
      "restored",
      { restoredLifecycle: restoreStatus },
    );
  });
  projectDomainEventsToActivity();
  res.json(RestoreCampaignResponse.parse(campaignRow(params.data.id)));
});

router.get("/campaigns/:id/stories", (req, res) => {
  const params = ListCampaignStoriesParams.safeParse(req.params);
  if (!params.success) {
    return void res.status(400).json({ error: "Invalid Campaign ID" });
  }
  if (!get("SELECT id FROM campaigns WHERE id = ?", [params.data.id])) {
    return void res.status(404).json({ error: "Campaign not found" });
  }
  res.json(ListCampaignStoriesResponse.parse(campaignStories(params.data.id)));
});

router.post("/campaigns/:id/stories", (req, res) => {
  const params = AddCampaignStoryParams.safeParse(req.params);
  const body = AddCampaignStoryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid Story membership" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const story = get(
    "SELECT id, title, project_id, status FROM stories WHERE id = ?",
    [body.data.storyId],
  );
  if (!story) return void res.status(404).json({ error: "Story not found" });
  if (story.project_id !== current.row.project_id) {
    return void res
      .status(409)
      .json({ error: "Campaign and Story must belong to the same Workspace" });
  }
  if (story.status === "Archived") {
    return void res
      .status(409)
      .json({ error: "Archived Stories cannot be newly linked" });
  }
  if (
    get(
      "SELECT 1 FROM story_campaigns WHERE campaign_id = ? AND story_id = ?",
      [params.data.id, body.data.storyId],
    )
  ) {
    return void res.status(409).json({ error: "Story is already in Campaign" });
  }
  if (
    body.data.isPrimary &&
    get(
      "SELECT campaign_id FROM story_campaigns WHERE story_id = ? AND is_primary = 1",
      [body.data.storyId],
    )
  ) {
    return void res
      .status(409)
      .json({ error: "Story already has a primary Campaign" });
  }
  transaction(() => {
    const position = Number(
      get(
        "SELECT coalesce(max(position), -1) + 1 next FROM story_campaigns WHERE campaign_id = ?",
        [params.data.id],
      )?.next ?? 0,
    );
    run(
      `INSERT INTO story_campaigns (
        story_id, campaign_id, is_primary, role, position, contribution_note
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.data.storyId,
        params.data.id,
        body.data.isPrimary ? 1 : 0,
        body.data.role,
        position,
        body.data.contributionNote ?? null,
      ],
    );
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      `Story ${body.data.storyId} added to Campaign`,
      "StoryAddedToCampaign",
      `added Story ${body.data.storyId}`,
      {
        storyId: body.data.storyId,
        role: body.data.role,
        isPrimary: body.data.isPrimary ?? false,
      },
    );
  });
  projectDomainEventsToActivity();
  res
    .status(201)
    .json(
      AddCampaignStoryResponse.parse(
        campaignStory(params.data.id, body.data.storyId),
      ),
    );
});

router.patch("/campaigns/:id/stories/:storyId", (req, res) => {
  const params = UpdateCampaignStoryParams.safeParse(req.params);
  const body = UpdateCampaignStoryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid membership update" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedCampaignVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const membership = get(
    "SELECT * FROM story_campaigns WHERE campaign_id = ? AND story_id = ?",
    [params.data.id, params.data.storyId],
  );
  if (!membership) {
    return void res.status(404).json({ error: "Story membership not found" });
  }
  if (Number(membership.version) !== body.data.expectedMembershipVersion) {
    return void res.status(409).json({ error: "Membership version conflict" });
  }
  if (
    body.data.isPrimary === true &&
    get(
      `SELECT campaign_id FROM story_campaigns
      WHERE story_id = ? AND is_primary = 1 AND campaign_id != ?`,
      [params.data.storyId, params.data.id],
    )
  ) {
    return void res
      .status(409)
      .json({ error: "Story already has a primary Campaign" });
  }
  transaction(() => {
    run(
      `UPDATE story_campaigns SET
        role = coalesce(?, role),
        contribution_note = CASE WHEN ? THEN ? ELSE contribution_note END,
        is_primary = coalesce(?, is_primary),
        version = version + 1
      WHERE campaign_id = ? AND story_id = ?`,
      [
        body.data.role ?? null,
        body.data.contributionNote !== undefined ? 1 : 0,
        body.data.contributionNote ?? null,
        body.data.isPrimary === undefined ? null : body.data.isPrimary ? 1 : 0,
        params.data.id,
        params.data.storyId,
      ],
    );
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      `Story ${params.data.storyId} membership updated`,
      "CampaignStoryMembershipUpdated",
      `updated Story ${params.data.storyId} membership`,
      { storyId: params.data.storyId },
    );
  });
  projectDomainEventsToActivity();
  res.json(
    UpdateCampaignStoryResponse.parse(
      campaignStory(params.data.id, params.data.storyId),
    ),
  );
});

router.delete("/campaigns/:id/stories/:storyId", (req, res) => {
  const params = RemoveCampaignStoryParams.safeParse(req.params);
  const body = RemoveCampaignStoryBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid membership removal" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  if (
    !get(
      "SELECT 1 FROM story_campaigns WHERE campaign_id = ? AND story_id = ?",
      [params.data.id, params.data.storyId],
    )
  ) {
    return void res.status(404).json({ error: "Story membership not found" });
  }
  transaction(() => {
    run("DELETE FROM story_campaigns WHERE campaign_id = ? AND story_id = ?", [
      params.data.id,
      params.data.storyId,
    ]);
    const remaining = all(
      "SELECT story_id FROM story_campaigns WHERE campaign_id = ? ORDER BY position",
      [params.data.id],
    );
    remaining.forEach((row, position) => {
      run(
        "UPDATE story_campaigns SET position = ? WHERE campaign_id = ? AND story_id = ?",
        [position + 100000, params.data.id, Number(row.story_id)],
      );
    });
    remaining.forEach((row, position) => {
      run(
        `UPDATE story_campaigns
         SET position = ?, version = version + 1
         WHERE campaign_id = ? AND story_id = ?`,
        [position, params.data.id, Number(row.story_id)],
      );
    });
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      `Story ${params.data.storyId} removed from Campaign`,
      "StoryRemovedFromCampaign",
      `removed Story ${params.data.storyId}`,
      { storyId: params.data.storyId },
    );
  });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

router.put("/campaigns/:id/stories/order", (req, res) => {
  const params = ReorderCampaignStoriesParams.safeParse(req.params);
  const body = ReorderCampaignStoriesBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid Story order" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const existingIds = campaignStories(params.data.id).map(
    (item) => item.storyId,
  );
  if (
    existingIds.length !== body.data.storyIds.length ||
    existingIds.some((id) => !body.data.storyIds.includes(id))
  ) {
    return void res
      .status(409)
      .json({
        error: "Story order must contain the complete portfolio exactly once",
      });
  }
  transaction(() => {
    body.data.storyIds.forEach((storyId, position) => {
      run(
        "UPDATE story_campaigns SET position = ? WHERE campaign_id = ? AND story_id = ?",
        [position + 100000, params.data.id, storyId],
      );
    });
    body.data.storyIds.forEach((storyId, position) => {
      run(
        "UPDATE story_campaigns SET position = ?, version = version + 1 WHERE campaign_id = ? AND story_id = ?",
        [position, params.data.id, storyId],
      );
    });
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      "Campaign Story portfolio reordered",
      "CampaignStoryMembershipUpdated",
      "reordered Story portfolio",
      { storyIds: body.data.storyIds },
    );
  });
  projectDomainEventsToActivity();
  res.json(
    ReorderCampaignStoriesResponse.parse(campaignStories(params.data.id)),
  );
});

router.get("/stories/:id/campaigns", (req, res) => {
  const params = ListStoryCampaignBacklinksParams.safeParse(req.params);
  if (!params.success) {
    return void res.status(400).json({ error: "Invalid Story ID" });
  }
  if (!get("SELECT id FROM stories WHERE id = ?", [params.data.id])) {
    return void res.status(404).json({ error: "Story not found" });
  }
  const rows = all(
    `SELECT campaign.id campaign_id, campaign.title,
      campaign.lifecycle_status, membership.role, membership.position,
      membership.contribution_note, membership.is_primary
    FROM story_campaigns membership
    JOIN campaigns campaign ON campaign.id = membership.campaign_id
    WHERE membership.story_id = ?
    ORDER BY membership.is_primary DESC, campaign.updated_at DESC`,
    [params.data.id],
  ).map((row) => ({
    campaignId: Number(row.campaign_id),
    title: String(row.title),
    lifecycleStatus: String(row.lifecycle_status),
    role: String(row.role),
    position: Number(row.position),
    contributionNote:
      row.contribution_note == null ? null : String(row.contribution_note),
    isPrimary: Number(row.is_primary) === 1,
  }));
  res.json(ListStoryCampaignBacklinksResponse.parse(rows));
});

router.get("/campaigns/:id/milestones", (req, res) => {
  const params = ListCampaignMilestonesParams.safeParse(req.params);
  if (!params.success) {
    return void res.status(400).json({ error: "Invalid Campaign ID" });
  }
  if (!get("SELECT id FROM campaigns WHERE id = ?", [params.data.id])) {
    return void res.status(404).json({ error: "Campaign not found" });
  }
  res.json(
    ListCampaignMilestonesResponse.parse(campaignMilestones(params.data.id)),
  );
});

router.post("/campaigns/:id/milestones", (req, res) => {
  const params = CreateCampaignMilestoneParams.safeParse(req.params);
  const body = CreateCampaignMilestoneBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid Campaign milestone" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const milestoneId = transaction(() => {
    const position = Number(
      get(
        "SELECT coalesce(max(position), -1) + 1 next FROM campaign_milestones WHERE campaign_id = ?",
        [params.data.id],
      )?.next ?? 0,
    );
    const result = run(
      `INSERT INTO campaign_milestones (
        campaign_id, title, description, position, target_date
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        params.data.id,
        body.data.title,
        body.data.description ?? null,
        position,
        body.data.targetDate instanceof Date
          ? body.data.targetDate.toISOString().slice(0, 10)
          : (body.data.targetDate ?? null),
      ],
    );
    const id = Number(result.lastInsertRowid);
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      `Campaign milestone ${id} created`,
      "CampaignMilestoneCreated",
      `created milestone ${body.data.title}`,
      { milestoneId: id },
    );
    return id;
  });
  projectDomainEventsToActivity();
  res
    .status(201)
    .json(
      CreateCampaignMilestoneResponse.parse(
        campaignMilestone(params.data.id, milestoneId),
      ),
    );
});

router.patch("/campaigns/:id/milestones/:milestoneId", (req, res) => {
  const params = UpdateCampaignMilestoneParams.safeParse(req.params);
  const body = UpdateCampaignMilestoneBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid milestone update" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedCampaignVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const milestone = get(
    "SELECT * FROM campaign_milestones WHERE id = ? AND campaign_id = ?",
    [params.data.milestoneId, params.data.id],
  );
  if (!milestone) {
    return void res.status(404).json({ error: "Campaign milestone not found" });
  }
  if (Number(milestone.version) !== body.data.expectedMilestoneVersion) {
    return void res.status(409).json({ error: "Milestone version conflict" });
  }
  const currentStatus = String(milestone.status);
  const nextStatus = body.data.status ?? currentStatus;
  const allowed: Record<string, string[]> = {
    Planned: ["Planned", "InProgress", "Completed", "Skipped"],
    InProgress: ["InProgress", "Completed", "Skipped"],
    Completed: ["Completed"],
    Skipped: ["Skipped"],
  };
  if (!allowed[currentStatus]?.includes(nextStatus)) {
    return void res.status(409).json({
      error: `Milestone cannot transition from ${currentStatus} to ${nextStatus}`,
    });
  }
  if (
    ["Completed", "Skipped"].includes(nextStatus) &&
    nextStatus !== currentStatus &&
    !body.data.completionNote?.trim()
  ) {
    return void res
      .status(409)
      .json({ error: "Completing or skipping a milestone requires a note" });
  }
  transaction(() => {
    run(
      `UPDATE campaign_milestones SET
        title = coalesce(?, title),
        description = CASE WHEN ? THEN ? ELSE description END,
        target_date = CASE WHEN ? THEN ? ELSE target_date END,
        status = ?,
        completion_note = CASE WHEN ? THEN ? ELSE completion_note END,
        completed_at = CASE
          WHEN ? IN ('Completed', 'Skipped') AND status NOT IN ('Completed', 'Skipped')
          THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          ELSE completed_at
        END,
        version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND campaign_id = ?`,
      [
        body.data.title ?? null,
        body.data.description !== undefined ? 1 : 0,
        body.data.description ?? null,
        body.data.targetDate !== undefined ? 1 : 0,
        body.data.targetDate instanceof Date
          ? body.data.targetDate.toISOString().slice(0, 10)
          : (body.data.targetDate ?? null),
        nextStatus,
        body.data.completionNote !== undefined ? 1 : 0,
        body.data.completionNote ?? null,
        nextStatus,
        params.data.milestoneId,
        params.data.id,
      ],
    );
    const eventType =
      nextStatus === "Completed"
        ? "CampaignMilestoneCompleted"
        : nextStatus === "Skipped"
          ? "CampaignMilestoneSkipped"
          : "CampaignMilestoneUpdated";
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      `Campaign milestone ${params.data.milestoneId} updated`,
      eventType,
      `updated milestone ${params.data.milestoneId}`,
      { milestoneId: params.data.milestoneId, status: nextStatus },
    );
  });
  projectDomainEventsToActivity();
  res.json(
    UpdateCampaignMilestoneResponse.parse(
      campaignMilestone(params.data.id, params.data.milestoneId),
    ),
  );
});

router.delete("/campaigns/:id/milestones/:milestoneId", (req, res) => {
  const params = RemoveCampaignMilestoneParams.safeParse(req.params);
  const body = RemoveCampaignMilestoneBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid milestone removal" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  if (
    !get("SELECT 1 FROM campaign_milestones WHERE id = ? AND campaign_id = ?", [
      params.data.milestoneId,
      params.data.id,
    ])
  ) {
    return void res.status(404).json({ error: "Campaign milestone not found" });
  }
  transaction(() => {
    run("DELETE FROM campaign_milestones WHERE id = ? AND campaign_id = ?", [
      params.data.milestoneId,
      params.data.id,
    ]);
    const remaining = all(
      "SELECT id FROM campaign_milestones WHERE campaign_id = ? ORDER BY position",
      [params.data.id],
    );
    remaining.forEach((row, position) => {
      run(
        "UPDATE campaign_milestones SET position = ? WHERE campaign_id = ? AND id = ?",
        [position + 100000, params.data.id, Number(row.id)],
      );
    });
    remaining.forEach((row, position) => {
      run(
        `UPDATE campaign_milestones
         SET position = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE campaign_id = ? AND id = ?`,
        [position, params.data.id, Number(row.id)],
      );
    });
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      `Campaign milestone ${params.data.milestoneId} removed`,
      "CampaignMilestoneUpdated",
      `removed milestone ${params.data.milestoneId}`,
      { milestoneId: params.data.milestoneId },
    );
  });
  projectDomainEventsToActivity();
  res.sendStatus(204);
});

router.put("/campaigns/:id/milestones/order", (req, res) => {
  const params = ReorderCampaignMilestonesParams.safeParse(req.params);
  const body = ReorderCampaignMilestonesBody.safeParse(req.body);
  if (!params.success || !body.success) {
    return void res.status(400).json({ error: "Invalid milestone order" });
  }
  const current = activeCampaign(params.data.id);
  if (!current.row) {
    return void res.status(current.status).json({ error: current.error });
  }
  if (versionConflict(current.row, body.data.expectedVersion)) {
    return void res.status(409).json({ error: "Campaign version conflict" });
  }
  const existingIds = campaignMilestones(params.data.id).map((item) => item.id);
  if (
    existingIds.length !== body.data.milestoneIds.length ||
    existingIds.some((id) => !body.data.milestoneIds.includes(id))
  ) {
    return void res.status(409).json({
      error: "Milestone order must contain the complete plan exactly once",
    });
  }
  transaction(() => {
    body.data.milestoneIds.forEach((milestoneId, position) => {
      run(
        "UPDATE campaign_milestones SET position = ? WHERE campaign_id = ? AND id = ?",
        [position + 100000, params.data.id, milestoneId],
      );
    });
    body.data.milestoneIds.forEach((milestoneId, position) => {
      run(
        `UPDATE campaign_milestones SET position = ?, version = version + 1,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE campaign_id = ? AND id = ?`,
        [position, params.data.id, milestoneId],
      );
    });
    advanceCampaign(
      params.data.id,
      String(current.row.title),
      "Campaign milestones reordered",
      "CampaignMilestonesReordered",
      "reordered milestones",
      { milestoneIds: body.data.milestoneIds },
    );
  });
  projectDomainEventsToActivity();
  res.json(
    ReorderCampaignMilestonesResponse.parse(campaignMilestones(params.data.id)),
  );
});

router.get("/campaigns/:id/versions", (req, res) => {
  const params = ListCampaignVersionsParams.safeParse(req.params);
  if (!params.success) {
    return void res.status(400).json({ error: "Invalid Campaign ID" });
  }
  const rows = all(
    `SELECT * FROM campaign_versions
      WHERE campaign_id = ? ORDER BY version DESC`,
    [params.data.id],
  ).map((row) => ({
    id: Number(row.id),
    campaignId: Number(row.campaign_id),
    version: Number(row.version),
    title: String(row.title),
    missionStatement:
      row.mission_statement == null ? null : String(row.mission_statement),
    successDefinition:
      row.success_definition == null ? null : String(row.success_definition),
    metadata: JSON.parse(String(row.metadata)),
    changeSummary:
      row.change_summary == null ? null : String(row.change_summary),
    createdAt: String(row.created_at),
  }));
  res.json(ListCampaignVersionsResponse.parse(rows));
});

router.delete("/campaigns/:id", (req, res) => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    return void res.status(400).json({ error: params.error.message });
  }
  if (!get("SELECT id FROM campaigns WHERE id = ?", [params.data.id])) {
    return void res.status(404).json({ error: "Campaign not found" });
  }
  res.status(409).json({ error: "Archive Campaigns instead of deleting them" });
});

export default router;
