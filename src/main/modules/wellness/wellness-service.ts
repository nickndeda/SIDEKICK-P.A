import {
  addHydrationEntry,
  cancelPendingReminders,
  completeWellnessReminder,
  createSleepRecord,
  createWakeRecord,
  createWellnessReminder,
  deleteHydrationEntry,
  deleteSleepRecord,
  dismissWellnessReminder,
  finishSleepRecord,
  getDailyWellnessSummary,
  getDueReminders,
  getPendingReminder,
  getPendingReminders,
  getSleepHistory,
  getTodayHydrationEntries,
  getTodayWellnessBreaks,
  getWellnessSettings,
  recordWellnessBreak,
  markReminderNotified,
  saveWellnessSettings,
  snoozeWellnessReminder,
  updateHydrationEntry,
  updateSleepRecord
} from '../../repositories/wellness-repository';
import { getActiveProductivitySession } from '../../repositories/productivity-repository';
import { showWellnessNotification } from '../../services/notification-service';
import { wakeScheduler } from '../../core/scheduler';

import type {
  AddHydrationInput,
  DailyWellnessSummary,
  HydrationEntry,
  RecordBreakInput,
  SleepRecord,
  StartSleepInput,
  WellnessBreak,
  WellnessCategory,
  WellnessReminder,
  WellnessSettings
} from './wellness-types';

export const DEFAULT_WELLNESS_SETTINGS: WellnessSettings = {
  hydration: {
    enabled: false,
    dailyTargetMl: 2000,
    intervalMinutes: 60,
    activeStart: '08:00',
    activeEnd: '21:00'
  },
  movement: {
    enabled: false,
    intervalMinutes: 60,
    activeStart: '08:00',
    activeEnd: '21:00'
  },
  eyeRest: {
    enabled: false,
    intervalMinutes: 20,
    activeStart: '08:00',
    activeEnd: '21:00'
  },
  sleep: {
    bedtimeRemindersEnabled: false,
    wakeUpRemindersEnabled: false,
    bedtime: '22:30',
    wakeUpTime: '07:00',
    bedtimeLeadMinutes: 30
  },
  general: {
    remindersEnabled: true,
    quietHoursEnabled: true,
    quietStart: '23:00',
    quietEnd: '07:00',
    snoozeMinutes: 10
  }
};

const REMINDER_TEXT: Record<WellnessCategory, { title: string; description: string; priority: 'low' | 'normal' | 'high' }> = {
  hydration: { title: 'Hydration reminder', description: 'Time to drink some water.', priority: 'low' },
  movement: { title: 'Movement break', description: 'You have been working for a while. Take a short movement break.', priority: 'normal' },
  eye_rest: { title: 'Eye-rest break', description: 'Give your eyes a short break. Look away from your screen.', priority: 'low' },
  bedtime: { title: 'Bedtime reminder', description: 'Your preferred bedtime is approaching. Consider winding down.', priority: 'normal' },
  wake_up: { title: 'Wake-up reminder', description: "It's your scheduled wake-up time.", priority: 'normal' }
};

function assertTime(value: string): void {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Enter a valid time.');
}

function validateInterval(value: number): void {
  if (!Number.isInteger(value) || value < 5 || value > 720) {
    throw new Error('Reminder intervals must be between 5 minutes and 12 hours.');
  }
}

function validateSettings(settings: WellnessSettings): WellnessSettings {
  const next = structuredClone(settings);
  if (!Number.isInteger(next.hydration.dailyTargetMl) || next.hydration.dailyTargetMl < 250 || next.hydration.dailyTargetMl > 10000) {
    throw new Error('Daily water target must be between 250 and 10,000 ml.');
  }
  for (const category of [next.hydration, next.movement, next.eyeRest]) {
    validateInterval(category.intervalMinutes);
    assertTime(category.activeStart);
    assertTime(category.activeEnd);
    if (category.activeStart === category.activeEnd) throw new Error('Reminder active start and end times must differ.');
  }
  assertTime(next.sleep.bedtime);
  assertTime(next.sleep.wakeUpTime);
  if (!Number.isInteger(next.sleep.bedtimeLeadMinutes) || next.sleep.bedtimeLeadMinutes < 0 || next.sleep.bedtimeLeadMinutes > 180) {
    throw new Error('Bedtime reminder lead time must be between 0 and 180 minutes.');
  }
  assertTime(next.general.quietStart);
  assertTime(next.general.quietEnd);
  if (next.general.quietHoursEnabled && next.general.quietStart === next.general.quietEnd) {
    throw new Error('Quiet-hour start and end times must differ.');
  }
  if (!Number.isInteger(next.general.snoozeMinutes) || next.general.snoozeMinutes < 1 || next.general.snoozeMinutes > 180) {
    throw new Error('Snooze duration must be between 1 and 180 minutes.');
  }
  return next;
}

