import type { Pool } from 'mysql2/promise';

export const name = '004_link_productivity_sessions_to_tasks';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE productivity_sessions
      ADD COLUMN task_id BIGINT UNSIGNED NULL AFTER id,
      ADD INDEX idx_productivity_task_id (task_id),
      ADD CONSTRAINT fk_productivity_task
        FOREIGN KEY (task_id) REFERENCES tasks(id)
        ON DELETE SET NULL
  `);
}
