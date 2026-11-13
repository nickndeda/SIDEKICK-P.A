
import {
  ipcMain,
  BrowserWindow,
  type IpcMainInvokeEvent
} from 'electron';

import {
  startSession,
  getActiveSession,
  getSessionHistory,
  getTodaySessions,
  getSummary,
  pauseSession,
  resumeSession,
  completeSession,
  cancelSession
} from '../modules/productivity/productivity-service';
import { publishAssistantEvent } from '../core/assistant-monitor';

import type {
  StartProductivitySessionInput
} from '../modules/productivity/productivity-types';

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const window = BrowserWindow.fromWebContents(event.sender);

  if (
    !window ||
    event.senderFrame !== event.sender.mainFrame
  ) {
    throw new Error('Untrusted IPC request.');
  }
}

function requireSessionId(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('A valid productivity session ID is required.');
  }

  return value;
}

function requireStartInput(value: unknown): StartProductivitySessionInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error('Invalid productivity session input.');
  }

  const input = value as Record<string, unknown>;

  if (
    typeof input.title !== 'string' ||
    typeof input.sessionType !== 'string' ||
    typeof input.targetMinutes !== 'number'
  ) {
    throw new Error('Incomplete productivity session input.');
  }

  return {
    title: input.title,
    sessionType: input.sessionType as StartProductivitySessionInput['sessionType'],
    targetMinutes: input.targetMinutes,
    taskId:
      input.taskId === undefined || input.taskId === null
        ? null
        : typeof input.taskId === 'number'
          ? input.taskId
          : Number.NaN
  };
}

export function registerProductivityIpcHandlers(): void {
  const channels = [
    'productivity:start',
    'productivity:active',
    'productivity:history',
    'productivity:today',
    'productivity:summary',
    'productivity:pause',
    'productivity:resume',
    'productivity:complete',
    'productivity:cancel'
  ];

  for (const channel of channels) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle('productivity:start', (event, input: unknown) => {
    assertTrustedSender(event);
    return startSession(requireStartInput(input)).then(session => {
      publishAssistantEvent('productivity.session.started', { sessionId: session.id, title: session.title });
      return session;
    });
  });

  ipcMain.handle('productivity:active', (event) => {
    assertTrustedSender(event);
    return getActiveSession();
  });

  ipcMain.handle('productivity:history', (event) => {
    assertTrustedSender(event);
    return getSessionHistory();
  });

  ipcMain.handle('productivity:today', (event) => {
    assertTrustedSender(event);
    return getTodaySessions();
  });

  ipcMain.handle('productivity:summary', (event) => {
    assertTrustedSender(event);
    return getSummary();
  });

  ipcMain.handle('productivity:pause', (event, id: unknown) => {
    assertTrustedSender(event);
    return pauseSession(requireSessionId(id)).then(session => {
      publishAssistantEvent('productivity.session.paused', { sessionId: session.id, title: session.title });
      return session;
    });
  });

  ipcMain.handle('productivity:resume', (event, id: unknown) => {
    assertTrustedSender(event);
    return resumeSession(requireSessionId(id)).then(session => {
      publishAssistantEvent('productivity.session.resumed', { sessionId: session.id, title: session.title });
      return session;
    });
  });

  ipcMain.handle('productivity:complete', (event, id: unknown) => {
    assertTrustedSender(event);
    return completeSession(requireSessionId(id)).then(session => {
      publishAssistantEvent('productivity.session.completed', { sessionId: session.id, title: session.title });
      return session;
    });
  });

  ipcMain.handle('productivity:cancel', (event, id: unknown) => {
    assertTrustedSender(event);
    return cancelSession(requireSessionId(id));
  });
}
