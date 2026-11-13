import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

import { getDatabasePool } from '../database/connection';
import type {
  DailyWellnessSummary,
  HydrationEntry,
  SleepRecord,
  WellnessActivity,
  WellnessBreak,
  WellnessCategory,
  WellnessReminder,
  WellnessReminderStatus,
  WellnessSettings
} from '../modules/wellness/wellness-types';

interface SettingRow extends RowDataPacket {
  category: 'hydration' | 'movement' | 'eye_rest' | 'sleep' | 'general';
  settings_json: string;
}

interface HydrationRow extends RowDataPacket {
  id: string | number;
  amount_ml: number | string;
  recorded_at: Date;
}

interface BreakRow extends RowDataPacket {
  id: string | number;
  break_type: 'movement' | 'eye_rest';
  completed_at: Date;
  duration_seconds: number | null;
}

interface SleepRow extends RowDataPacket {
  id: string | number;
  sleep_started_at: Date | null;
  wake_up_at: Date | null;
  duration_minutes: number | null;
  created_at: Date;
  updated_at: Date;
}

interface ReminderRow extends RowDataPacket {
  id: string;
  category: WellnessCategory | 'finance_bill';
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  scheduled_at: Date;
  status: WellnessReminderStatus;
  snoozed_until: Date | null;
  completed_at: Date | null;
  dismissed_at: Date | null;
}

interface SummaryRow extends RowDataPacket {
  water_consumed_ml: number | string;
  hydration_entries: number | string;
  movement_breaks: number | string;
  eye_rest_breaks: number | string;
  last_movement_break: Date | null;
  last_eye_rest_break: Date | null;
  bedtime_recorded: number | string;
  wake_up_recorded: number | string;
}

interface ActivityRow extends RowDataPacket {
  id: string;
  category: WellnessActivity['category'];
  label: string;
  occurred_at: Date;
  detail: string;
}

function mapHydration(row: HydrationRow): HydrationEntry {
  return { id: String(row.id), amountMl: Number(row.amount_ml), recordedAt: row.recorded_at };
}

function mapBreak(row: BreakRow): WellnessBreak {
  return {
    id: String(row.id),
    breakType: row.break_type,
    completedAt: row.completed_at,
    durationSeconds: row.duration_seconds
  };
}

function mapSleep(row: SleepRow): SleepRecord {
  return {
    id: String(row.id),
    sleepStartedAt: row.sleep_started_at,
    wakeUpAt: row.wake_up_at,
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapReminder(row: ReminderRow): WellnessReminder {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    description: row.description,
    priority: row.priority,
    scheduledAt: row.scheduled_at,
    status: row.status,
    snoozedUntil: row.snoozed_until,
    completedAt: row.completed_at,
    dismissedAt: row.dismissed_at
  };
}

export async function getWellnessSettings(
  defaults: WellnessSettings,
  pool: Pool = getDatabasePool()
): Promise<WellnessSettings> {
  const [rows] = await pool.query<SettingRow[]>(
    'SELECT category, settings_json FROM wellness_settings'
  );
  const result = structuredClone(defaults);

  for (const row of rows) {
    try {
      const category = row.category === 'eye_rest' ? 'eyeRest' : row.category;
      Object.assign(result[category], JSON.parse(row.settings_json));
    } catch {
      // A malformed setting row is ignored and its safe default is retained.
    }
  }

  return result;
}

export async function saveWellnessSettings(
  settings: WellnessSettings,
  pool: Pool = getDatabasePool()
): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [rawCategory, value] of Object.entries(settings)) {
      const category = rawCategory === 'eyeRest' ? 'eye_rest' : rawCategory;
      await connection.execute(
        `INSERT INTO wellness_settings (category, settings_json)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE settings_json = VALUES(settings_json)`,
        [category, JSON.stringify(value)]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function addHydrationEntry(
  amountMl: number,
  recordedAt: Date | undefined,
  pool: Pool = getDatabasePool()
): Promise<HydrationEntry> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO hydration_entries (amount_ml, recorded_at) VALUES (?, COALESCE(?, NOW(3)))',
    [amountMl, recordedAt ?? null]
  );
  const [rows] = await pool.execute<HydrationRow[]>(
    'SELECT id, amount_ml, recorded_at FROM hydration_entries WHERE id = ?',
    [result.insertId]
  );
  return mapHydration(rows[0]);
}

