import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  addWater,
  completeBreak,
  completeReminder,
  correctSleepRecord,
  correctWaterEntry,
  dismissReminder,
  getDailySummary,
  getSettings,
  listBreaks,
  listHydrationEntries,
  listReminders,
  listSleepHistory,
  recordSleep,
  recordWakeUp,
  removeSleepRecord,
  removeWaterEntry,
  resetSettings,
  snoozeReminder,
  updateSettings
} from '../modules/wellness/wellness-service';
import type { WellnessSettings } from '../modules/wellness/wellness-types';

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || event.senderFrame !== event.sender.mainFrame) throw new Error('Untrusted IPC request.');
}

function object(value: unknown, label = 'request'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`Invalid ${label}.`);
  return value;
}

function date(value: unknown, label: string, allowNull = false): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null && allowNull) return null;
  const parsed = value instanceof Date ? value : typeof value === 'string' ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${label}.`);
  return parsed;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`Invalid ${label}.`);
  return value;
}

function number(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`Invalid ${label}.`);
  return value;
}

function parseIntervalSettings(value: unknown, label: string) {
  const data = object(value, label);
  return {
    enabled: boolean(data.enabled, `${label} enabled`),
    intervalMinutes: number(data.intervalMinutes, `${label} interval`),
    activeStart: text(data.activeStart, `${label} active start`),
    activeEnd: text(data.activeEnd, `${label} active end`)
  };
}

function parseSettings(value: unknown): WellnessSettings {
  const data = object(value, 'wellness settings');
  const hydration = object(data.hydration, 'hydration settings');
  const sleep = object(data.sleep, 'sleep settings');
  const general = object(data.general, 'general settings');
  return {
    hydration: {
      ...parseIntervalSettings(hydration, 'hydration'),
      dailyTargetMl: number(hydration.dailyTargetMl, 'hydration target')
    },
    movement: parseIntervalSettings(data.movement, 'movement settings'),
    eyeRest: parseIntervalSettings(data.eyeRest, 'eye-rest settings'),
    sleep: {
      bedtimeRemindersEnabled: boolean(sleep.bedtimeRemindersEnabled, 'bedtime reminder setting'),
      wakeUpRemindersEnabled: boolean(sleep.wakeUpRemindersEnabled, 'wake-up reminder setting'),
      bedtime: text(sleep.bedtime, 'bedtime'),
      wakeUpTime: text(sleep.wakeUpTime, 'wake-up time'),
      bedtimeLeadMinutes: number(sleep.bedtimeLeadMinutes, 'bedtime reminder lead time')
    },
    general: {
      remindersEnabled: boolean(general.remindersEnabled, 'wellness reminders setting'),
      quietHoursEnabled: boolean(general.quietHoursEnabled, 'quiet-hours setting'),
      quietStart: text(general.quietStart, 'quiet-hours start'),
      quietEnd: text(general.quietEnd, 'quiet-hours end'),
      snoozeMinutes: number(general.snoozeMinutes, 'snooze duration')
    }
  };
}

export function registerWellnessIpcHandlers(): void {
  const channels = [
    'wellness:settings', 'wellness:settings:update', 'wellness:settings:reset',
    'wellness:summary', 'wellness:hydration:list', 'wellness:hydration:add',
    'wellness:hydration:update', 'wellness:hydration:delete', 'wellness:breaks:list',
    'wellness:breaks:record', 'wellness:sleep:list', 'wellness:sleep:start',
    'wellness:sleep:wake', 'wellness:sleep:update', 'wellness:sleep:delete',
    'wellness:reminders:list', 'wellness:reminders:complete',
    'wellness:reminders:snooze', 'wellness:reminders:dismiss'
  ];
  for (const channel of channels) ipcMain.removeHandler(channel);

  ipcMain.handle('wellness:settings', (event) => { assertTrustedSender(event); return getSettings(); });
  ipcMain.handle('wellness:settings:update', (event, input: unknown) => {
    assertTrustedSender(event); return updateSettings(parseSettings(input));
  });
  ipcMain.handle('wellness:settings:reset', (event) => { assertTrustedSender(event); return resetSettings(); });
  ipcMain.handle('wellness:summary', (event) => { assertTrustedSender(event); return getDailySummary(); });
  ipcMain.handle('wellness:hydration:list', (event) => { assertTrustedSender(event); return listHydrationEntries(); });
  ipcMain.handle('wellness:hydration:add', (event, input: unknown) => {
    assertTrustedSender(event);
    const data = object(input, 'hydration entry');
    return addWater({ amountMl: number(data.amountMl, 'water amount'), recordedAt: date(data.recordedAt, 'recorded time') ?? undefined });
  });
  ipcMain.handle('wellness:hydration:update', (event, id: unknown, amount: unknown) => {
    assertTrustedSender(event); return correctWaterEntry(text(id, 'hydration entry ID'), number(amount, 'water amount'));
  });
  ipcMain.handle('wellness:hydration:delete', (event, id: unknown) => {
    assertTrustedSender(event); return removeWaterEntry(text(id, 'hydration entry ID'));
  });
  ipcMain.handle('wellness:breaks:list', (event) => { assertTrustedSender(event); return listBreaks(); });
  ipcMain.handle('wellness:breaks:record', (event, input: unknown) => {
    assertTrustedSender(event);
    const data = object(input, 'break record');
    if (data.breakType !== 'movement' && data.breakType !== 'eye_rest') throw new Error('Invalid break type.');
    return completeBreak({
      breakType: data.breakType,
      durationSeconds: data.durationSeconds === null ? null : data.durationSeconds === undefined ? undefined : number(data.durationSeconds, 'break duration'),
      completedAt: date(data.completedAt, 'break time') ?? undefined
    });
  });
  ipcMain.handle('wellness:sleep:list', (event) => { assertTrustedSender(event); return listSleepHistory(); });
  ipcMain.handle('wellness:sleep:start', (event, input: unknown) => {
    assertTrustedSender(event);
    const data = input === undefined || input === null ? {} : object(input, 'sleep record');
    return recordSleep({ sleepStartedAt: date(data.sleepStartedAt, 'sleep time') ?? undefined });
  });
  ipcMain.handle('wellness:sleep:wake', (event, input: unknown) => {
    assertTrustedSender(event);
    const data = input === undefined || input === null ? {} : object(input, 'wake-up record');
    return recordWakeUp(date(data.wakeUpAt, 'wake-up time') ?? undefined);
  });
  ipcMain.handle('wellness:sleep:update', (event, id: unknown, start: unknown, wake: unknown) => {
    assertTrustedSender(event);
    const startAt = date(start, 'sleep time', true);
    const wakeAt = date(wake, 'wake-up time', true);
    return correctSleepRecord(text(id, 'sleep record ID'), startAt ?? null, wakeAt ?? null);
  });
  ipcMain.handle('wellness:sleep:delete', (event, id: unknown) => {
    assertTrustedSender(event); return removeSleepRecord(text(id, 'sleep record ID'));
  });
  ipcMain.handle('wellness:reminders:list', (event) => { assertTrustedSender(event); return listReminders(); });
  ipcMain.handle('wellness:reminders:complete', (event, id: unknown, amount: unknown) => {
    assertTrustedSender(event);
    return completeReminder(text(id, 'reminder ID'), amount === undefined ? undefined : number(amount, 'water amount'));
  });
  ipcMain.handle('wellness:reminders:snooze', (event, id: unknown) => { assertTrustedSender(event); return snoozeReminder(text(id, 'reminder ID')); });
  ipcMain.handle('wellness:reminders:dismiss', (event, id: unknown) => { assertTrustedSender(event); return dismissReminder(text(id, 'reminder ID')); });
}
