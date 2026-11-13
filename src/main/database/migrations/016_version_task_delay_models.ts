import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '016_version_task_delay_models';

export async function up(pool: Pool): Promise<void> {
  const [column]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_task_delay_models' AND COLUMN_NAME='model_version'");
  if(!column[0]) await pool.query('ALTER TABLE assistant_task_delay_models ADD COLUMN model_version INT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE FIRST');
  const [index]=await pool.query<Array<RowDataPacket & {INDEX_NAME:string}>>("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_task_delay_models' AND INDEX_NAME='uq_assistant_delay_model_version'");
  if(!index[0]) await pool.query('ALTER TABLE assistant_task_delay_models ADD UNIQUE KEY uq_assistant_delay_model_version (model_version)');
}
