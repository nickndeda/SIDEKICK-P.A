
import type { Pool } from 'mysql2/promise';

export const name = '002_create_deleted_tasks';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_tasks (
      archive_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      original_task_id BIGINT UNSIGNED NOT NULL,

      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      priority VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL,

      due_at DATETIME NULL,
      completed_at DATETIME NULL,

      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

      deleted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (archive_id),
      INDEX idx_deleted_original_task_id (original_task_id),
      INDEX idx_deleted_at (deleted_at)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);
}
