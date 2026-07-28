import { db, activityTable } from "@workspace/db";

export async function recordActivity(
  entityType: string,
  entityId: number,
  entityTitle: string,
  action: string,
): Promise<void> {
  try {
    await db.insert(activityTable).values({ entityType, entityId, entityTitle, action });
  } catch {
    // Non-critical — swallow errors silently
  }
}
