import { Router, type IRouter } from "express";
import { eq, and, SQL } from "drizzle-orm";
import { db, assetsTable } from "@workspace/db";
import {
  ListAssetsQueryParams,
  ListAssetsResponse,
  CreateAssetBody,
  CreateAssetResponse,
  GetAssetParams,
  GetAssetResponse,
  UpdateAssetParams,
  UpdateAssetBody,
  UpdateAssetResponse,
  DeleteAssetParams,
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

router.get("/assets", async (req, res): Promise<void> => {
  const query = ListAssetsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { type, storyId } = query.data;
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(assetsTable.type, type));
  if (storyId != null) conditions.push(eq(assetsTable.storyId, storyId));

  const rows = conditions.length > 0
    ? await db.select().from(assetsTable).where(and(...conditions)).orderBy(assetsTable.createdAt)
    : await db.select().from(assetsTable).orderBy(assetsTable.createdAt);

  res.json(ListAssetsResponse.parse(rows));
});

router.post("/assets", async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(assetsTable).values(parsed.data).returning();
  await recordActivity("asset", row.id, row.title, "added");
  res.status(201).json(CreateAssetResponse.parse(row));
});

router.get("/assets/:id", async (req, res): Promise<void> => {
  const params = GetAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.json(GetAssetResponse.parse(row));
});

router.patch("/assets/:id", async (req, res): Promise<void> => {
  const params = UpdateAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(assetsTable).set(parsed.data).where(eq(assetsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.json(UpdateAssetResponse.parse(row));
});

router.delete("/assets/:id", async (req, res): Promise<void> => {
  const params = DeleteAssetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(assetsTable).where(eq(assetsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Asset not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