export async function getTodayHydrationEntries(pool: Pool = getDatabasePool()): Promise<HydrationEntry[]> {
  const [rows] = await pool.execute<HydrationRow[]>(
    `SELECT id, amount_ml, recorded_at FROM hydration_entries
     WHERE recorded_at >= CURDATE() AND recorded_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
     ORDER BY recorded_at DESC`
  );
  return rows.map(mapHydration);
}

export async function updateHydrationEntry(
  id: string,
  amountMl: number,
  pool: Pool = getDatabasePool()
): Promise<HydrationEntry | null> {
  await pool.execute('UPDATE hydration_entries SET amount_ml = ? WHERE id = ?', [amountMl, id]);
  const [rows] = await pool.execute<HydrationRow[]>(
    'SELECT id, amount_ml, recorded_at FROM hydration_entries WHERE id = ?', [id]
  );
  return rows[0] ? mapHydration(rows[0]) : null;
}

export async function deleteHydrationEntry(id: string, pool: Pool = getDatabasePool()): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM hydration_entries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function recordWellnessBreak(
  type: 'movement' | 'eye_rest',
  durationSeconds: number | null,
  completedAt: Date | undefined,
  pool: Pool = getDatabasePool()
): Promise<WellnessBreak> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO wellness_breaks (break_type, completed_at, duration_seconds) VALUES (?, COALESCE(?, NOW(3)), ?)',
    [type, completedAt ?? null, durationSeconds]
  );
  const [rows] = await pool.execute<BreakRow[]>(
    'SELECT id, break_type, completed_at, duration_seconds FROM wellness_breaks WHERE id = ?',
    [result.insertId]
  );
  return mapBreak(rows[0]);
}

export async function getTodayWellnessBreaks(
  pool: Pool = getDatabasePool()
): Promise<WellnessBreak[]> {
  const [rows] = await pool.execute<BreakRow[]>(
    `SELECT id, break_type, completed_at, duration_seconds FROM wellness_breaks
     WHERE completed_at >= CURDATE() AND completed_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
     ORDER BY completed_at DESC`
  );
  return rows.map(mapBreak);
}

export async function createSleepRecord(
  startedAt: Date | undefined,
  pool: Pool = getDatabasePool()
): Promise<SleepRecord> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO sleep_records (sleep_started_at) VALUES (COALESCE(?, NOW(3)))',
    [startedAt ?? null]
  );
  const [rows] = await pool.execute<SleepRow[]>(
    `SELECT id, sleep_started_at, wake_up_at,
       CASE WHEN wake_up_at IS NULL THEN NULL ELSE TIMESTAMPDIFF(MINUTE, sleep_started_at, wake_up_at) END AS duration_minutes,
       created_at, updated_at FROM sleep_records WHERE id = ?`,
    [result.insertId]
  );
  return mapSleep(rows[0]);
}

export async function createWakeRecord(
  wakeUpAt: Date | undefined,
  pool: Pool = getDatabasePool()
): Promise<SleepRecord> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO sleep_records (wake_up_at) VALUES (COALESCE(?, NOW(3)))',
    [wakeUpAt ?? null]
  );
  const [rows] = await pool.execute<SleepRow[]>(
    `SELECT id, sleep_started_at, wake_up_at, NULL AS duration_minutes,
       created_at, updated_at FROM sleep_records WHERE id = ?`, [result.insertId]
  );
  return mapSleep(rows[0]);
}

export async function finishSleepRecord(
  id: string,
  wakeUpAt: Date | undefined,
  pool: Pool = getDatabasePool()
): Promise<SleepRecord | null> {
  await pool.execute('UPDATE sleep_records SET wake_up_at = COALESCE(?, NOW(3)) WHERE id = ? AND wake_up_at IS NULL', [wakeUpAt ?? null, id]);
  const [rows] = await pool.execute<SleepRow[]>(
    `SELECT id, sleep_started_at, wake_up_at,
       CASE WHEN wake_up_at IS NULL THEN NULL ELSE TIMESTAMPDIFF(MINUTE, sleep_started_at, wake_up_at) END AS duration_minutes,
       created_at, updated_at FROM sleep_records WHERE id = ?`,
    [id]
  );
  return rows[0] ? mapSleep(rows[0]) : null;
}

