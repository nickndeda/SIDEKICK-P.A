import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '013_assistant_actions_feedback';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_action_proposals (
      id CHAR(36) NOT NULL,
      conversation_id CHAR(36) NOT NULL,
      action_type ENUM('task.create') NOT NULL,
      proposal_json JSON NOT NULL,
      proposal_hash CHAR(64) NOT NULL,
      status ENUM('pending','executed','rejected','expired') NOT NULL DEFAULT 'pending',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      expires_at DATETIME(3) NOT NULL,
      reviewed_at DATETIME(3) NULL,
      result_entity_id BIGINT UNSIGNED NULL,
      PRIMARY KEY (id),
      INDEX idx_assistant_proposal_pending (status,expires_at,created_at),
      CONSTRAINT fk_assistant_proposal_conversation FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_feedback (
      id CHAR(36) NOT NULL,
      message_id CHAR(36) NOT NULL,
      feedback ENUM('helpful','not_helpful') NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (id),
      UNIQUE KEY uq_assistant_message_feedback (message_id),
      CONSTRAINT fk_assistant_feedback_message FOREIGN KEY (message_id) REFERENCES assistant_messages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  const [column]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND COLUMN_NAME='assistant_proposal_id'");
  if(!column[0]) await pool.query('ALTER TABLE tasks ADD COLUMN assistant_proposal_id CHAR(36) NULL');
  const [index]=await pool.query<Array<RowDataPacket & {INDEX_NAME:string}>>("SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND INDEX_NAME='uq_task_assistant_proposal'");
  if(!index[0]) await pool.query('ALTER TABLE tasks ADD UNIQUE KEY uq_task_assistant_proposal (assistant_proposal_id)');
  const [constraint]=await pool.query<Array<RowDataPacket & {CONSTRAINT_NAME:string}>>("SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND CONSTRAINT_NAME='fk_task_assistant_proposal'");
  if(!constraint[0]) await pool.query('ALTER TABLE tasks ADD CONSTRAINT fk_task_assistant_proposal FOREIGN KEY (assistant_proposal_id) REFERENCES assistant_action_proposals(id) ON DELETE SET NULL');
}
