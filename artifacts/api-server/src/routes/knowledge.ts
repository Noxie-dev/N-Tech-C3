import { Router, type IRouter } from "express";
import { eq, and, ilike, SQL } from "drizzle-orm";
import { db, knowledgeTable } from "@workspace/db";
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
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

// Convert stored string array of IDs back to number array for the response
function parseLinkedIds(row: typeof knowledgeTable.$inferSelect) {
  return {
    ...row,
    linkedPageIds: (row.linkedPageIds ?? []).map(Number).filter((n: number) => !isNaN(n)),
  };
}

router.get("/knowledge", async (req, res): Promise<void> => {
  const query = ListKnowledgeQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { category, search } = query.data;
  const conditions: SQL[] = [];
  if (category) conditions.push(eq(knowledgeTable.category, category));
  if (search) conditions.push(ilike(knowledgeTable.title, `%${search}%`));

  const rows = conditions.length > 0
    ? await db.select().from(knowledgeTable).where(and(...conditions)).orderBy(knowledgeTable.updatedAt)
    : await db.select().from(knowledgeTable).orderBy(knowledgeTable.updatedAt);

  res.json(ListKnowledgeResponse.parse(rows.map(parseLinkedIds)));
});

router.post("/knowledge", async (req, res): Promise<void> => {
  const parsed = CreateKnowledgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Store linkedPageIds as string[] in the DB
  const data = {
    ...parsed.data,
    linkedPageIds: (parsed.data.linkedPageIds ?? []).map(String),
  };
  const [row] = await db.insert(knowledgeTable).values(data).returning();
  await recordActivity("knowledge", row.id, row.title, "created");
  res.status(201).json(CreateKnowledgeResponse.parse(parseLinkedIds(row)));
});

router.get("/knowledge/:id", async (req, res): Promise<void> => {
  const params = GetKnowledgeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(knowledgeTable).where(eq(knowledgeTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Knowledge page not found" });
    return;
  }
  res.json(GetKnowledgeResponse.parse(parseLinkedIds(row)));
});

router.patch("/knowledge/:id", async (req, res): Promise<void> => {
  const params = UpdateKnowledgeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateKnowledgeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.linkedPageIds != null) {
    data.linkedPageIds = parsed.data.linkedPageIds.map(String);
  }
  const [row] = await db.update(knowledgeTable).set(data).where(eq(knowledgeTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Knowledge page not found" });
    return;
  }
  res.json(UpdateKnowledgeResponse.parse(parseLinkedIds(row)));
});

router.delete("/knowledge/:id", async (req, res): Promise<void> => {
  const params = DeleteKnowledgeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(knowledgeTable).where(eq(knowledgeTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Knowledge page not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
