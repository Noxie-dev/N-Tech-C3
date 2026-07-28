import { randomUUID } from 'node:crypto';
import { all, get, run, transaction } from '@workspace/db';

export type DomainEventInput = {
  eventType: string;
  eventVersion: number;
  aggregateType: string;
  aggregateId: number;
  payload: Record<string, unknown>;
};

const ACTIVITY_CONSUMER = 'activity-projection-v1';

export function appendDomainEvent(input: DomainEventInput) {
  const eventId = randomUUID();
  const result = run(`
    INSERT INTO domain_events (
      event_id, event_type, event_version, aggregate_type, aggregate_id, payload
    ) VALUES (?, ?, ?, ?, ?, ?)
  `, [
    eventId, input.eventType, input.eventVersion, input.aggregateType,
    input.aggregateId, JSON.stringify(input.payload),
  ]);
  return { id: Number(result.lastInsertRowid), eventId };
}

export function projectDomainEventsToActivity() {
  const checkpoint = get(
    'SELECT last_event_id FROM event_consumers WHERE consumer_name = ?',
    [ACTIVITY_CONSUMER],
  );
  const events = all(
    'SELECT * FROM domain_events WHERE id > ? ORDER BY id',
    [Number(checkpoint?.last_event_id ?? 0)],
  );

  for (const event of events) {
    transaction(() => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(String(event.payload)) as Record<string, unknown>;
      } catch {
        // Invalid payloads are quarantined below.
      }
      const supported = Number(event.event_version) === 1
        && typeof payload.entityTitle === 'string'
        && typeof payload.action === 'string';
      if (supported) {
        run(`
          INSERT OR IGNORE INTO activity (
            entity_type, entity_id, entity_title, action, created_at, source_event_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          String(event.aggregate_type), Number(event.aggregate_id),
          String(payload.entityTitle), String(payload.action),
          String(event.occurred_at), Number(event.id),
        ]);
      } else {
        run(`
          INSERT OR IGNORE INTO event_failures (consumer_name, event_id, reason)
          VALUES (?, ?, ?)
        `, [ACTIVITY_CONSUMER, Number(event.id), 'Unsupported event version or activity payload']);
      }
      run(`
        INSERT INTO event_consumers (consumer_name, last_event_id)
        VALUES (?, ?)
        ON CONFLICT(consumer_name) DO UPDATE SET
          last_event_id = excluded.last_event_id,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      `, [ACTIVITY_CONSUMER, Number(event.id)]);
    });
  }
  return events.length;
}
