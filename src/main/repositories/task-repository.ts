
import type {
  ResultSetHeader,
  RowDataPacket
} from 'mysql2/promise';

import { getDatabasePool } from '../database/connection';

export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueAt?: Date | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueAt?: Date | null;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
}

interface TaskRow extends RowDataPacket {
  id: string | number;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapTask(row: TaskRow): Task {
  return {
    id: String(row.id),
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateTitle(title: string): string {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error('Task title cannot be empty.');
  }

  if (trimmedTitle.length > 200) {
    throw new Error('Task title cannot exceed 200 characters.');
  }

  return trimmedTitle;
}

function validatePriority(priority: string): void {
  const allowed: string[] = ['low', 'normal', 'high', 'critical'];

  if (!allowed.includes(priority)) {
    throw new Error('Invalid task priority.');
  }
}

function validateStatus(status: string): void {
  const allowed: string[] = [
    'pending',
    'in_progress',
    'completed',
    'cancelled'
  ];

  if (!allowed.includes(status)) {
    throw new Error('Invalid task status.');
  }
}

function validateDueDate(date: Date | null | undefined): void {
  if (date !== undefined && date !== null) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      throw new Error('Invalid task due date.');
    }
  }
}

const SELECT_TASK_COLUMNS = `
  id,
  title,
  description,
  priority,
  status,
  due_at,
  completed_at,
  created_at,
  updated_at
`;

export async function createTask(
  input: CreateTaskInput
): Promise<Task> {
  const title = validateTitle(input.title);
  const priority = input.priority ?? 'normal';
  const status = input.status ?? 'pending';
  const description = input.description?.trim() || null;
  const dueAt = input.dueAt ?? null;

  validatePriority(priority);
  validateStatus(status);
  validateDueDate(dueAt);

  const pool = getDatabasePool();

  const [result] = await pool.execute<ResultSetHeader>(
    `
      INSERT INTO tasks (
        title,
        description,
        priority,
        status,
        due_at
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [title, description, priority, status, dueAt]
  );

  const task = await getTaskById(String(result.insertId));

  if (!task) {
    throw new Error('Task was created but could not be retrieved.');
  }

  return task;
}

export async function getTasks(
  filters: TaskFilters = {}
): Promise<Task[]> {
  const conditions: string[] = [];
  const parameters: (string | number)[] = [];

  if (filters.status !== undefined) {
    validateStatus(filters.status);
    conditions.push('status = ?');
    parameters.push(filters.status);
  }

  if (filters.priority !== undefined) {
    validatePriority(filters.priority);
    conditions.push('priority = ?');
    parameters.push(filters.priority);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const pool = getDatabasePool();

  const [rows] = await pool.execute<TaskRow[]>(
    `
      SELECT ${SELECT_TASK_COLUMNS}
      FROM tasks
      ${whereClause}
      ORDER BY
        CASE WHEN due_at IS NULL THEN 1 ELSE 0 END,
        due_at ASC,
        created_at DESC
    `,
    parameters
  );

  return rows.map(mapTask);
}

export async function getTaskById(
  id: string
): Promise<Task | null> {
  if (!/^\d+$/.test(id)) {
    throw new Error('Invalid task ID.');
  }

  const pool = getDatabasePool();

  const [rows] = await pool.execute<TaskRow[]>(
    `
      SELECT ${SELECT_TASK_COLUMNS}
      FROM tasks
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  );

  return rows.length ? mapTask(rows[0]) : null;
}

export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<Task | null> {
  if (!/^\d+$/.test(id)) {
    throw new Error('Invalid task ID.');
  }

  const updates: string[] = [];
  const parameters: (string | number | Date | null)[] = [];

  if (input.title !== undefined) {
    updates.push('title = ?');
    parameters.push(validateTitle(input.title));
  }

  if (input.description !== undefined) {
    updates.push('description = ?');
    parameters.push(input.description?.trim() || null);
  }

  if (input.priority !== undefined) {
    validatePriority(input.priority);
    updates.push('priority = ?');
    parameters.push(input.priority);
  }

  if (input.status !== undefined) {
    validateStatus(input.status);
    updates.push('status = ?');
    parameters.push(input.status);

    if (input.status === 'completed') {
      updates.push('completed_at = CURRENT_TIMESTAMP');
    } else {
      updates.push('completed_at = NULL');
    }
  }

  if (input.dueAt !== undefined) {
    validateDueDate(input.dueAt);
    updates.push('due_at = ?');
    parameters.push(input.dueAt);
  }

  if (updates.length === 0) {
    return getTaskById(id);
  }

  const pool = getDatabasePool();

  parameters.push(id);

  await pool.execute(
    `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = ?
    `,
    parameters
  );

  return getTaskById(id);
}

export async function completeTask(
  id: string
): Promise<Task | null> {
  if (!/^\d+$/.test(id)) {
    throw new Error('Invalid task ID.');
  }

  const pool = getDatabasePool();

  await pool.execute(
    `
      UPDATE tasks
      SET
        status = 'completed',
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [id]
  );

  return getTaskById(id);
}


export async function deleteTask(
  id: string
): Promise<boolean> {
  if (!/^\d+$/.test(id)) {
    throw new Error('Invalid task ID.');
  }

  const pool = getDatabasePool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Retrieve and lock the task before archiving it.
    const [rows] = await connection.execute<TaskRow[]>(
      `
        SELECT ${SELECT_TASK_COLUMNS}
        FROM tasks
        WHERE id = ?
        FOR UPDATE
      `,
      [id]
    );

    // Nothing to archive if the task does not exist.
    if (rows.length === 0) {
      await connection.rollback();
      return false;
    }

    const task = rows[0];

    // Preserve the complete task record.
    await connection.execute(
      `
        INSERT INTO deleted_tasks (
          original_task_id,
          title,
          description,
          priority,
          status,
          due_at,
          completed_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        task.id,
        task.title,
        task.description,
        task.priority,
        task.status,
        task.due_at,
        task.completed_at,
        task.created_at,
        task.updated_at
      ]
    );

    // Remove it from the active tasks table.
    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM tasks WHERE id = ?',
      [id]
    );

    if (result.affectedRows !== 1) {
      throw new Error('Task could not be removed after archiving.');
    }

    await connection.commit();

    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

