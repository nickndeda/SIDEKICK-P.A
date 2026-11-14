import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '020_assistant_context_sources';

const contextColumns = [
  ['assistant_context_planner', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['assistant_context_productivity', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['assistant_context_wellness', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['assistant_context_finance', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['assistant_context_learning', 'BOOLEAN NOT NULL DEFAULT TRUE']
] as const;

export async function up(pool: Pool): Promise<void> {
  for (const [column, definition] of contextColumns) {
    const [rows] = await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_preferences' AND COLUMN_NAME=?",
      [column]
    );
    if (!rows[0]) await pool.query(`ALTER TABLE assistant_preferences ADD COLUMN ${column} ${definition}`);
  }
}
