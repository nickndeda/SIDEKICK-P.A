
import type { Pool } from 'mysql2/promise';

export const name = '001_create_tasks';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

      title VARCHAR(200) NOT NULL,
      description TEXT NULL,

      priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      status VARCHAR(20) NOT NULL DEFAULT 'pending',

      due_at DATETIME NULL,
      completed_at DATETIME NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      PRIMARY KEY (id),

      INDEX idx_tasks_status (status),
      INDEX idx_tasks_priority (priority),
      INDEX idx_tasks_due_at (due_at),
      INDEX idx_tasks_created_at (created_at)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);
}
