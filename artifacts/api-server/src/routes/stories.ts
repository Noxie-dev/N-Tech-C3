import { Router, type IRouter } from "express";
import { eq, and, ilike, SQL } from "drizzle-orm";
import { db, storiesTable } from "@workspace/db";
import {
  ListStoriesQueryParams,
  ListStoriesResponse,
  CreateStoryBody,
  CreateStoryResponse,
  GetStoryParams,
  GetStoryResponse,
  UpdateStoryParams,
  UpdateStoryBody,
  UpdateStoryResponse,
  DeleteStoryParams,
  GetStoriesByStatusResponse,
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

router.get("/stories/by-status", async (_req, res): Promise<void> => {
  const rows = await db.select({ status: storiesTable.status }).from(storiesTable);
  const statusMap: Record<string, number> = {};
  for (const r of rows) {
    statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
  }
  const result = Object.entries(statusMap).map(([status, count]) => ({ status, count }));
  res.json(GetStoriesByStatusResponse.parse(result));
});

router.get("/stories", async (req, res): Promise<void> => {
  const query = ListStoriesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { status, campaignId, search } = query.data;
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(storiesTable.status, status));
  if (campaignId != null) conditions.push(eq(storiesTable.campaignId, campaignId));
  if (search) conditions.push(ilike(storiesTable.title, `%${search}%`));

  const rows = conditions.length > 0
    ? await db.select().from(storiesTable).where(and(...conditions)).orderBy(storiesTable.updatedAt)
    : await db.select().from(storiesTable).orderBy(storiesTable.updatedAt);

  res.json(ListStoriesResponse.parse(rows));
});

router.post("/stories", async (req, res): Promise<void> => {
  const parsed = CreateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(storiesTable).values(parsed.data).returning();
  await recordActivity("story", row.id, row.title, "created");
  res.status(201).json(CreateStoryResponse.parse(row));
});

router.get("/stories/:id", async (req, res): Promise<void> => {
  const params = GetStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(storiesTable).where(eq(storiesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  res.json(GetStoryResponse.parse(row));
});

router.patch("/stories/:id", async (req, res): Promise<void> => {
  const params = UpdateStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(storiesTable).set(parsed.data).where(eq(storiesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  await recordActivity("story", row.id, row.title, "updated");
  res.json(UpdateStoryResponse.parse(row));
});

router.delete("/stories/:id", async (req, res): Promise<void> => {
  const params = DeleteStoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(storiesTable).where(eq(storiesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Story not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
