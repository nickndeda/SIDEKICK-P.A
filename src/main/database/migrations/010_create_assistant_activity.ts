import type { Pool } from 'mysql2/promise';

export const name = '010_create_assistant_activity';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_preferences (
      id TINYINT UNSIGNED NOT NULL,
      monitoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT chk_assistant_preferences_singleton CHECK (id = 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.execute('INSERT IGNORE INTO assistant_preferences(id,monitoring_enabled) VALUES(1,TRUE)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_activity (
      id CHAR(36) NOT NULL,
      dedupe_key VARCHAR(220) NOT NULL,
      event_type VARCHAR(80) NOT NULL,
      severity ENUM('info','normal','high','critical') NOT NULL DEFAULT 'normal',
      title VARCHAR(180) NOT NULL,
      description TEXT NOT NULL,
      payload_json LONGTEXT NULL,
      status ENUM('unread','read','dismissed') NOT NULL DEFAULT 'unread',
      notification_sent_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      read_at DATETIME(3) NULL,
      dismissed_at DATETIME(3) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_assistant_activity_dedupe (dedupe_key),
      INDEX idx_assistant_activity_status_time (status,created_at),
      INDEX idx_assistant_activity_notification (notification_sent_at,status,created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}
