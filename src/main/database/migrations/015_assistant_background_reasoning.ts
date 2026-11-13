import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '015_assistant_background_reasoning';

export async function up(pool: Pool): Promise<void> {
  const [toggle]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_preferences' AND COLUMN_NAME='background_reasoning_enabled'");
  if(!toggle[0]) await pool.query('ALTER TABLE assistant_preferences ADD COLUMN background_reasoning_enabled BOOLEAN NOT NULL DEFAULT FALSE');
  const [attempt]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_preferences' AND COLUMN_NAME='last_ai_reasoning_attempt_at'");
  if(!attempt[0]) await pool.query('ALTER TABLE assistant_preferences ADD COLUMN last_ai_reasoning_attempt_at DATETIME(3) NULL');
}
