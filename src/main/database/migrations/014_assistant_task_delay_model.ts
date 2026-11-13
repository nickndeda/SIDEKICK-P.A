import type { Pool, RowDataPacket } from 'mysql2/promise';

export const name = '014_assistant_task_delay_model';

export async function up(pool: Pool): Promise<void> {
  const [column]=await pool.query<Array<RowDataPacket & {COLUMN_NAME:string}>>("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='assistant_preferences' AND COLUMN_NAME='task_prediction_enabled'");
  if(!column[0]) await pool.query('ALTER TABLE assistant_preferences ADD COLUMN task_prediction_enabled BOOLEAN NOT NULL DEFAULT FALSE');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assistant_task_delay_models (
      id CHAR(36) NOT NULL,
      model_version INT UNSIGNED NOT NULL,
      feature_version SMALLINT UNSIGNED NOT NULL,
      weights_json JSON NOT NULL,
      sample_count INT UNSIGNED NOT NULL,
      late_count INT UNSIGNED NOT NULL,
      on_time_count INT UNSIGNED NOT NULL,
      model_brier DECIMAL(8,6) NOT NULL,
      baseline_brier DECIMAL(8,6) NOT NULL,
      data_start DATETIME(3) NOT NULL,
      data_end DATETIME(3) NOT NULL,
      trained_at DATETIME(3) NOT NULL,
      state ENUM('active','retired') NOT NULL DEFAULT 'active',
      active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN state='active' THEN 1 ELSE NULL END) STORED,
      PRIMARY KEY (id),
      UNIQUE KEY uq_assistant_delay_model_version (model_version),
      UNIQUE KEY uq_assistant_delay_model_active (active_slot),
      INDEX idx_assistant_delay_model_trained (trained_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}
