import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, campaignsTable, storiesTable } from "@workspace/db";
import {
  ListCampaignsResponse,
  CreateCampaignBody,
  CreateCampaignResponse,
  GetCampaignParams,
  GetCampaignResponse,
  UpdateCampaignParams,
  UpdateCampaignBody,
  UpdateCampaignResponse,
  DeleteCampaignParams,
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

async function withStoryCount(campaign: typeof campaignsTable.$inferSelect) {
  const [cnt] = await db.select({ count: count() }).from(storiesTable).where(eq(storiesTable.campaignId, campaign.id));
  return { ...campaign, storyCount: cnt?.count ?? 0 };
}

router.get("/campaigns", async (_req, res): Promise<void> => {
  const rows = await db.select().from(campaignsTable).orderBy(campaignsTable.createdAt);
  const withCounts = await Promise.all(rows.map(withStoryCount));
  res.json(ListCampaignsResponse.parse(withCounts));
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const parsed = CreateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(campaignsTable).values(parsed.data).returning();
  await recordActivity("campaign", row.id, row.title, "created");
  const withCount = await withStoryCount(row);
  res.status(201).json(CreateCampaignResponse.parse(withCount));
});

router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const params = GetCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const withCount = await withStoryCount(row);
  res.json(GetCampaignResponse.parse(withCount));
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const params = UpdateCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCampaignBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(campaignsTable).set(parsed.data).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  await recordActivity("campaign", row.id, row.title, "updated");
  const withCount = await withStoryCount(row);
  res.json(UpdateCampaignResponse.parse(withCount));
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const params = DeleteCampaignParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(campaignsTable).where(eq(campaignsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
