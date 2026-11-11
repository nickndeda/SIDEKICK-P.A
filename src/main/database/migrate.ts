
import type { Pool, RowDataPacket } from 'mysql2/promise';

import { getDatabasePool } from './connection';

import * as createTasksMigration from './migrations/001_create_tasks';
import * as createDeletedTasksMigration from './migrations/002_create_deleted_tasks';

interface AppliedMigration extends RowDataPacket {
  name: string;
}

const migrations = [
  createTasksMigration,
  createDeletedTasksMigration
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
