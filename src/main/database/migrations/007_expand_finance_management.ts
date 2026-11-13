import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '007_expand_finance_management';

async function addColumn(pool: Pool, table: string, column: string, definition: string): Promise<void> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [table, column]
  );
  if (!rows.length) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

export async function up(pool: Pool): Promise<void> {
  const defaults: [string, 'income'|'expense'][] = [
    ['Business','income'],['Allowance','income'],['Investment income','income'],['Gifts','income'],
    ['Rent','expense'],['Internet','expense'],['Personal care','expense'],['Savings contributions','expense']
  ];
  for (const [name,type] of defaults) await pool.execute('INSERT IGNORE INTO finance_categories(name,category_type,is_default) VALUES(?,?,TRUE)',[name,type]);
  await addColumn(pool, 'finance_transactions', 'merchant', 'VARCHAR(180) NULL');
  await addColumn(pool, 'finance_transactions', 'payment_method', 'VARCHAR(60) NULL');
  await addColumn(pool, 'finance_budgets', 'category_scope', 'BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(category_id,0)) STORED');
  const [budgetIndex] = await pool.execute<RowDataPacket[]>(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='finance_budgets' AND INDEX_NAME='uq_finance_budget_scope_month'`
  );
  if (!budgetIndex.length) await pool.query('ALTER TABLE finance_budgets ADD UNIQUE KEY uq_finance_budget_scope_month (period_year, period_month, category_scope)');
  await pool.query(`ALTER TABLE finance_recurring_bills MODIFY frequency ENUM('weekly','monthly','bimonthly','quarterly','annually','custom') NOT NULL`);
  await addColumn(pool, 'finance_recurring_bills', 'start_date', 'DATE NULL');
  await addColumn(pool, 'finance_recurring_bills', 'end_date', 'DATE NULL');
  await addColumn(pool, 'finance_recurring_bills', 'recurrence_day', 'TINYINT UNSIGNED NULL');
  await pool.query('UPDATE finance_recurring_bills SET recurrence_day=DAY(next_due_date) WHERE recurrence_day IS NULL');
  await addColumn(pool, 'finance_bill_payments', 'notes', 'VARCHAR(500) NULL');
  await addColumn(pool, 'finance_savings_goals', 'description', 'VARCHAR(500) NULL');
  await addColumn(pool, 'finance_savings_contributions', 'updated_at', 'TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
}
