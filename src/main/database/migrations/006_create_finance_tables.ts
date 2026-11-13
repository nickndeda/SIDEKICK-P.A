import type { Pool } from 'mysql2/promise';

export const name = '006_create_finance_tables';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_settings (
      id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
      currency_code CHAR(3) NOT NULL DEFAULT 'KES',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CHECK (id = 1)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query("INSERT IGNORE INTO finance_settings (id, currency_code) VALUES (1, 'KES')");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_categories (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(80) NOT NULL,
      category_type ENUM('income','expense') NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_finance_category_name_type (name, category_type),
      INDEX idx_finance_category_active (category_type, is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  const categories: [string, 'income'|'expense'][] = [
    ['Salary','income'],['Freelance','income'],['Investment','income'],['Other income','income'],
    ['Housing','expense'],['Food','expense'],['Transport','expense'],['Utilities','expense'],
    ['Health','expense'],['Education','expense'],['Entertainment','expense'],['Shopping','expense'],['Subscriptions','expense'],['Other expense','expense']
  ];
  for (const [name, type] of categories) {
    await pool.execute('INSERT IGNORE INTO finance_categories (name, category_type, is_default) VALUES (?, ?, TRUE)', [name,type]);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      transaction_type ENUM('income','expense','transfer') NOT NULL,
      amount_minor BIGINT UNSIGNED NOT NULL,
      currency_code CHAR(3) NOT NULL,
      category_id BIGINT UNSIGNED NULL,
      description VARCHAR(180) NOT NULL,
      transaction_date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_finance_transactions_date_type (transaction_date, transaction_type),
      INDEX idx_finance_transactions_category_date (category_id, transaction_date),
      CONSTRAINT fk_finance_transaction_category FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE RESTRICT,
      CHECK (amount_minor > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_budgets (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      amount_minor BIGINT UNSIGNED NOT NULL,
      currency_code CHAR(3) NOT NULL,
      category_id BIGINT UNSIGNED NULL,
      period_year SMALLINT UNSIGNED NOT NULL,
      period_month TINYINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_finance_budget_period (period_year, period_month),
      CONSTRAINT fk_finance_budget_category FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE RESTRICT,
      CHECK (amount_minor > 0), CHECK (period_month BETWEEN 1 AND 12)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_recurring_bills (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      amount_minor BIGINT UNSIGNED NOT NULL,
      currency_code CHAR(3) NOT NULL,
      category_id BIGINT UNSIGNED NOT NULL,
      frequency ENUM('weekly','monthly','quarterly','annually','custom') NOT NULL,
      interval_days SMALLINT UNSIGNED NULL,
      next_due_date DATE NOT NULL,
      reminder_days_before TINYINT UNSIGNED NOT NULL DEFAULT 3,
      status ENUM('active','paused','archived') NOT NULL DEFAULT 'active',
      notes VARCHAR(500) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_finance_bill_due (status, next_due_date),
      CONSTRAINT fk_finance_bill_category FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE RESTRICT,
      CHECK (amount_minor > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_bill_payments (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      recurring_bill_id BIGINT UNSIGNED NOT NULL,
      transaction_id BIGINT UNSIGNED NOT NULL,
      amount_minor BIGINT UNSIGNED NOT NULL,
      currency_code CHAR(3) NOT NULL,
      due_date DATE NOT NULL,
      payment_date DATE NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_finance_bill_payment_occurrence (recurring_bill_id, due_date),
      UNIQUE KEY uq_finance_bill_payment_transaction (transaction_id),
      CONSTRAINT fk_finance_payment_bill FOREIGN KEY (recurring_bill_id) REFERENCES finance_recurring_bills(id) ON DELETE RESTRICT,
      CONSTRAINT fk_finance_payment_transaction FOREIGN KEY (transaction_id) REFERENCES finance_transactions(id) ON DELETE RESTRICT,
      CHECK (amount_minor > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_savings_goals (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      target_minor BIGINT UNSIGNED NOT NULL,
      currency_code CHAR(3) NOT NULL,
      target_date DATE NULL,
      status ENUM('active','paused','completed','archived') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_finance_goal_status (status), CHECK (target_minor > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finance_savings_contributions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      goal_id BIGINT UNSIGNED NOT NULL,
      amount_minor BIGINT UNSIGNED NOT NULL,
      contribution_date DATE NOT NULL,
      description VARCHAR(180) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_finance_contribution_goal_date (goal_id, contribution_date),
      CONSTRAINT fk_finance_contribution_goal FOREIGN KEY (goal_id) REFERENCES finance_savings_goals(id) ON DELETE RESTRICT,
      CHECK (amount_minor > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const [categoryColumns] = await pool.query<Array<{ COLUMN_TYPE: string } & import('mysql2/promise').RowDataPacket>>(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wellness_reminders' AND COLUMN_NAME='category'`
  );
  if (categoryColumns[0] && !categoryColumns[0].COLUMN_TYPE.includes('finance_bill')) {
    await pool.query(`ALTER TABLE wellness_reminders MODIFY category ENUM('hydration','movement','eye_rest','bedtime','wake_up','finance_bill') NOT NULL`);
  }
  const [billColumns] = await pool.query<Array<{ COLUMN_NAME: string } & import('mysql2/promise').RowDataPacket>>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wellness_reminders' AND COLUMN_NAME='finance_bill_id'`
  );
  if (!billColumns[0]) await pool.query(`ALTER TABLE wellness_reminders ADD COLUMN finance_bill_id BIGINT UNSIGNED NULL`);
  const [billIndexes] = await pool.query<Array<{ INDEX_NAME: string } & import('mysql2/promise').RowDataPacket>>(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='wellness_reminders' AND INDEX_NAME='uq_wellness_finance_bill_occurrence'`
  );
  if (!billIndexes[0]) await pool.query(`ALTER TABLE wellness_reminders ADD UNIQUE KEY uq_wellness_finance_bill_occurrence (finance_bill_id, scheduled_at)`);
  const [billConstraints] = await pool.query<Array<{ CONSTRAINT_NAME: string } & import('mysql2/promise').RowDataPacket>>(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='wellness_reminders' AND CONSTRAINT_NAME='fk_wellness_finance_bill'`
  );
  if (!billConstraints[0]) await pool.query(`ALTER TABLE wellness_reminders ADD CONSTRAINT fk_wellness_finance_bill FOREIGN KEY (finance_bill_id) REFERENCES finance_recurring_bills(id) ON DELETE CASCADE`);
}
