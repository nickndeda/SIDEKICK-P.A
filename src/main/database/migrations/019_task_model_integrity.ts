import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name='019_task_model_integrity';

export async function up(pool:Pool):Promise<void>{
  const [column]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_task_delay_models' AND COLUMN_NAME='artifact_sha256'");
  if(!column[0])await pool.query('ALTER TABLE assistant_task_delay_models ADD COLUMN artifact_sha256 CHAR(64) NULL AFTER weights_json');
}
