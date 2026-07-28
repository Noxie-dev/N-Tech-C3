import { Router, type IRouter } from "express";
import { eq, and, ilike, SQL } from "drizzle-orm";
import { db, evidenceTable } from "@workspace/db";
import {
  ListEvidenceQueryParams,
  ListEvidenceResponse,
  CreateEvidenceBody,
  CreateEvidenceResponse,
  GetEvidenceParams,
  GetEvidenceResponse,
  UpdateEvidenceParams,
  UpdateEvidenceBody,
  UpdateEvidenceResponse,
  DeleteEvidenceParams,
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

router.get("/evidence", async (req, res): Promise<void> => {
  const query = ListEvidenceQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { type, storyId, search } = query.data;
  const conditions: SQL[] = [];
  if (type) conditions.push(eq(evidenceTable.type, type));
  if (storyId != null) conditions.push(eq(evidenceTable.storyId, storyId));
  if (search) conditions.push(ilike(evidenceTable.title, `%${search}%`));

  const rows = conditions.length > 0
    ? await db.select().from(evidenceTable).where(and(...conditions)).orderBy(evidenceTable.createdAt)
    : await db.select().from(evidenceTable).orderBy(evidenceTable.createdAt);

  res.json(ListEvidenceResponse.parse(rows));
});

router.post("/evidence", async (req, res): Promise<void> => {
  const parsed = CreateEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(evidenceTable).values(parsed.data).returning();
  await recordActivity("evidence", row.id, row.title, "captured");
  res.status(201).json(CreateEvidenceResponse.parse(row));
});

router.get("/evidence/:id", async (req, res): Promise<void> => {
  const params = GetEvidenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(evidenceTable).where(eq(evidenceTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }
  res.json(GetEvidenceResponse.parse(row));
});

router.patch("/evidence/:id", async (req, res): Promise<void> => {
  const params = UpdateEvidenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEvidenceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(evidenceTable).set(parsed.data).where(eq(evidenceTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }
  res.json(UpdateEvidenceResponse.parse(row));
});

router.delete("/evidence/:id", async (req, res): Promise<void> => {
  const params = DeleteEvidenceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(evidenceTable).where(eq(evidenceTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