function requirePositiveId(id: string): string {
  if (typeof id !== 'string' || !/^\d{1,20}$/.test(id)) throw new Error('Invalid wellness record ID.');
  return id;
}

function requireReminderId(id: string): string {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Invalid reminder ID.');
  }
  return id;
}

function requireDate(value: Date | undefined, label: string): Date | undefined {
  if (value === undefined) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) throw new Error(`${label} must be a valid time in the past or now.`);
  return date;
}

export async function getSettings(): Promise<WellnessSettings> {
  return getWellnessSettings(DEFAULT_WELLNESS_SETTINGS);
}

export async function updateSettings(input: WellnessSettings): Promise<WellnessSettings> {
  const settings = validateSettings(input);
  await saveWellnessSettings(settings);
  await cancelPendingReminders();
  wakeScheduler();
  return settings;
}

export async function resetSettings(): Promise<WellnessSettings> {
  return updateSettings(DEFAULT_WELLNESS_SETTINGS);
}

export async function getDailySummary(): Promise<DailyWellnessSummary> {
  const settings = await getSettings();
  const summary = await getDailyWellnessSummary(settings.hydration.dailyTargetMl);
  const enabledReminderCategories: WellnessCategory[] = [];
  if (settings.hydration.enabled) enabledReminderCategories.push('hydration');
  if (settings.movement.enabled) enabledReminderCategories.push('movement');
  if (settings.eyeRest.enabled) enabledReminderCategories.push('eye_rest');
  if (settings.sleep.bedtimeRemindersEnabled) enabledReminderCategories.push('bedtime');
  if (settings.sleep.wakeUpRemindersEnabled) enabledReminderCategories.push('wake_up');
  return {
    ...summary,
    remindersEnabled: settings.general.remindersEnabled && enabledReminderCategories.length > 0,
    enabledReminderCategories: settings.general.remindersEnabled ? enabledReminderCategories : []
  };
}

export async function listHydrationEntries(): Promise<HydrationEntry[]> {
  return getTodayHydrationEntries();
}

export async function addWater(input: AddHydrationInput): Promise<HydrationEntry> {
  if (!Number.isInteger(input.amountMl) || input.amountMl < 1 || input.amountMl > 5000) {
    throw new Error('Water amount must be between 1 and 5,000 ml.');
  }
  return addHydrationEntry(input.amountMl, requireDate(input.recordedAt, 'Entry time'));
}

export async function correctWaterEntry(id: string, amountMl: number): Promise<HydrationEntry> {
  requirePositiveId(id);
  if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > 5000) throw new Error('Water amount must be between 1 and 5,000 ml.');
  const result = await updateHydrationEntry(id, amountMl);
  if (!result) throw new Error('Hydration entry was not found.');
  return result;
}

export async function removeWaterEntry(id: string): Promise<boolean> {
  return deleteHydrationEntry(requirePositiveId(id));
}

export async function listBreaks(): Promise<WellnessBreak[]> {
  return getTodayWellnessBreaks();
}

export async function completeBreak(input: RecordBreakInput): Promise<WellnessBreak> {
  if (!['movement', 'eye_rest'].includes(input.breakType)) throw new Error('Invalid wellness break type.');
  if (input.durationSeconds !== undefined && input.durationSeconds !== null && (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 1 || input.durationSeconds > 3600)) {
    throw new Error('Break duration must be between 1 and 3,600 seconds.');
  }
  return recordWellnessBreak(input.breakType, input.durationSeconds ?? null, requireDate(input.completedAt, 'Break time'));
}

export async function listSleepHistory(): Promise<SleepRecord[]> {
  return getSleepHistory(14);
}

