import type { Pool } from 'mysql2/promise';

export const name = '011_assistant_conversations';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    ALTER TABLE assistant_preferences
      ADD COLUMN local_model_url VARCHAR(255) NOT NULL DEFAULT 'http://127.0.0.1:11434',
      ADD COLUMN local_model_name VARCHAR(120) NOT NULL DEFAULT '',
      ADD COLUMN memory_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_conversations (
      id CHAR(36) NOT NULL,
      title VARCHAR(180) NOT NULL DEFAULT 'New conversation',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id), INDEX idx_assistant_conversation_updated (updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_messages (
      id CHAR(36) NOT NULL,
      conversation_id CHAR(36) NOT NULL,
      role ENUM('user','assistant') NOT NULL,
      content TEXT NOT NULL,
      provider VARCHAR(32) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id), INDEX idx_assistant_messages_conversation (conversation_id,created_at),
      CONSTRAINT fk_assistant_messages_conversation FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_memories (
      id CHAR(36) NOT NULL,
      label VARCHAR(120) NOT NULL,
      content VARCHAR(1000) NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id), INDEX idx_assistant_memories_enabled (enabled,updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}
