import { run } from '@workspace/db';

export async function recordActivity(
  entityType: string,
  entityId: number,
  entityTitle: string,
  action: string,
): Promise<void> {
  try {
    run(
      'INSERT INTO activity (entity_type, entity_id, entity_title, action) VALUES (?, ?, ?, ?)',
      [entityType, entityId, entityTitle, action],
    );
  } catch {
    // Activity is non-critical and must never block the primary write.
  }
}