export async function recordSleep(input: StartSleepInput = {}): Promise<SleepRecord> {
  const startedAt = requireDate(input.sleepStartedAt, 'Sleep time');
  const recent = await getSleepHistory(60);
  if (recent.some((record) => record.wakeUpAt === null)) throw new Error('Record waking from the current sleep entry before starting another.');
  const effectiveStart = startedAt ?? new Date();
  const lastWake = recent
    .map((record) => record.wakeUpAt)
    .filter((value): value is Date => value !== null)
    .sort((left, right) => right.getTime() - left.getTime())[0];
  if (lastWake && effectiveStart.getTime() <= new Date(lastWake).getTime()) {
    throw new Error('Sleep time must be after the most recent wake-up record.');
  }
  return createSleepRecord(startedAt);
}

export async function recordWake(recordId: string, wakeUpAt?: Date): Promise<SleepRecord> {
  const id = requirePositiveId(recordId);
  const wake = requireDate(wakeUpAt, 'Wake-up time');
  const recent = await getSleepHistory(60);
  const record = recent.find((item) => item.id === id);
  if (!record) throw new Error('Sleep record was not found.');
  if (!record.sleepStartedAt) throw new Error('A wake-up only record cannot be updated as a sleep session.');
  if (record.wakeUpAt) throw new Error('This sleep record already has a wake-up time.');
  if ((wake?.getTime() ?? Date.now()) <= new Date(record.sleepStartedAt).getTime()) throw new Error('Wake-up time must be after sleep time.');
  const updated = await finishSleepRecord(id, wake);
  if (!updated) throw new Error('The wake-up time could not be recorded.');
  return updated;
}

export async function recordWakeWithoutSleep(wakeUpAt?: Date): Promise<SleepRecord> {
  const wake = requireDate(wakeUpAt, 'Wake-up time');
  return createWakeRecord(wake);
}

export async function recordWakeUp(wakeUpAt?: Date): Promise<SleepRecord> {
  const recent = await getSleepHistory(60);
  const openRecord = recent.find((record) => record.sleepStartedAt && !record.wakeUpAt);
  return openRecord
    ? recordWake(openRecord.id, wakeUpAt)
    : recordWakeWithoutSleep(wakeUpAt);
}

export async function correctSleepRecord(id: string, sleepStartedAt: Date | null, wakeUpAt: Date | null): Promise<SleepRecord> {
  const recordId = requirePositiveId(id);
  const start = sleepStartedAt === null ? null : requireDate(sleepStartedAt, 'Sleep time') ?? null;
  const wake = wakeUpAt === null ? null : requireDate(wakeUpAt, 'Wake-up time') ?? null;
  if (!start && !wake) throw new Error('A sleep start time or wake-up time is required.');
  if (wake && start && wake.getTime() <= start.getTime()) throw new Error('Wake-up time must be after sleep time.');
  const records = await getSleepHistory(60);
  if (!records.some((record) => record.id === recordId)) throw new Error('Sleep record was not found.');
  if (start) {
    const end = wake?.getTime() ?? Date.now();
    const overlapsAnotherSleep = records.some((record) => {
      if (record.id === recordId || !record.sleepStartedAt) return false;
      const otherStart = new Date(record.sleepStartedAt).getTime();
      const otherEnd = record.wakeUpAt ? new Date(record.wakeUpAt).getTime() : Date.now();
      return start.getTime() < otherEnd && otherStart < end;
    });
    if (overlapsAnotherSleep) throw new Error('Sleep records cannot overlap.');
  }
  const updated = await updateSleepRecord(recordId, start, wake);
  if (!updated) throw new Error('Sleep record was not found.');
  return updated;
}

export async function removeSleepRecord(id: string): Promise<boolean> {
  return deleteSleepRecord(requirePositiveId(id));
}

export async function listReminders(): Promise<WellnessReminder[]> {
  return getPendingReminders(20);
}

export async function snoozeReminder(id: string): Promise<WellnessReminder> {
  const settings = await getSettings();
  const reminder = await snoozeWellnessReminder(requireReminderId(id), settings.general.snoozeMinutes);
  if (!reminder) throw new Error('Reminder was not found or is no longer active.');
  wakeScheduler();
  return reminder;
}

export async function dismissReminder(id: string): Promise<WellnessReminder> {
  const reminder = await dismissWellnessReminder(requireReminderId(id));
  if (!reminder) throw new Error('Reminder was not found or is no longer active.');
  wakeScheduler();
  return reminder;
}

