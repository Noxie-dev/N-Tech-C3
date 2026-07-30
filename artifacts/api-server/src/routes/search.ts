import { Router, type IRouter } from "express";
import {
  GlobalSearchQueryParams,
  GlobalSearchResponse,
} from "@workspace/api-zod";
import { all } from "@workspace/db";

const router: IRouter = Router();

const pathForEntity: Record<string, (id: number) => string> = {
  story: (id) => `/stories/${id}`,
  evidence: () => "/evidence",
  knowledge: (id) => `/knowledge/${id}`,
  campaign: (id) => `/campaigns/${id}`,
  publication: (id) => `/publications/${id}`,
  asset: () => "/assets",
  template: () => "/templates",
  workspace: (id) => `/workspaces/${id}`,
};

function createFtsQuery(input: string) {
  return input
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_-]/gu, ""))
    .filter(Boolean)
    .map((token) => `"${token}"*`)
    .join(" AND ");
}

router.get("/search", (req, res) => {
  const query = GlobalSearchQueryParams.safeParse(req.query);
  if (!query.success)
    return void res.status(400).json({ error: query.error.message });
  const ftsQuery = createFtsQuery(query.data.q);
  if (!ftsQuery) return void res.json([]);

  const conditions = ["global_search MATCH ?"];
  const params: Array<string | number> = [ftsQuery];
  if (query.data.entityType) {
    conditions.push("entity_type = ?");
    params.push(query.data.entityType);
  }
  if (query.data.projectId != null) {
    conditions.push(`(
      (entity_type = 'workspace' AND entity_id = ?) OR
      (entity_type = 'story' AND EXISTS (SELECT 1 FROM stories WHERE stories.id = entity_id AND stories.project_id = ?)) OR
      (entity_type = 'evidence' AND EXISTS (SELECT 1 FROM evidence WHERE evidence.id = entity_id AND evidence.project_id = ?)) OR
      (entity_type = 'publication' AND EXISTS (SELECT 1 FROM publications WHERE publications.id = entity_id AND publications.workspace_id = ?)) OR
      (entity_type = 'asset' AND EXISTS (SELECT 1 FROM assets WHERE assets.id = entity_id AND assets.project_id = ?))
    )`);
    params.push(
      query.data.projectId,
      query.data.projectId,
      query.data.projectId,
      query.data.projectId,
      query.data.projectId,
    );
  }
  if (query.data.status) {
    conditions.push(`(
      (entity_type = 'story' AND EXISTS (SELECT 1 FROM stories WHERE stories.id = entity_id AND stories.status = ?)) OR
      (entity_type = 'campaign' AND EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = entity_id AND campaigns.status = ?)) OR
      (entity_type = 'publication' AND EXISTS (SELECT 1 FROM publications WHERE publications.id = entity_id AND publications.lifecycle_status = ?)) OR
      (entity_type = 'workspace' AND EXISTS (SELECT 1 FROM projects WHERE projects.id = entity_id AND projects.status = ?))
    )`);
    params.push(
      query.data.status,
      query.data.status,
      query.data.status,
      query.data.status,
    );
  }
  const createdAtExpression = `CASE entity_type
    WHEN 'story' THEN (SELECT created_at FROM stories WHERE id = entity_id)
    WHEN 'evidence' THEN (SELECT created_at FROM evidence WHERE id = entity_id)
    WHEN 'knowledge' THEN (SELECT created_at FROM knowledge WHERE id = entity_id)
    WHEN 'campaign' THEN (SELECT created_at FROM campaigns WHERE id = entity_id)
    WHEN 'publication' THEN (SELECT created_at FROM publications WHERE id = entity_id)
    WHEN 'asset' THEN (SELECT created_at FROM assets WHERE id = entity_id)
    WHEN 'template' THEN (SELECT created_at FROM templates WHERE id = entity_id)
    WHEN 'workspace' THEN (SELECT created_at FROM projects WHERE id = entity_id)
  END`;
  if (query.data.from) {
    conditions.push(
      `datetime(coalesce(${createdAtExpression}, '1970-01-01')) >= datetime(?)`,
    );
    params.push(query.data.from.toISOString().slice(0, 10));
  }
  if (query.data.to) {
    conditions.push(
      `datetime(coalesce(${createdAtExpression}, '1970-01-01')) < datetime(?, '+1 day')`,
    );
    params.push(query.data.to.toISOString().slice(0, 10));
  }
  params.push(query.data.limit);

  const rows = all(
    `
    SELECT
      entity_type,
      entity_id,
      title,
      snippet(global_search, 3, '<mark>', '</mark>', ' … ', 18) AS result_snippet
    FROM global_search
    WHERE ${conditions.join(" AND ")}
    ORDER BY bm25(global_search, 8.0, 4.0, 1.0)
    LIMIT ?
  `,
    params,
  );

  res.json(
    GlobalSearchResponse.parse(
      rows.map((row) => {
        const entityType = String(row.entity_type);
        const entityId = Number(row.entity_id);
        return {
          entityType,
          entityId,
          title: String(row.title),
          snippet: String(row.result_snippet ?? ""),
          path: pathForEntity[entityType]?.(entityId) ?? "/",
        };
      }),
    ),
  );
});

export default router;
