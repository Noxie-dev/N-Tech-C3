import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, templatesTable } from "@workspace/db";
import {
  ListTemplatesQueryParams,
  ListTemplatesResponse,
  CreateTemplateBody,
  CreateTemplateResponse,
  GetTemplateParams,
  GetTemplateResponse,
  UpdateTemplateParams,
  UpdateTemplateBody,
  UpdateTemplateResponse,
  DeleteTemplateParams,
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

router.get("/templates", async (req, res): Promise<void> => {
  const query = ListTemplatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { type } = query.data;
  const rows = type
    ? await db.select().from(templatesTable).where(eq(templatesTable.type, type)).orderBy(templatesTable.createdAt)
    : await db.select().from(templatesTable).orderBy(templatesTable.createdAt);
  res.json(ListTemplatesResponse.parse(rows));
});

router.post("/templates", async (req, res): Promise<void> => {
  const parsed = CreateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(templatesTable).values(parsed.data).returning();
  await recordActivity("template", row.id, row.title, "created");
  res.status(201).json(CreateTemplateResponse.parse(row));
});

router.get("/templates/:id", async (req, res): Promise<void> => {
  const params = GetTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(templatesTable).where(eq(templatesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(GetTemplateResponse.parse(row));
});

router.patch("/templates/:id", async (req, res): Promise<void> => {
  const params = UpdateTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTemplateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(templatesTable).set(parsed.data).where(eq(templatesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(UpdateTemplateResponse.parse(row));
});

router.delete("/templates/:id", async (req, res): Promise<void> => {
  const params = DeleteTemplateParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(templatesTable).where(eq(templatesTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