export async function completeReminder(id: string, hydrationAmountMl?: number): Promise<WellnessReminder> {
  const reminderId = requireReminderId(id);
  const reminder = await completeWellnessReminder(reminderId, hydrationAmountMl);
  if (!reminder) throw new Error('Reminder was not found or is no longer active.');
  wakeScheduler();
  return reminder;
}

function parseTime(time: string): [number, number] {
  const [hour, minute] = time.split(':').map(Number);
  return [hour, minute];
}

function atLocalTime(base: Date, time: string): Date {
  const result = new Date(base);
  const [hour, minute] = parseTime(time);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function isInTimeWindow(date: Date, start: string, end: string): boolean {
  const current = date.getHours() * 60 + date.getMinutes();
  const [startHour, startMinute] = parseTime(start);
  const [endHour, endMinute] = parseTime(end);
  const from = startHour * 60 + startMinute;
  const to = endHour * 60 + endMinute;
  return from <= to ? current >= from && current < to : current >= from || current < to;
}

function nextIntervalTime(now: Date, intervalMinutes: number, start: string, end: string): Date {
  const target = new Date(now.getTime() + intervalMinutes * 60_000);
  if (isInTimeWindow(target, start, end)) return target;
  const next = atLocalTime(target, start);
  if (next <= target) next.setDate(next.getDate() + 1);
  return next;
}

function nextDailyTime(now: Date, time: string, offsetMinutes = 0): Date {
  const target = atLocalTime(now, time);
  target.setMinutes(target.getMinutes() - offsetMinutes);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target;
}

async function ensureReminder(
  category: WellnessCategory,
  scheduledAt: Date
): Promise<void> {
  if (await getPendingReminder(category)) return;
  await createWellnessReminder({
    category,
    title: REMINDER_TEXT[category].title,
    description: REMINDER_TEXT[category].description,
    priority: REMINDER_TEXT[category].priority,
    scheduledAt
  });
}

export async function runWellnessReminderCycle(): Promise<void> {
  const settings = await getSettings();
  if (!settings.general.remindersEnabled) {
    await cancelPendingReminders();
    return;
  }

  const now = new Date();
  const scheduled: Array<[WellnessCategory, Date]> = [];
  if (settings.hydration.enabled) scheduled.push(['hydration', nextIntervalTime(now, settings.hydration.intervalMinutes, settings.hydration.activeStart, settings.hydration.activeEnd)]);
  if (settings.movement.enabled) scheduled.push(['movement', nextIntervalTime(now, settings.movement.intervalMinutes, settings.movement.activeStart, settings.movement.activeEnd)]);
  if (settings.eyeRest.enabled) scheduled.push(['eye_rest', nextIntervalTime(now, settings.eyeRest.intervalMinutes, settings.eyeRest.activeStart, settings.eyeRest.activeEnd)]);
  if (settings.sleep.bedtimeRemindersEnabled) scheduled.push(['bedtime', nextDailyTime(now, settings.sleep.bedtime, settings.sleep.bedtimeLeadMinutes)]);
  if (settings.sleep.wakeUpRemindersEnabled) scheduled.push(['wake_up', nextDailyTime(now, settings.sleep.wakeUpTime)]);
  for (const [category, time] of scheduled) await ensureReminder(category, time);

  const [due, activeSession] = await Promise.all([
    getDueReminders(),
    getActiveProductivitySession()
  ]);
  for (const reminder of due) {
    if (
      reminder.category === 'movement' &&
      activeSession?.sessionType === 'focus' &&
      activeSession.status === 'running'
    ) continue;
    if (settings.general.quietHoursEnabled && isInTimeWindow(now, settings.general.quietStart, settings.general.quietEnd)) continue;
    const intervalSettings = reminder.category === 'hydration'
      ? settings.hydration
      : reminder.category === 'movement'
        ? settings.movement
        : reminder.category === 'eye_rest'
          ? settings.eyeRest
          : null;
    if (intervalSettings && (!intervalSettings.enabled || !isInTimeWindow(now, intervalSettings.activeStart, intervalSettings.activeEnd))) continue;
    if (reminder.category === 'bedtime' && !settings.sleep.bedtimeRemindersEnabled) continue;
    if (reminder.category === 'wake_up' && !settings.sleep.wakeUpRemindersEnabled) continue;
    if (!showWellnessNotification(reminder)) continue;
    await markReminderNotified(reminder.id);
  }
}
