
import 'dotenv/config';

import mysql from 'mysql2/promise';
import type { Pool, RowDataPacket } from 'mysql2/promise';

interface DatabaseInfo extends RowDataPacket {
  databaseName: string;
  serverVersion: string;
}

const port = Number(process.env.DB_PORT ?? 3306);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid DB_PORT configuration.');
}

const databasePool: Pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port,
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'sidekick_dev',

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  charset: 'utf8mb4',
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Returns the shared database connection pool.
 */
export function getDatabasePool(): Pool {
  return databasePool;
}

/**
 * Tests the connection and returns database information.
 */
export async function testDatabaseConnection(): Promise<DatabaseInfo> {
  const connection = await databasePool.getConnection();

  try {
    const [rows] = await connection.query<DatabaseInfo[]>(
      'SELECT DATABASE() AS databaseName, VERSION() AS serverVersion'
    );

    return rows[0];
  } finally {
    connection.release();
  }
}

/**
 * Closes all connections in the pool.
 */
export async function closeDatabaseConnection(): Promise<void> {
  await databasePool.end();
}
