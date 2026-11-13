
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

type SidekickFinanceTransactionType = 'income' | 'expense' | 'transfer';
type SidekickFinanceCategoryType = 'income' | 'expense';
interface SidekickFinanceCategory { id: string; name: string; categoryType: SidekickFinanceCategoryType; isDefault: boolean; isActive: boolean }
interface SidekickFinanceTransaction { id: string; transactionType: SidekickFinanceTransactionType; amountMinor: number; currencyCode: string; categoryId: string | null; categoryName: string | null; description: string; merchant: string | null; paymentMethod: string | null; transactionDate: string; createdAt: Date }
interface SidekickFinanceBudget { id: string; name: string; amountMinor: number; spentMinor: number; currencyCode: string; categoryId: string | null; categoryName: string | null; periodYear: number; periodMonth: number }
interface SidekickFinanceBill { id: string; name: string; amountMinor: number; currencyCode: string; categoryId: string; categoryName: string; frequency: 'weekly'|'monthly'|'bimonthly'|'quarterly'|'annually'|'custom'; intervalDays: number | null; recurrenceDay:number; startDate: string|null; nextDueDate: string; endDate: string|null; reminderDaysBefore: number; status: 'active'|'paused'|'archived'; notes: string | null }
interface SidekickFinanceBillPayment { id:string; billId:string; transactionId:string; amountMinor:number; currencyCode:string; dueDate:string; paymentDate:string; notes:string|null }
interface SidekickFinanceGoal { id: string; name: string; description:string|null; targetMinor: number; savedMinor: number; currencyCode: string; targetDate: string | null; status: 'active'|'paused'|'completed'|'archived' }
interface SidekickFinanceContribution {id:string;goalId:string;amountMinor:number;contributionDate:string;description:string|null}
interface SidekickFinanceSettings { currencyCode: string }
interface SidekickFinanceSummary { currencyCode: string; monthIncomeMinor: number; monthExpenseMinor: number; monthNetMinor: number; monthSavingsContributionsMinor: number; budgetedMinor: number; budgetSpentMinor: number; upcomingBills: SidekickFinanceBill[]; goals: SidekickFinanceGoal[] }

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
  category: SidekickWellnessCategory | 'finance_bill' | 'learning_revision';
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

      finance: {
        settings(): Promise<SidekickFinanceSettings>;
        setCurrency(code: string): Promise<SidekickFinanceSettings>;
        categories(): Promise<SidekickFinanceCategory[]>;
        addCategory(name: string, type: SidekickFinanceCategoryType): Promise<SidekickFinanceCategory>;
        updateCategory(id:string,name:string):Promise<void>;
        deactivateCategory(id: string): Promise<void>;
        transactions(from: string, to: string): Promise<SidekickFinanceTransaction[]>;
        addTransaction(input: { transactionType: SidekickFinanceTransactionType; amountMinor: number; categoryId?: string | null; description: string; transactionDate?: string;merchant?:string|null;paymentMethod?:string|null }): Promise<SidekickFinanceTransaction>;
        updateTransaction(id: string, input: { transactionType: SidekickFinanceTransactionType; amountMinor: number; categoryId?: string | null; description: string; transactionDate?: string;merchant?:string|null;paymentMethod?:string|null }): Promise<void>;
        deleteTransaction(id: string): Promise<boolean>;
        budgets(year: number, month: number): Promise<SidekickFinanceBudget[]>;
        addBudget(input: { name: string; amountMinor: number; categoryId?: string | null; periodYear: number; periodMonth: number }): Promise<void>;
        updateBudget(id:string,input:{name:string;amountMinor:number;categoryId?:string|null;periodYear:number;periodMonth:number}):Promise<void>;
        deleteBudget(id: string): Promise<void>;
        bills(): Promise<SidekickFinanceBill[]>;
        billPayments(id:string):Promise<SidekickFinanceBillPayment[]>;
        addBill(input: { name: string; amountMinor: number; categoryId: string; frequency: SidekickFinanceBill['frequency']; intervalDays?: number | null;startDate?:string|null; nextDueDate: string;endDate?:string|null; reminderDaysBefore: number; notes?: string | null }): Promise<SidekickFinanceBill>;
        setBillStatus(id: string, status: SidekickFinanceBill['status']): Promise<void>;
        payBill(id: string, amountMinor?:number,paymentDate?: string,notes?:string): Promise<void>;
        snoozeBillReminder(id: string): Promise<void>;
        dismissBillReminder(id: string): Promise<void>;
        goals(): Promise<SidekickFinanceGoal[]>;
        addGoal(input: { name: string;description?:string|null; targetMinor: number; targetDate?: string | null }): Promise<void>;
        updateGoal(id:string,input:{name:string;description?:string|null;targetMinor:number;targetDate?:string|null}):Promise<void>;
        contribute(id: string, amountMinor: number, date?: string, description?: string): Promise<void>;
        contributions(id:string):Promise<SidekickFinanceContribution[]>;
        updateContribution(id:string,amountMinor:number,date:string,description?:string):Promise<void>;
        deleteContribution(id:string):Promise<boolean>;
        setGoalStatus(id: string, status: SidekickFinanceGoal['status']): Promise<void>;
        summary(year?:number,month?:number): Promise<SidekickFinanceSummary>;
      };

      learning: import('./learning').LearningApi;
      assistant: import('./assistant').AssistantApi;
    };
  }
}
