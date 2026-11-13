import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name='018_assistant_memory_expiry';

export async function up(pool:Pool):Promise<void>{
  const [column]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_memories' AND COLUMN_NAME='expires_at'");
  if(!column[0])await pool.query('ALTER TABLE assistant_memories ADD COLUMN expires_at DATETIME(3) NULL AFTER enabled');
}
