import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getDatabasePool } from '../database/connection';
import type { AssistantActivity } from '../../shared/types/assistant';

type Row = RowDataPacket & Record<string, unknown>;
const str = (value: unknown) => String(value);
const dateOrNull = (value: unknown): Date | null => value == null ? null : value as Date;

function mapActivity(row: Row): AssistantActivity {
  let payload: Record<string, unknown> | null = null;
  if (typeof row.payload_json === 'string') {
    try {
      const parsed: unknown = JSON.parse(row.payload_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) payload = parsed as Record<string, unknown>;
    } catch { payload = null; }
  }
  return {
    id: str(row.id), dedupeKey: str(row.dedupe_key), eventType: str(row.event_type),
    severity: row.severity as AssistantActivity['severity'], title: str(row.title),
    description: str(row.description), payload, status: row.status as AssistantActivity['status'],
    notificationSentAt: dateOrNull(row.notification_sent_at), createdAt: row.created_at as Date,
    readAt: dateOrNull(row.read_at), dismissedAt: dateOrNull(row.dismissed_at)
  };
}

const activitySelect = 'SELECT id,dedupe_key,event_type,severity,title,description,payload_json,status,notification_sent_at,created_at,read_at,dismissed_at FROM assistant_activity';

export async function monitoringEnabled(pool: Pool = getDatabasePool()): Promise<boolean> {
  await pool.execute('INSERT IGNORE INTO assistant_preferences(id,monitoring_enabled) VALUES(1,TRUE)');
  const [rows] = await pool.query<Row[]>('SELECT monitoring_enabled FROM assistant_preferences WHERE id=1');
  return Boolean(rows[0]?.monitoring_enabled);
}

export async function setMonitoringEnabled(enabled: boolean, pool: Pool = getDatabasePool()): Promise<void> {
  await pool.execute('INSERT INTO assistant_preferences(id,monitoring_enabled) VALUES(1,?) ON DUPLICATE KEY UPDATE monitoring_enabled=VALUES(monitoring_enabled)', [enabled]);
}

export async function insertActivity(input: Omit<AssistantActivity, 'id'|'status'|'notificationSentAt'|'createdAt'|'readAt'|'dismissedAt'>, pool: Pool = getDatabasePool()): Promise<{ activity: AssistantActivity; inserted: boolean }> {
  const id = randomUUID();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT IGNORE INTO assistant_activity(id,dedupe_key,event_type,severity,title,description,payload_json)
     VALUES(?,?,?,?,?,?,?)`,
    [id,input.dedupeKey,input.eventType,input.severity,input.title,input.description,JSON.stringify(input.payload)]
  );
  const [rows] = await pool.execute<Row[]>(`${activitySelect} WHERE dedupe_key=?`, [input.dedupeKey]);
  if (!rows[0]) throw new Error('Assistant activity could not be loaded.');
  return { activity: mapActivity(rows[0]), inserted: result.affectedRows > 0 };
}

export async function listActivities(limit = 40, includeDismissed = false, pool: Pool = getDatabasePool()): Promise<AssistantActivity[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const [rows] = await pool.execute<Row[]>(`${activitySelect} ${includeDismissed ? '' : "WHERE status<>'dismissed'"} ORDER BY created_at DESC LIMIT ?`, [safeLimit]);
  return rows.map(mapActivity);
}

export async function pendingNotifications(limit = 25, pool: Pool = getDatabasePool()): Promise<AssistantActivity[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const [rows] = await pool.execute<Row[]>(`${activitySelect} WHERE status='unread' AND notification_sent_at IS NULL ORDER BY created_at LIMIT ?`, [safeLimit]);
  return rows.map(mapActivity);
}

export async function markNotificationSent(id: string, pool: Pool = getDatabasePool()): Promise<void> {
  await pool.execute('UPDATE assistant_activity SET notification_sent_at=NOW(3) WHERE id=? AND notification_sent_at IS NULL', [id]);
}

export async function markActivityRead(id: string, pool: Pool = getDatabasePool()): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(`UPDATE assistant_activity SET status='read',read_at=COALESCE(read_at,NOW(3)) WHERE id=? AND status='unread'`, [id]);
  return result.affectedRows > 0;
}

export async function dismissActivity(id: string, pool: Pool = getDatabasePool()): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>(`UPDATE assistant_activity SET status='dismissed',dismissed_at=NOW(3) WHERE id=? AND status<>'dismissed'`, [id]);
  return result.affectedRows > 0;
}

export async function unreadActivityCount(pool: Pool = getDatabasePool()): Promise<number> {
  const [rows] = await pool.query<Row[]>('SELECT COUNT(*) count FROM assistant_activity WHERE status=\'unread\'');
  return Number(rows[0]?.count ?? 0);
}
