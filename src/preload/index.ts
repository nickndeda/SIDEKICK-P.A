
import { contextBridge, ipcRenderer } from 'electron';

import type {
  ProductivitySession,
  ProductivitySummary,
  StartProductivitySessionInput
} from '../main/modules/productivity/productivity-types';
import type {
  AddHydrationInput,
  DailyWellnessSummary,
  HydrationEntry,
  RecordBreakInput,
  SleepRecord,
  WellnessBreak,
  WellnessReminder,
  WellnessSettings
} from '../main/modules/wellness/wellness-types';

const sidekickAPI = {
  platform: process.platform,

  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node
  },

  tasks: {
    create: (input: {
      title: string;
      description?: string | null;
      priority?: 'low' | 'normal' | 'high' | 'critical';
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      dueAt?: Date | string | null;
    }) => ipcRenderer.invoke('tasks:create', input),

    list: (filters?: {
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      priority?: 'low' | 'normal' | 'high' | 'critical';
    }) => ipcRenderer.invoke('tasks:list', filters),

    get: (id: string) =>
      ipcRenderer.invoke('tasks:get', id),

    update: (
      id: string,
      input: {
        title?: string;
        description?: string | null;
        priority?: 'low' | 'normal' | 'high' | 'critical';
        status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
        dueAt?: Date | string | null;
      }
    ) => ipcRenderer.invoke('tasks:update', id, input),

    complete: (id: string) =>
      ipcRenderer.invoke('tasks:complete', id),

    delete: (id: string) =>
      ipcRenderer.invoke('tasks:delete', id)
  },

  deletedTasks: {
    list: () =>
      ipcRenderer.invoke('deleted-tasks:list'),

    restore: (archiveId: string) =>
      ipcRenderer.invoke('deleted-tasks:restore', archiveId),

    permanentlyDelete: (archiveId: string) =>
      ipcRenderer.invoke('deleted-tasks:delete', archiveId),

    empty: () =>
      ipcRenderer.invoke('deleted-tasks:empty')
  },

  productivity: {
    start: (
      input: StartProductivitySessionInput
    ): Promise<ProductivitySession> =>
      ipcRenderer.invoke('productivity:start', input),

    active: (): Promise<ProductivitySession | null> =>
      ipcRenderer.invoke('productivity:active'),

    history: (): Promise<ProductivitySession[]> =>
      ipcRenderer.invoke('productivity:history'),

    today: (): Promise<ProductivitySession[]> =>
      ipcRenderer.invoke('productivity:today'),

    summary: (): Promise<ProductivitySummary> =>
      ipcRenderer.invoke('productivity:summary'),

    pause: (id: string): Promise<ProductivitySession> =>
      ipcRenderer.invoke('productivity:pause', id),

    resume: (id: string): Promise<ProductivitySession> =>
      ipcRenderer.invoke('productivity:resume', id),

    complete: (id: string): Promise<ProductivitySession> =>
      ipcRenderer.invoke('productivity:complete', id),

    cancel: (id: string): Promise<ProductivitySession> =>
      ipcRenderer.invoke('productivity:cancel', id)
  },

  wellness: {
    settings: (): Promise<WellnessSettings> => ipcRenderer.invoke('wellness:settings'),
    updateSettings: (settings: WellnessSettings): Promise<WellnessSettings> =>
      ipcRenderer.invoke('wellness:settings:update', settings),
    resetSettings: (): Promise<WellnessSettings> => ipcRenderer.invoke('wellness:settings:reset'),
    summary: (): Promise<DailyWellnessSummary> => ipcRenderer.invoke('wellness:summary'),
    hydrationEntries: (): Promise<HydrationEntry[]> => ipcRenderer.invoke('wellness:hydration:list'),
    addWater: (input: AddHydrationInput): Promise<HydrationEntry> => ipcRenderer.invoke('wellness:hydration:add', input),
    updateWater: (id: string, amountMl: number): Promise<HydrationEntry> => ipcRenderer.invoke('wellness:hydration:update', id, amountMl),
    deleteWater: (id: string): Promise<boolean> => ipcRenderer.invoke('wellness:hydration:delete', id),
    breaks: (): Promise<WellnessBreak[]> => ipcRenderer.invoke('wellness:breaks:list'),
    recordBreak: (input: RecordBreakInput): Promise<WellnessBreak> => ipcRenderer.invoke('wellness:breaks:record', input),
    sleepHistory: (): Promise<SleepRecord[]> => ipcRenderer.invoke('wellness:sleep:list'),
    recordSleep: (input: { sleepStartedAt?: Date } = {}): Promise<SleepRecord> => ipcRenderer.invoke('wellness:sleep:start', input),
    recordWake: (input: { wakeUpAt?: Date } = {}): Promise<SleepRecord> => ipcRenderer.invoke('wellness:sleep:wake', input),
    updateSleep: (id: string, sleepStartedAt: Date | null, wakeUpAt: Date | null): Promise<SleepRecord> =>
      ipcRenderer.invoke('wellness:sleep:update', id, sleepStartedAt, wakeUpAt),
    deleteSleep: (id: string): Promise<boolean> => ipcRenderer.invoke('wellness:sleep:delete', id),
    reminders: (): Promise<WellnessReminder[]> => ipcRenderer.invoke('wellness:reminders:list'),
    completeReminder: (id: string, hydrationAmountMl?: number): Promise<WellnessReminder> =>
      ipcRenderer.invoke('wellness:reminders:complete', id, hydrationAmountMl),
    snoozeReminder: (id: string): Promise<WellnessReminder> => ipcRenderer.invoke('wellness:reminders:snooze', id),
    dismissReminder: (id: string): Promise<WellnessReminder> => ipcRenderer.invoke('wellness:reminders:dismiss', id)
  }
};

contextBridge.exposeInMainWorld('sidekick', sidekickAPI);