export async function updateSleepRecord(
  id: string,
  sleepStartedAt: Date | null,
  wakeUpAt: Date | null,
  pool: Pool = getDatabasePool()
): Promise<SleepRecord | null> {
  await pool.execute('UPDATE sleep_records SET sleep_started_at = ?, wake_up_at = ? WHERE id = ?', [sleepStartedAt, wakeUpAt, id]);
  const [rows] = await pool.execute<SleepRow[]>(
    `SELECT id, sleep_started_at, wake_up_at,
       CASE WHEN wake_up_at IS NULL THEN NULL ELSE TIMESTAMPDIFF(MINUTE, sleep_started_at, wake_up_at) END AS duration_minutes,
       created_at, updated_at FROM sleep_records WHERE id = ?`,
    [id]
  );
  return rows[0] ? mapSleep(rows[0]) : null;
}

export async function deleteSleepRecord(id: string, pool: Pool = getDatabasePool()): Promise<boolean> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM sleep_records WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getSleepHistory(limit = 14, pool: Pool = getDatabasePool()): Promise<SleepRecord[]> {
  const safeLimit = Math.max(1, Math.min(60, Math.floor(limit)));
  const [rows] = await pool.execute<SleepRow[]>(
    `SELECT id, sleep_started_at, wake_up_at,
       CASE WHEN wake_up_at IS NULL THEN NULL ELSE TIMESTAMPDIFF(MINUTE, sleep_started_at, wake_up_at) END AS duration_minutes,
       created_at, updated_at FROM sleep_records ORDER BY sleep_started_at DESC LIMIT ?`,
    [safeLimit]
  );
  return rows.map(mapSleep);
}

export async function createWellnessReminder(
  input: Omit<WellnessReminder, 'id' | 'status' | 'snoozedUntil' | 'completedAt' | 'dismissedAt'>,
  pool: Pool = getDatabasePool()
): Promise<WellnessReminder | null> {
  const id = randomUUID();
  await pool.execute(
    `INSERT IGNORE INTO wellness_reminders (id, category, title, description, priority, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.category, input.title, input.description, input.priority, input.scheduledAt]
  );
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders WHERE category = ? AND scheduled_at = ? LIMIT 1`,
    [input.category, input.scheduledAt]
  );
  return rows[0] ? mapReminder(rows[0]) : null;
}

export async function getPendingReminder(category: WellnessCategory, pool: Pool = getDatabasePool()): Promise<WellnessReminder | null> {
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders WHERE category = ? AND status IN ('scheduled', 'notified', 'snoozed')
     ORDER BY scheduled_at DESC LIMIT 1`,
    [category]
  );
  return rows[0] ? mapReminder(rows[0]) : null;
}

export async function getDueReminders(pool: Pool = getDatabasePool()): Promise<WellnessReminder[]> {
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders
     WHERE category <> 'finance_bill' AND ((status = 'scheduled' AND scheduled_at <= NOW(3))
        OR (status = 'snoozed' AND snoozed_until <= NOW(3))
     )
     ORDER BY COALESCE(snoozed_until, scheduled_at) ASC`
  );
  return rows.map(mapReminder);
}

export async function markReminderNotified(id: string, pool: Pool = getDatabasePool()): Promise<void> {
  await pool.execute(
    `UPDATE wellness_reminders SET status = 'notified', snoozed_until = NULL
     WHERE id = ? AND status IN ('scheduled', 'snoozed')`, [id]
  );
}

