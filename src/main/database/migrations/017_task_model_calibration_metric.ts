import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name='017_task_model_calibration_metric';

export async function up(pool:Pool):Promise<void>{
  const [column]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_task_delay_models' AND COLUMN_NAME='calibration_error'");
  if(!column[0])await pool.query('ALTER TABLE assistant_task_delay_models ADD COLUMN calibration_error DECIMAL(8,6) NOT NULL DEFAULT 0');
}
