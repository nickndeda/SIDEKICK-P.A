import type { Pool } from 'mysql2/promise';

export const name = '009_create_learning_tables';

export async function up(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_subjects (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(140) NOT NULL,
      subject_code VARCHAR(40) NULL,
      description TEXT NULL,
      category VARCHAR(80) NULL,
      target_weekly_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      start_date DATE NULL,
      end_date DATE NULL,
      status ENUM('active','completed','archived') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_subject_status (status,name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_topics (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      subject_id BIGINT UNSIGNED NOT NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NULL,
      difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
      status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started',
      estimated_minutes SMALLINT UNSIGNED NULL,
      progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
      last_studied_at DATETIME(3) NULL,
      next_revision_at DATETIME(3) NULL,
      archived_at DATETIME(3) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_topics_subject_status (subject_id,status,archived_at),
      INDEX idx_learning_topics_revision (next_revision_at,archived_at),
      CONSTRAINT fk_learning_topic_subject FOREIGN KEY (subject_id) REFERENCES learning_subjects(id) ON DELETE RESTRICT,
      CHECK (progress_percent <= 100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id CHAR(36) NOT NULL,
      subject_id BIGINT UNSIGNED NOT NULL,
      topic_id BIGINT UNSIGNED NULL,
      title VARCHAR(180) NOT NULL,
      notes TEXT NULL,
      status ENUM('running','paused','completed','cancelled') NOT NULL,
      started_at DATETIME(3) NOT NULL,
      ended_at DATETIME(3) NULL,
      elapsed_seconds INT UNSIGNED NOT NULL DEFAULT 0,
      segment_started_at DATETIME(3) NULL,
      active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status IN ('running','paused') THEN 1 ELSE NULL END) STORED,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_learning_single_active_session (active_slot),
      INDEX idx_learning_session_subject_time (subject_id,started_at),
      INDEX idx_learning_session_topic_time (topic_id,started_at),
      CONSTRAINT fk_learning_session_subject FOREIGN KEY (subject_id) REFERENCES learning_subjects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_learning_session_topic FOREIGN KEY (topic_id) REFERENCES learning_topics(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_notes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      subject_id BIGINT UNSIGNED NULL,
      topic_id BIGINT UNSIGNED NULL,
      title VARCHAR(180) NOT NULL,
      body MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_note_subject (subject_id,updated_at),
      INDEX idx_learning_note_topic (topic_id,updated_at),
      CONSTRAINT fk_learning_note_subject FOREIGN KEY (subject_id) REFERENCES learning_subjects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_learning_note_topic FOREIGN KEY (topic_id) REFERENCES learning_topics(id) ON DELETE RESTRICT,
      CHECK (subject_id IS NOT NULL OR topic_id IS NOT NULL)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_resources (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      subject_id BIGINT UNSIGNED NOT NULL,
      topic_id BIGINT UNSIGNED NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NULL,
      resource_type ENUM('link','document','text_note','other') NOT NULL,
      url VARCHAR(2048) NULL,
      local_path VARCHAR(2048) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_resource_subject (subject_id,updated_at),
      CONSTRAINT fk_learning_resource_subject FOREIGN KEY (subject_id) REFERENCES learning_subjects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_learning_resource_topic FOREIGN KEY (topic_id) REFERENCES learning_topics(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_quizzes (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      subject_id BIGINT UNSIGNED NOT NULL,
      topic_id BIGINT UNSIGNED NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NULL,
      time_limit_minutes SMALLINT UNSIGNED NULL,
      passing_percent TINYINT UNSIGNED NULL,
      status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_quiz_subject (subject_id,status,updated_at),
      CONSTRAINT fk_learning_quiz_subject FOREIGN KEY (subject_id) REFERENCES learning_subjects(id) ON DELETE RESTRICT,
      CONSTRAINT fk_learning_quiz_topic FOREIGN KEY (topic_id) REFERENCES learning_topics(id) ON DELETE RESTRICT,
      CHECK (passing_percent IS NULL OR passing_percent <= 100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_questions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      quiz_id BIGINT UNSIGNED NOT NULL,
      question_text TEXT NOT NULL,
      question_type ENUM('multiple_choice','true_false','short_answer') NOT NULL,
      options_json LONGTEXT NULL,
      correct_answer VARCHAR(1000) NOT NULL,
      explanation TEXT NULL,
      points SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      question_order SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_question_order (quiz_id,question_order),
      CONSTRAINT fk_learning_question_quiz FOREIGN KEY (quiz_id) REFERENCES learning_quizzes(id) ON DELETE RESTRICT,
      CHECK (points > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_attempts (
      id CHAR(36) NOT NULL,
      quiz_id BIGINT UNSIGNED NOT NULL,
      status ENUM('in_progress','submitted','abandoned') NOT NULL DEFAULT 'in_progress',
      started_at DATETIME(3) NOT NULL,
      submitted_at DATETIME(3) NULL,
      score DECIMAL(10,2) NULL,
      max_score DECIMAL(10,2) NULL,
      percentage DECIMAL(6,2) NULL,
      result_status ENUM('passed','not_passed') NULL,
      active_slot TINYINT GENERATED ALWAYS AS (CASE WHEN status='in_progress' THEN 1 ELSE NULL END) STORED,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_learning_active_quiz_attempt (quiz_id,active_slot),
      INDEX idx_learning_attempt_quiz_time (quiz_id,started_at),
      CONSTRAINT fk_learning_attempt_quiz FOREIGN KEY (quiz_id) REFERENCES learning_quizzes(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_answers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      attempt_id CHAR(36) NOT NULL,
      question_id BIGINT UNSIGNED NOT NULL,
      answer_text TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL DEFAULT FALSE,
      awarded_points DECIMAL(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_learning_attempt_answer (attempt_id,question_id),
      CONSTRAINT fk_learning_answer_attempt FOREIGN KEY (attempt_id) REFERENCES learning_attempts(id) ON DELETE RESTRICT,
      CONSTRAINT fk_learning_answer_question FOREIGN KEY (question_id) REFERENCES learning_questions(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_revisions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      topic_id BIGINT UNSIGNED NOT NULL,
      due_at DATETIME(3) NOT NULL,
      reviewed_at DATETIME(3) NULL,
      grade ENUM('again','difficult','fair','good','easy') NULL,
      status ENUM('scheduled','completed','dismissed') NOT NULL DEFAULT 'scheduled',
      reminder_sent_at DATETIME(3) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), UNIQUE KEY uq_learning_revision_cycle (topic_id,due_at),
      INDEX idx_learning_revision_due (status,due_at),
      CONSTRAINT fk_learning_revision_topic FOREIGN KEY (topic_id) REFERENCES learning_topics(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS learning_goals (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      subject_id BIGINT UNSIGNED NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NULL,
      goal_type ENUM('study_minutes','completed_topics','revisions') NOT NULL,
      target_value INT UNSIGNED NOT NULL,
      start_date DATE NOT NULL,
      deadline DATE NULL,
      status ENUM('active','completed','archived') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id), INDEX idx_learning_goal_status (status,deadline),
      CONSTRAINT fk_learning_goal_subject FOREIGN KEY (subject_id) REFERENCES learning_subjects(id) ON DELETE RESTRICT,
      CHECK (target_value > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}
