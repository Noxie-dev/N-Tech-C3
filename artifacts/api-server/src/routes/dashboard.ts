import { Router, type IRouter } from "express";
import { count, desc, eq } from "drizzle-orm";
import { db, storiesTable, campaignsTable, evidenceTable, assetsTable, knowledgeTable, activityTable } from "@workspace/db";
import { GetDashboardStatsResponse, GetRecentActivityResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const [storyCount] = await db.select({ count: count() }).from(storiesTable);
  const [campaignCount] = await db.select({ count: count() }).from(campaignsTable);
  const [evidenceCount] = await db.select({ count: count() }).from(evidenceTable);
  const [assetCount] = await db.select({ count: count() }).from(assetsTable);
  const [knowledgeCount] = await db.select({ count: count() }).from(knowledgeTable);

  const [activeCount] = await db
    .select({ count: count() })
    .from(campaignsTable)
    .where(eq(campaignsTable.status, "Active"));

  // Stories by status
  const allStories = await db.select({ status: storiesTable.status }).from(storiesTable);
  const statusMap: Record<string, number> = {};
  for (const s of allStories) {
    statusMap[s.status] = (statusMap[s.status] ?? 0) + 1;
  }
  const storiesByStatus = Object.entries(statusMap).map(([status, cnt]) => ({ status, count: cnt }));

  const stats = {
    totalStories: storyCount?.count ?? 0,
    totalCampaigns: campaignCount?.count ?? 0,
    totalEvidence: evidenceCount?.count ?? 0,
    totalAssets: assetCount?.count ?? 0,
    totalKnowledge: knowledgeCount?.count ?? 0,
    activeCampaigns: activeCount?.count ?? 0,
    storiesByStatus,
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

router.get("/activity", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(activityTable)
    .orderBy(desc(activityTable.createdAt))
    .limit(30);

  res.json(GetRecentActivityResponse.parse(items));
});

export default router;
