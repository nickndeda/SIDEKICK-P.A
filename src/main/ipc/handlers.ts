
import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
  type TaskPriority,
  type TaskStatus,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskFilters
} from '../repositories/task-repository';

/**
 * Ensure requests originate from the main frame of an application window.
 */
function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (!window || event.senderFrame !== event.sender.mainFrame) {
    throw new Error('Unauthorized IPC request.');
  }
}

function requireObject(value: unknown): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('Invalid request data.');
  }

  return value as Record<string, unknown>;
}

function requireTaskId(value: unknown): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('Invalid task ID.');
  }

  return value;
}

function parsePriority(value: unknown): TaskPriority {
  const allowed: TaskPriority[] = [
    'low',
    'normal',
    'high',
    'critical'
  ];

  if (
    typeof value !== 'string' ||
    !allowed.includes(value as TaskPriority)
  ) {
    throw new Error('Invalid task priority.');
  }

  return value as TaskPriority;
}

function parseStatus(value: unknown): TaskStatus {
  const allowed: TaskStatus[] = [
    'pending',
    'in_progress',
    'completed',
    'cancelled'
  ];

  if (
    typeof value !== 'string' ||
    !allowed.includes(value as TaskStatus)
  ) {
    throw new Error('Invalid task status.');
  }

  return value as TaskStatus;
}

function parseDueDate(value: unknown): Date | null {
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Invalid due date.');
    }

    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid due date.');
    }

    return date;
  }

  throw new Error('Invalid due date.');
}

function parseCreateInput(value: unknown): CreateTaskInput {
  const data = requireObject(value);

  if (typeof data.title !== 'string') {
    throw new Error('A task title is required.');
  }

  const input: CreateTaskInput = {
    title: data.title
  };

  if (data.description !== undefined) {
    if (
      data.description !== null &&
      typeof data.description !== 'string'
    ) {
      throw new Error('Invalid task description.');
    }

    input.description = data.description as string | null;
  }

  if (data.priority !== undefined) {
    input.priority = parsePriority(data.priority);
  }

  if (data.status !== undefined) {
    input.status = parseStatus(data.status);
  }

  if (data.dueAt !== undefined) {
    input.dueAt = parseDueDate(data.dueAt);
  }

  return input;
}

function parseUpdateInput(value: unknown): UpdateTaskInput {
  const data = requireObject(value);
  const input: UpdateTaskInput = {};

  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      throw new Error('Invalid task title.');
    }

    input.title = data.title;
  }

  if (data.description !== undefined) {
    if (
      data.description !== null &&
      typeof data.description !== 'string'
    ) {
      throw new Error('Invalid task description.');
    }

    input.description = data.description as string | null;
  }

  if (data.priority !== undefined) {
    input.priority = parsePriority(data.priority);
  }

  if (data.status !== undefined) {
    input.status = parseStatus(data.status);
  }

  if (data.dueAt !== undefined) {
    input.dueAt = parseDueDate(data.dueAt);
  }

  return input;
}

function parseFilters(value: unknown): TaskFilters {
  if (value === undefined || value === null) {
    return {};
  }

  const data = requireObject(value);
  const filters: TaskFilters = {};

  if (data.status !== undefined) {
    filters.status = parseStatus(data.status);
  }

  if (data.priority !== undefined) {
    filters.priority = parsePriority(data.priority);
  }

  return filters;
}

/**
 * Register the approved task-related IPC operations.
 */
export function registerIpcHandlers(): void {
  ipcMain.removeHandler('tasks:create');
  ipcMain.removeHandler('tasks:list');
  ipcMain.removeHandler('tasks:get');
  ipcMain.removeHandler('tasks:update');
  ipcMain.removeHandler('tasks:complete');
  ipcMain.removeHandler('tasks:delete');

  ipcMain.handle('tasks:create', async (event, payload: unknown) => {
    assertTrustedSender(event);

    return createTask(parseCreateInput(payload));
  });

  ipcMain.handle('tasks:list', async (event, filters: unknown) => {
    assertTrustedSender(event);

    return getTasks(parseFilters(filters));
  });

  ipcMain.handle('tasks:get', async (event, id: unknown) => {
    assertTrustedSender(event);

    return getTaskById(requireTaskId(id));
  });

  ipcMain.handle(
    'tasks:update',
    async (event, id: unknown, payload: unknown) => {
      assertTrustedSender(event);

      return updateTask(
        requireTaskId(id),
        parseUpdateInput(payload)
      );
    }
  );

  ipcMain.handle('tasks:complete', async (event, id: unknown) => {
    assertTrustedSender(event);

    return completeTask(requireTaskId(id));
  });

  ipcMain.handle('tasks:delete', async (event, id: unknown) => {
    assertTrustedSender(event);

    return deleteTask(requireTaskId(id));
  });
}
