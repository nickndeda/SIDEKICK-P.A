import type { Pool } from 'mysql2/promise';

export const name = '005_create_wellness_tables';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wellness_settings (
      category ENUM('hydration', 'movement', 'eye_rest', 'sleep', 'general') NOT NULL,
      settings_json LONGTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (category)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS hydration_entries (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      amount_ml SMALLINT UNSIGNED NOT NULL,
      recorded_at DATETIME(3) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_hydration_recorded_at (recorded_at)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wellness_breaks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      break_type ENUM('movement', 'eye_rest') NOT NULL,
      completed_at DATETIME(3) NOT NULL,
      duration_seconds SMALLINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_wellness_break_type_time (break_type, completed_at)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sleep_records (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sleep_started_at DATETIME(3) NULL,
      wake_up_at DATETIME(3) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CHECK (sleep_started_at IS NOT NULL OR wake_up_at IS NOT NULL),
      INDEX idx_sleep_started_at (sleep_started_at),
      INDEX idx_sleep_wake_up_at (wake_up_at)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wellness_reminders (
      id CHAR(36) NOT NULL,
      category ENUM('hydration', 'movement', 'eye_rest', 'bedtime', 'wake_up') NOT NULL,
      title VARCHAR(120) NOT NULL,
      description VARCHAR(500) NOT NULL,
      priority ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal',
      scheduled_at DATETIME(3) NOT NULL,
      status ENUM('scheduled', 'notified', 'snoozed', 'completed', 'dismissed')
        NOT NULL DEFAULT 'scheduled',
      snoozed_until DATETIME(3) NULL,
      completed_at DATETIME(3) NULL,
      dismissed_at DATETIME(3) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_wellness_reminder_occurrence (category, scheduled_at),
      INDEX idx_wellness_reminder_due (status, scheduled_at, snoozed_until)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);
}