export async function getPendingReminders(limit = 10, pool: Pool = getDatabasePool()): Promise<WellnessReminder[]> {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders WHERE category <> 'finance_bill' AND status IN ('scheduled', 'notified', 'snoozed')
     ORDER BY COALESCE(snoozed_until, scheduled_at) ASC LIMIT ?`, [safeLimit]
  );
  return rows.map(mapReminder);
}

export async function snoozeWellnessReminder(id: string, minutes: number, pool: Pool = getDatabasePool()): Promise<WellnessReminder | null> {
  await pool.execute(
    `UPDATE wellness_reminders SET status = 'snoozed', snoozed_until = DATE_ADD(NOW(3), INTERVAL ? MINUTE)
     WHERE id = ? AND status IN ('notified', 'scheduled', 'snoozed')`, [minutes, id]
  );
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders WHERE id = ?`, [id]
  );
  return rows[0] ? mapReminder(rows[0]) : null;
}

export async function completeWellnessReminder(
  id: string,
  hydrationAmountMl?: number,
  pool: Pool = getDatabasePool()
): Promise<WellnessReminder | null> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [reminderRows] = await connection.execute<ReminderRow[]>(
      `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
       FROM wellness_reminders WHERE id = ? FOR UPDATE`, [id]
    );
    const reminder = reminderRows[0];
    if (reminder?.category === 'finance_bill') {
      await connection.rollback();
      throw new Error('Bill reminders must be completed by recording the bill payment in Finance.');
    }
    if (!reminder || !['notified', 'scheduled', 'snoozed'].includes(reminder.status)) {
      await connection.rollback();
      return null;
    }

    if (reminder.category === 'hydration') {
      if (!hydrationAmountMl || hydrationAmountMl < 1 || hydrationAmountMl > 5000) {
        throw new Error('Enter the amount of water consumed to complete this reminder.');
      }
      await connection.execute(
        'INSERT INTO hydration_entries (amount_ml, recorded_at) VALUES (?, NOW(3))', [hydrationAmountMl]
      );
    } else if (reminder.category === 'movement' || reminder.category === 'eye_rest') {
      await connection.execute(
        'INSERT INTO wellness_breaks (break_type, completed_at) VALUES (?, NOW(3))',
        [reminder.category]
      );
    } else if (reminder.category === 'bedtime') {
      await connection.execute('INSERT INTO sleep_records (sleep_started_at) VALUES (NOW(3))');
    } else {
      const [openSleep] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM sleep_records WHERE sleep_started_at IS NOT NULL AND wake_up_at IS NULL ORDER BY sleep_started_at DESC LIMIT 1 FOR UPDATE'
      );
      if (openSleep.length) {
        await connection.execute('UPDATE sleep_records SET wake_up_at = NOW(3) WHERE id = ?', [openSleep[0].id]);
      } else {
        await connection.execute('INSERT INTO sleep_records (wake_up_at) VALUES (NOW(3))');
      }
    }

    await connection.execute(
      `UPDATE wellness_reminders SET status = 'completed', completed_at = NOW(3), snoozed_until = NULL
       WHERE id = ?`, [id]
    );
    const [rows] = await connection.execute<ReminderRow[]>(
      `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
       FROM wellness_reminders WHERE id = ?`, [id]
    );
    await connection.commit();
    return rows[0] ? mapReminder(rows[0]) : null;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function dismissWellnessReminder(id: string, pool: Pool = getDatabasePool()): Promise<WellnessReminder | null> {
  await pool.execute(
    `UPDATE wellness_reminders SET status = 'dismissed', dismissed_at = NOW(3), snoozed_until = NULL
     WHERE id = ? AND status IN ('notified', 'scheduled', 'snoozed')`, [id]
  );
  const [rows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders WHERE id = ?`, [id]
  );
  return rows[0] ? mapReminder(rows[0]) : null;
}

export async function cancelPendingReminders(
  category?: WellnessCategory,
  pool: Pool = getDatabasePool()
): Promise<void> {
  if (category) {
    await pool.execute(
      `UPDATE wellness_reminders SET status = 'dismissed', dismissed_at = NOW(3), snoozed_until = NULL
       WHERE category = ? AND status IN ('scheduled', 'notified', 'snoozed')`, [category]
    );
    return;
  }
  await pool.execute(
    `UPDATE wellness_reminders SET status = 'dismissed', dismissed_at = NOW(3), snoozed_until = NULL
     WHERE status IN ('scheduled', 'notified', 'snoozed')`
  );
}

export async function getDailyWellnessSummary(
  targetMl: number,
  pool: Pool = getDatabasePool()
): Promise<DailyWellnessSummary> {
  const [summaryRows] = await pool.query<SummaryRow[]>(`
    SELECT
      COALESCE((SELECT SUM(amount_ml) FROM hydration_entries
        WHERE recorded_at >= CURDATE() AND recorded_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)), 0) AS water_consumed_ml,
      (SELECT COUNT(*) FROM hydration_entries
        WHERE recorded_at >= CURDATE() AND recorded_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS hydration_entries,
      (SELECT COUNT(*) FROM wellness_breaks WHERE break_type = 'movement'
        AND completed_at >= CURDATE() AND completed_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS movement_breaks,
      (SELECT COUNT(*) FROM wellness_breaks WHERE break_type = 'eye_rest'
        AND completed_at >= CURDATE() AND completed_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS eye_rest_breaks,
      (SELECT MAX(completed_at) FROM wellness_breaks WHERE break_type = 'movement'
        AND completed_at >= CURDATE() AND completed_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS last_movement_break,
      (SELECT MAX(completed_at) FROM wellness_breaks WHERE break_type = 'eye_rest'
        AND completed_at >= CURDATE() AND completed_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS last_eye_rest_break,
      (SELECT COUNT(*) FROM sleep_records WHERE sleep_started_at >= CURDATE()
        AND sleep_started_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS bedtime_recorded,
      (SELECT COUNT(*) FROM sleep_records WHERE wake_up_at >= CURDATE()
        AND wake_up_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)) AS wake_up_recorded
  `);
  const [reminderRows] = await pool.execute<ReminderRow[]>(
    `SELECT id, category, title, description, priority, scheduled_at, status, snoozed_until, completed_at, dismissed_at
     FROM wellness_reminders WHERE status IN ('scheduled', 'notified', 'snoozed')
     ORDER BY COALESCE(snoozed_until, scheduled_at) ASC LIMIT 5`
  );
  const [activityRows] = await pool.query<ActivityRow[]>(`
    SELECT id, category, label, occurred_at, detail FROM (
      SELECT CAST(id AS CHAR) AS id, 'hydration' AS category, 'Water intake' AS label,
        recorded_at AS occurred_at, CONCAT(amount_ml, ' ml') AS detail
        FROM hydration_entries
      UNION ALL
      SELECT CAST(id AS CHAR), break_type,
        CASE break_type WHEN 'movement' THEN 'Movement break' ELSE 'Eye-rest break' END,
        completed_at,
        CASE WHEN duration_seconds IS NULL THEN 'Completed' ELSE CONCAT(duration_seconds, ' seconds') END
        FROM wellness_breaks
      UNION ALL
      SELECT CAST(id AS CHAR), 'sleep', 'Sleep recorded', sleep_started_at, 'Manual sleep record'
        FROM sleep_records
      UNION ALL
      SELECT CAST(id AS CHAR), 'wake_up', 'Wake-up recorded', wake_up_at, 'Manual wake-up record'
        FROM sleep_records WHERE wake_up_at IS NOT NULL
    ) wellness_activity
    WHERE occurred_at >= CURDATE() AND occurred_at < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    ORDER BY occurred_at DESC LIMIT 10
  `);
  const summary = summaryRows[0];
  const now = new Date();
  const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return {
    date: localDate,
    remindersEnabled: false,
    enabledReminderCategories: [],
    hydrationTargetMl: targetMl,
    waterConsumedMl: Number(summary.water_consumed_ml),
    hydrationEntries: Number(summary.hydration_entries),
    movementBreaks: Number(summary.movement_breaks),
    eyeRestBreaks: Number(summary.eye_rest_breaks),
    lastMovementBreak: summary.last_movement_break,
    lastEyeRestBreak: summary.last_eye_rest_break,
    bedtimeRecorded: Number(summary.bedtime_recorded) > 0,
    wakeUpRecorded: Number(summary.wake_up_recorded) > 0,
    upcomingReminders: reminderRows.map(mapReminder),
    recentActivity: activityRows.map((row) => ({
      id: row.id,
      category: row.category,
      label: row.label,
      occurredAt: row.occurred_at,
      detail: row.detail
    }))
  };
}
