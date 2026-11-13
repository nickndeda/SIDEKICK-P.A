
import { randomUUID } from 'node:crypto';

import type {
  Pool,
  RowDataPacket,
  ResultSetHeader
} from 'mysql2/promise';

import { getDatabasePool } from '../database/connection';

import type {
  ProductivitySession,
  ProductivitySessionType,
  ProductivitySummary,
  DailyFocusSummary,
  StartProductivitySessionInput
} from '../modules/productivity/productivity-types';

interface ProductivitySessionRow extends RowDataPacket {
  id: string;
  task_id: number | string | null;
  title: string;
  session_type: ProductivitySessionType;
  target_minutes: number;
  status: 'running' | 'paused' | 'completed' | 'cancelled';
  started_at: Date;
  ended_at: Date | null;
  elapsed_seconds: number;
  created_at: Date;
}

interface ProductivityStatsRow extends RowDataPacket {
  today_focus_seconds: number | string | null;
  today_sessions: number | string;
  today_completed_sessions: number | string;
  weekly_focus_seconds: number | string | null;
}

interface DailyFocusRow extends RowDataPacket {
  session_date: string | Date;
  focus_seconds: number | string;
}

function mapSession(row: ProductivitySessionRow): ProductivitySession {
  return {
    id: row.id,
    taskId: row.task_id === null ? null : Number(row.task_id),
    title: row.title,
    sessionType: row.session_type,
    targetMinutes: Number(row.target_minutes),
    status: row.status,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    elapsedSeconds: Number(row.elapsed_seconds),
    createdAt: row.created_at
  };
}

const sessionSelect = `
  SELECT
    id,
    task_id,
    title,
    session_type,
    target_minutes,
    status,
    started_at,
    ended_at,
    created_at,

    CAST(
      elapsed_seconds +
      CASE
        WHEN status = 'running' AND segment_started_at IS NOT NULL
        THEN TIMESTAMPDIFF(
          SECOND,
          segment_started_at,
          CURRENT_TIMESTAMP(3)
        )
        ELSE 0
      END
      AS UNSIGNED
    ) AS elapsed_seconds

  FROM productivity_sessions
`;

