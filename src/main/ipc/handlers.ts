
import {
  BrowserWindow,
  ipcMain,
  type IpcMainInvokeEvent
} from 'electron';

import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  completeTask,
  deleteTask,
  getDeletedTasks,
  restoreDeletedTask,
  permanentlyDeleteTask,
  emptyDeletedTasks,
  type TaskPriority,
  type TaskStatus,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskFilters
} from '../repositories/task-repository';
import { publishAssistantEvent } from '../core/assistant-monitor';

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

function requireArchiveId(value: unknown): string {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('Invalid archived task ID.');
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
 * Register the approved task and Trash IPC operations.
 */
export function registerIpcHandlers(): void {
  const channels = [
    'tasks:create',
    'tasks:list',
    'tasks:get',
    'tasks:update',
    'tasks:complete',
    'tasks:delete',
    'deleted-tasks:list',
    'deleted-tasks:restore',
    'deleted-tasks:delete',
    'deleted-tasks:empty'
  ];

  for (const channel of channels) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle('tasks:create', async (event, payload: unknown) => {
    assertTrustedSender(event);
    const task = await createTask(parseCreateInput(payload));
    publishAssistantEvent('task.created', { taskId: task.id, title: task.title });
    return task;
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

      const task = await updateTask(
        requireTaskId(id),
        parseUpdateInput(payload)
      );
      if (task) publishAssistantEvent('task.updated', { taskId: task.id });
      return task;
    }
  );

  ipcMain.handle('tasks:complete', async (event, id: unknown) => {
    assertTrustedSender(event);

    const task = await completeTask(requireTaskId(id));
    if (task) publishAssistantEvent('task.completed', { taskId: task.id });
    return task;
  });

  ipcMain.handle('tasks:delete', async (event, id: unknown) => {
    assertTrustedSender(event);
    const taskId = requireTaskId(id);
    const deleted = await deleteTask(taskId);
    if (deleted) publishAssistantEvent('task.deleted', { taskId });
    return deleted;
  });

  // Trash: retrieve archived tasks.
  ipcMain.handle('deleted-tasks:list', async (event) => {
    assertTrustedSender(event);

    return getDeletedTasks();
  });

  // Trash: restore an archived task.
  ipcMain.handle(
    'deleted-tasks:restore',
    async (event, archiveId: unknown) => {
      assertTrustedSender(event);

      return restoreDeletedTask(requireArchiveId(archiveId));
    }
  );

  // Trash: permanently delete one archived task.
  ipcMain.handle(
    'deleted-tasks:delete',
    async (event, archiveId: unknown) => {
      assertTrustedSender(event);

      return permanentlyDeleteTask(requireArchiveId(archiveId));
    }
  );

  // Trash: permanently delete all archived tasks.
  ipcMain.handle('deleted-tasks:empty', async (event) => {
    assertTrustedSender(event);

    return emptyDeletedTasks();
  });
}
