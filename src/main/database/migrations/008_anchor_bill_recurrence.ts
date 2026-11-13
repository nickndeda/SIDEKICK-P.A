import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '008_anchor_bill_recurrence';

export async function up(pool: Pool): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='finance_recurring_bills' AND COLUMN_NAME='recurrence_day'`
  );
  if (!rows.length) await pool.query('ALTER TABLE finance_recurring_bills ADD COLUMN recurrence_day TINYINT UNSIGNED NULL');
  await pool.query('UPDATE finance_recurring_bills SET recurrence_day=DAY(next_due_date) WHERE recurrence_day IS NULL');
}
