import { get } from '@workspace/db';
import type { RequestHandler } from 'express';

export function workspaceMutationError(workspaceId: unknown): string | undefined {
  if (workspaceId == null) return 'A Workspace is required';
  const workspace = get('SELECT status FROM projects WHERE id = ?', [Number(workspaceId)]);
  if (!workspace) return 'Workspace not found';
  if (workspace.status === 'Archived') {
    return 'Archived Workspaces are read-only; restore the Workspace first';
  }
  return undefined;
}

export function entityWorkspaceId(table: string, id: number) {
  return get(`SELECT project_id FROM ${table} WHERE id = ?`, [id])?.project_id;
}

export function guardWorkspaceMutations(table: string): RequestHandler {
  return (req, res, next) => {
    if (req.method === 'GET') return next();
    const entityId = Number(req.path.split('/').find((part) => /^\d+$/.test(part)));
    const workspaceId = req.body?.workspaceId ?? req.body?.projectId
      ?? (Number.isInteger(entityId) ? entityWorkspaceId(table, entityId) : undefined);
    if (workspaceId == null) return next();
    const error = workspaceMutationError(workspaceId);
    if (!error) return next();
    return void res.status(error === 'Workspace not found' ? 404 : 409).json({ error });
  };
}
