import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, projectsTable } from "@workspace/db";
import {
  ListProjectsResponse,
  CreateProjectBody,
  CreateProjectResponse,
  GetProjectParams,
  GetProjectResponse,
  UpdateProjectParams,
  UpdateProjectBody,
  UpdateProjectResponse,
  DeleteProjectParams,
} from "@workspace/api-zod";
import { recordActivity } from "../lib/activity";

const router: IRouter = Router();

router.get("/projects", async (_req, res): Promise<void> => {
  const rows = await db.select().from(projectsTable).orderBy(projectsTable.createdAt);
  res.json(ListProjectsResponse.parse(rows));
});

router.post("/projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(projectsTable).values(parsed.data).returning();
  await recordActivity("project", row.id, row.name, "created");
  res.status(201).json(CreateProjectResponse.parse(row));
});

router.get("/projects/:id", async (req, res): Promise<void> => {
  const params = GetProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(GetProjectResponse.parse(row));
});

router.patch("/projects/:id", async (req, res): Promise<void> => {
  const params = UpdateProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.update(projectsTable).set(parsed.data).where(eq(projectsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.json(UpdateProjectResponse.parse(row));
});

router.delete("/projects/:id", async (req, res): Promise<void> => {
  const params = DeleteProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db.delete(projectsTable).where(eq(projectsTable.id, params.data.id)).returning();
  if (!row) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