export async function startProductivitySession(
  input: StartProductivitySessionInput,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession> {
  const id = randomUUID();

  await pool.execute(
    `
      INSERT INTO productivity_sessions (
        id,
        task_id,
        title,
        session_type,
        target_minutes,
        status,
        started_at,
        segment_started_at
      )
      VALUES (?, ?, ?, ?, ?, 'running', NOW(3), NOW(3))
    `,
    [
      id,
      input.taskId ?? null,
      input.title,
      input.sessionType,
      input.targetMinutes
    ]
  );

  const session = await getProductivitySessionById(id, pool);

  if (!session) {
    throw new Error('The productivity session could not be created.');
  }

  return session;
}

export async function getProductivitySessionById(
  id: string,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession | null> {
  const [rows] = await pool.execute<ProductivitySessionRow[]>(
    `${sessionSelect} WHERE id = ? LIMIT 1`,
    [id]
  );

  return rows.length > 0 ? mapSession(rows[0]) : null;
}

export async function getActiveProductivitySession(
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession | null> {
  const [rows] = await pool.execute<ProductivitySessionRow[]>(
    `
      ${sessionSelect}
      WHERE status IN ('running', 'paused')
      LIMIT 1
    `
  );

  return rows.length > 0 ? mapSession(rows[0]) : null;
}

export async function getProductivitySessions(
  limit = 20,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));

  const [rows] = await pool.execute<ProductivitySessionRow[]>(
    `
      ${sessionSelect}
      ORDER BY started_at DESC
      LIMIT ?
    `,
    [safeLimit]
  );

  return rows.map(mapSession);
}

export async function getTodayProductivitySessions(
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession[]> {
  const [rows] = await pool.execute<ProductivitySessionRow[]>(`
    ${sessionSelect}
    WHERE DATE(started_at) = CURDATE()
    ORDER BY started_at DESC
  `);

  return rows.map(mapSession);
}

export async function pauseProductivitySession(
  id: string,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession | null> {
  await pool.execute(
    `
      UPDATE productivity_sessions
      SET
        elapsed_seconds = elapsed_seconds +
          TIMESTAMPDIFF(
            SECOND,
            segment_started_at,
            NOW(3)
          ),
        segment_started_at = NULL,
        status = 'paused'
      WHERE id = ?
        AND status = 'running'
        AND segment_started_at IS NOT NULL
    `,
    [id]
  );

  return getProductivitySessionById(id, pool);
}

export async function resumeProductivitySession(
  id: string,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession | null> {
  await pool.execute(
    `
      UPDATE productivity_sessions
      SET
        segment_started_at = NOW(3),
        status = 'running'
      WHERE id = ?
        AND status = 'paused'
    `,
    [id]
  );

  return getProductivitySessionById(id, pool);
}

export async function completeProductivitySession(
  id: string,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession | null> {
  await pool.execute(
    `
      UPDATE productivity_sessions
      SET
        elapsed_seconds = elapsed_seconds +
          CASE
            WHEN status = 'running'
              AND segment_started_at IS NOT NULL
            THEN TIMESTAMPDIFF(
              SECOND,
              segment_started_at,
              NOW(3)
            )
            ELSE 0
          END,
        segment_started_at = NULL,
        ended_at = NOW(3),
        status = 'completed'
      WHERE id = ?
        AND status IN ('running', 'paused')
    `,
    [id]
  );

  return getProductivitySessionById(id, pool);
}

export async function cancelProductivitySession(
  id: string,
  pool: Pool = getDatabasePool()
): Promise<ProductivitySession | null> {
  await pool.execute(
    `
      UPDATE productivity_sessions
      SET
        elapsed_seconds = elapsed_seconds +
          CASE
            WHEN status = 'running'
              AND segment_started_at IS NOT NULL
            THEN TIMESTAMPDIFF(
              SECOND,
              segment_started_at,
              NOW(3)
            )
            ELSE 0
          END,
        segment_started_at = NULL,
        ended_at = NOW(3),
        status = 'cancelled'
      WHERE id = ?
        AND status IN ('running', 'paused')
    `,
    [id]
  );

  return getProductivitySessionById(id, pool);
}

export async function getProductivitySummary(
  pool: Pool = getDatabasePool()
): Promise<ProductivitySummary> {
  const [statsRows] = await pool.execute<ProductivityStatsRow[]>(`
    SELECT
      COALESCE(
        SUM(
          CASE
            WHEN session_type = 'focus'
              AND status = 'completed'
              AND DATE(started_at) = CURDATE()
            THEN elapsed_seconds
            ELSE 0
          END
        ),
        0
      ) AS today_focus_seconds,

      COUNT(
        CASE
          WHEN DATE(started_at) = CURDATE()
          THEN 1
        END
      ) AS today_sessions,

      COUNT(
        CASE
          WHEN DATE(started_at) = CURDATE()
            AND status = 'completed'
          THEN 1
        END
      ) AS today_completed_sessions,

      COALESCE(
        SUM(
          CASE
            WHEN session_type = 'focus'
              AND status = 'completed'
              AND started_at >= DATE_SUB(
                CURDATE(),
                INTERVAL 6 DAY
              )
            THEN elapsed_seconds
            ELSE 0
          END
        ),
        0
      ) AS weekly_focus_seconds

    FROM productivity_sessions
  `);

  const [dailyRows] = await pool.execute<DailyFocusRow[]>(`
    SELECT
      DATE_FORMAT(started_at, '%Y-%m-%d') AS session_date,
      COALESCE(SUM(elapsed_seconds), 0) AS focus_seconds

    FROM productivity_sessions

    WHERE session_type = 'focus'
      AND status = 'completed'
      AND started_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)

    GROUP BY DATE(started_at)
    ORDER BY DATE(started_at) ASC
  `);

  const stats = statsRows[0];

  const dailyFocus: DailyFocusSummary[] = dailyRows.map((row) => ({
    date: String(row.session_date).slice(0, 10),
    focusMinutes: Math.floor(Number(row.focus_seconds) / 60)
  }));

  return {
    todayFocusMinutes: Math.floor(
      Number(stats.today_focus_seconds) / 60
    ),
    todaySessions: Number(stats.today_sessions),
    todayCompletedSessions: Number(
      stats.today_completed_sessions
    ),
    weeklyFocusMinutes: Math.floor(
      Number(stats.weekly_focus_seconds) / 60
    ),
    dailyFocus
  };
}
