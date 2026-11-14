import type { Pool } from 'mysql2/promise';

export const name='021_assistant_reasoning_audit';

export async function up(pool:Pool):Promise<void>{
  await pool.query(`CREATE TABLE IF NOT EXISTS assistant_reasoning_decisions(
    id CHAR(36) NOT NULL,
    trigger_source ENUM('event','scheduler','manual') NOT NULL,
    outcome ENUM('no_evidence','no_action','recommendation','deduped','stale','failed') NOT NULL,
    model_name VARCHAR(120) NOT NULL,
    evidence_ids_json JSON NULL,
    activity_id CHAR(36) NULL,
    error_code VARCHAR(64) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY(id),
    INDEX idx_assistant_reasoning_history(created_at,outcome),
    CONSTRAINT fk_assistant_reasoning_activity FOREIGN KEY(activity_id) REFERENCES assistant_activity(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
