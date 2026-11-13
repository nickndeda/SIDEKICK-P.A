import type { Pool } from 'mysql2/promise';

export const name = '012_order_assistant_messages';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`ALTER TABLE assistant_messages
    ADD COLUMN message_order BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE AFTER id`);
}
