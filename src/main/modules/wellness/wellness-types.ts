export type WellnessCategory =
  | 'hydration'
  | 'movement'
  | 'eye_rest'
  | 'bedtime'
  | 'wake_up';

export type WellnessBreakType = 'movement' | 'eye_rest';

export type WellnessReminderStatus =
  | 'scheduled'
  | 'notified'
  | 'snoozed'
  | 'completed'
  | 'dismissed';

export interface IntervalWellnessSettings {
  enabled: boolean;
  intervalMinutes: number;
  activeStart: string;
  activeEnd: string;
}

export interface HydrationSettings extends IntervalWellnessSettings {
  dailyTargetMl: number;
}

export interface SleepWellnessSettings {
  bedtimeRemindersEnabled: boolean;
  wakeUpRemindersEnabled: boolean;
  bedtime: string;
  wakeUpTime: string;
  bedtimeLeadMinutes: number;
}

export interface GeneralWellnessSettings {
  remindersEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  snoozeMinutes: number;
}

export interface WellnessSettings {
  hydration: HydrationSettings;
  movement: IntervalWellnessSettings;
  eyeRest: IntervalWellnessSettings;
  sleep: SleepWellnessSettings;
  general: GeneralWellnessSettings;
}

export interface HydrationEntry {
  id: string;
  amountMl: number;
  recordedAt: Date;
}

export interface WellnessBreak {
  id: string;
  breakType: WellnessBreakType;
  completedAt: Date;
  durationSeconds: number | null;
}

export interface SleepRecord {
  id: string;
  sleepStartedAt: Date | null;
  wakeUpAt: Date | null;
  durationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WellnessReminder {
  id: string;
  category: WellnessCategory;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  scheduledAt: Date;
  status: WellnessReminderStatus;
  snoozedUntil: Date | null;
  completedAt: Date | null;
  dismissedAt: Date | null;
}

export interface WellnessActivity {
  id: string;
  category: WellnessCategory | 'sleep' | 'wake_up';
  label: string;
  occurredAt: Date;
  detail: string;
}

export interface DailyWellnessSummary {
  date: string;
  remindersEnabled: boolean;
  enabledReminderCategories: WellnessCategory[];
  hydrationTargetMl: number;
  waterConsumedMl: number;
  hydrationEntries: number;
  movementBreaks: number;
  eyeRestBreaks: number;
  lastMovementBreak: Date | null;
  lastEyeRestBreak: Date | null;
  bedtimeRecorded: boolean;
  wakeUpRecorded: boolean;
  upcomingReminders: WellnessReminder[];
  recentActivity: WellnessActivity[];
}

export interface AddHydrationInput {
  amountMl: number;
  recordedAt?: Date;
}

export interface RecordBreakInput {
  breakType: WellnessBreakType;
  durationSeconds?: number | null;
  completedAt?: Date;
}

export interface StartSleepInput {
  sleepStartedAt?: Date;
}

export interface RecordWakeInput {
  recordId: string;
  wakeUpAt?: Date;
}
