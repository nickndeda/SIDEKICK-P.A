
type SidekickTaskPriority = 'low' | 'medium' | 'high';

type SidekickTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type SidekickProductivitySessionType =
  | 'focus'
  | 'short_break'
  | 'long_break';

type SidekickProductivitySessionStatus =
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

type SidekickWellnessCategory =
  | 'hydration'
  | 'movement'
  | 'eye_rest'
  | 'bedtime'
  | 'wake_up';

interface SidekickIntervalWellnessSettings {
  enabled: boolean;
  intervalMinutes: number;
  activeStart: string;
  activeEnd: string;
}

interface SidekickWellnessSettings {
  hydration: SidekickIntervalWellnessSettings & { dailyTargetMl: number };
  movement: SidekickIntervalWellnessSettings;
  eyeRest: SidekickIntervalWellnessSettings;
  sleep: {
    bedtimeRemindersEnabled: boolean;
    wakeUpRemindersEnabled: boolean;
    bedtime: string;
    wakeUpTime: string;
    bedtimeLeadMinutes: number;
  };
  general: {
    remindersEnabled: boolean;
    quietHoursEnabled: boolean;
    quietStart: string;
    quietEnd: string;
    snoozeMinutes: number;
  };
}

interface SidekickHydrationEntry {
  id: string;
  amountMl: number;
  recordedAt: Date;
}

interface SidekickWellnessBreak {
  id: string;
  breakType: 'movement' | 'eye_rest';
  completedAt: Date;
  durationSeconds: number | null;
}

interface SidekickSleepRecord {
  id: string;
  sleepStartedAt: Date | null;
  wakeUpAt: Date | null;
  durationMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SidekickWellnessReminder {
  id: string;
  category: SidekickWellnessCategory;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high';
  scheduledAt: Date;
  status: 'scheduled' | 'notified' | 'snoozed' | 'completed' | 'dismissed';
  snoozedUntil: Date | null;
  completedAt: Date | null;
  dismissedAt: Date | null;
}

interface SidekickWellnessActivity {
  id: string;
  category: SidekickWellnessCategory | 'sleep';
  label: string;
  occurredAt: Date;
  detail: string;
}

interface SidekickDailyWellnessSummary {
  date: string;
  remindersEnabled: boolean;
  enabledReminderCategories: SidekickWellnessCategory[];
  hydrationTargetMl: number;
  waterConsumedMl: number;
  hydrationEntries: number;
  movementBreaks: number;
  eyeRestBreaks: number;
  lastMovementBreak: Date | null;
  lastEyeRestBreak: Date | null;
  bedtimeRecorded: boolean;
  wakeUpRecorded: boolean;
  upcomingReminders: SidekickWellnessReminder[];
  recentActivity: SidekickWellnessActivity[];
}

interface SidekickTask {
  id: string;
  title: string;
  description: string | null;
  priority: SidekickTaskPriority;
  status: SidekickTaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SidekickDeletedTask {
  archiveId: string;
  originalTaskId: string;
  title: string;
  description: string | null;
  priority: SidekickTaskPriority;
  status: SidekickTaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

interface SidekickProductivitySession {
  id: string;
  taskId: number | null;
  title: string;
  sessionType: SidekickProductivitySessionType;
  targetMinutes: number;
  status: SidekickProductivitySessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  elapsedSeconds: number;
  createdAt: Date;
}

interface SidekickDailyFocusSummary {
  date: string;
  focusMinutes: number;
}

interface SidekickProductivitySummary {
  todayFocusMinutes: number;
  todaySessions: number;
  todayCompletedSessions: number;
  weeklyFocusMinutes: number;
  dailyFocus: SidekickDailyFocusSummary[];
}

export {};

declare global {
  interface Window {
    sidekick: {
      platform: string;

      versions: {
        electron: string;
        chrome: string;
        node: string;
      };

      tasks: {
        create(input: CreateTaskInput): Promise<Task>;
        list(filters?: TaskFilters): Promise<Task[]>;
        get(id: string): Promise<Task | null>;
        update(id: string, input: UpdateTaskInput): Promise<Task | null>;
        complete(id: string): Promise<Task | null>;
        delete(id: string): Promise<boolean>;
      };

      deletedTasks: {
        list(): Promise<DeletedTask[]>;
        restore(archiveId: string): Promise<boolean>;
        permanentlyDelete(archiveId: string): Promise<boolean>;
        empty(): Promise<number>;
      };

      productivity: {
        start(
          input: {
            title: string;
            sessionType: SidekickProductivitySessionType;
            targetMinutes: number;
          taskId?: number | null;
          }
        ): Promise<SidekickProductivitySession>;

        active(): Promise<SidekickProductivitySession | null>;

        history(): Promise<SidekickProductivitySession[]>;

        today(): Promise<SidekickProductivitySession[]>;

        summary(): Promise<SidekickProductivitySummary>;

        pause(id: string): Promise<SidekickProductivitySession>;

        resume(id: string): Promise<SidekickProductivitySession>;

        complete(id: string): Promise<SidekickProductivitySession>;

        cancel(id: string): Promise<SidekickProductivitySession>;
      };

      wellness: {
        settings(): Promise<SidekickWellnessSettings>;
        updateSettings(settings: SidekickWellnessSettings): Promise<SidekickWellnessSettings>;
        resetSettings(): Promise<SidekickWellnessSettings>;
        summary(): Promise<SidekickDailyWellnessSummary>;
        hydrationEntries(): Promise<SidekickHydrationEntry[]>;
        addWater(input: { amountMl: number; recordedAt?: Date }): Promise<SidekickHydrationEntry>;
        updateWater(id: string, amountMl: number): Promise<SidekickHydrationEntry>;
        deleteWater(id: string): Promise<boolean>;
        breaks(): Promise<SidekickWellnessBreak[]>;
        recordBreak(input: { breakType: 'movement' | 'eye_rest'; durationSeconds?: number | null; completedAt?: Date }): Promise<SidekickWellnessBreak>;
        sleepHistory(): Promise<SidekickSleepRecord[]>;
        recordSleep(input?: { sleepStartedAt?: Date }): Promise<SidekickSleepRecord>;
        recordWake(input?: { wakeUpAt?: Date }): Promise<SidekickSleepRecord>;
        updateSleep(id: string, sleepStartedAt: Date | null, wakeUpAt: Date | null): Promise<SidekickSleepRecord>;
        deleteSleep(id: string): Promise<boolean>;
        reminders(): Promise<SidekickWellnessReminder[]>;
        completeReminder(id: string, hydrationAmountMl?: number): Promise<SidekickWellnessReminder>;
        snoozeReminder(id: string): Promise<SidekickWellnessReminder>;
        dismissReminder(id: string): Promise<SidekickWellnessReminder>;
      };
    };
  }
}
