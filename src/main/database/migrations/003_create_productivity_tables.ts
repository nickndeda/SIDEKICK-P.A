
import type { Pool } from 'mysql2/promise';

export const name = '003_create_productivity_tables';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS productivity_sessions (
      id CHAR(36) NOT NULL,
      title VARCHAR(160) NOT NULL,

      session_type ENUM(
        'focus',
        'short_break',
        'long_break'
      ) NOT NULL DEFAULT 'focus',

      target_minutes SMALLINT UNSIGNED NOT NULL,

      status ENUM(
        'running',
        'paused',
        'completed',
        'cancelled'
      ) NOT NULL DEFAULT 'running',

      started_at DATETIME(3) NOT NULL,
      segment_started_at DATETIME(3) NULL,
      ended_at DATETIME(3) NULL,

      elapsed_seconds INT UNSIGNED NOT NULL DEFAULT 0,

      active_session_slot TINYINT
        GENERATED ALWAYS AS (
          CASE
            WHEN status IN ('running', 'paused') THEN 1
            ELSE NULL
          END
        ) PERSISTENT,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      UNIQUE KEY uq_productivity_one_active_session (
        active_session_slot
      ),

      INDEX idx_productivity_started_at (started_at),
      INDEX idx_productivity_status (status),
      INDEX idx_productivity_type (session_type)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci;
  `);
}
