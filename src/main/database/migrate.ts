
import type { Pool, RowDataPacket } from 'mysql2/promise';

import { getDatabasePool } from './connection';

import * as createTasksMigration from './migrations/001_create_tasks';
import * as createDeletedTasksMigration from './migrations/002_create_deleted_tasks';
import * as createProductivityMigration from './migrations/003_create_productivity_tables';
import * as linkProductivitySessionsToTasks from './migrations/004_link_productivity_sessions_to_tasks';
import * as createWellnessTables from './migrations/005_create_wellness_tables';
import * as createFinanceTables from './migrations/006_create_finance_tables';
import * as expandFinanceManagement from './migrations/007_expand_finance_management';
import * as anchorBillRecurrence from './migrations/008_anchor_bill_recurrence';
import * as createLearningTables from './migrations/009_create_learning_tables';
import * as createAssistantActivity from './migrations/010_create_assistant_activity';
import * as assistantConversations from './migrations/011_assistant_conversations';
import * as orderAssistantMessages from './migrations/012_order_assistant_messages';

interface AppliedMigration extends RowDataPacket {
  name: string;
}

const migrations = [
  createTasksMigration,
  createDeletedTasksMigration,
  createProductivityMigration,
  linkProductivitySessionsToTasks,
  createWellnessTables,
  createFinanceTables,
  expandFinanceManagement,
  anchorBillRecurrence,
  createLearningTables,
  createAssistantActivity,
  assistantConversations,
  orderAssistantMessages
];

export async function runMigrations(
  pool: Pool = getDatabasePool()
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY (id),
      UNIQUE KEY uq_migration_name (name)
    ) ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
      COLLATE=utf8mb4_unicode_ci;
  `);

  const [rows] = await pool.query<AppliedMigration[]>(
    'SELECT name FROM schema_migrations'
  );

  const appliedNames = new Set(rows.map((row) => row.name));

  for (const migration of migrations) {
    if (appliedNames.has(migration.name)) {
      console.log(`Migration already applied: ${migration.name}`);
      continue;
    }

    console.log(`Applying migration: ${migration.name}`);

    await migration.up(pool);

    await pool.execute(
      'INSERT INTO schema_migrations (name) VALUES (?)',
      [migration.name]
    );

    console.log(`Migration completed: ${migration.name}`);
  }
}
