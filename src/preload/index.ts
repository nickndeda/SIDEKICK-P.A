
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
import type { FinanceBill, FinanceBillInput, FinanceBillPayment, FinanceBudget, FinanceBudgetInput, FinanceCategory, FinanceCategoryType, FinanceContribution, FinanceGoal, FinanceGoalInput, FinanceSettings, FinanceSummary, FinanceTransaction, FinanceTransactionInput } from '../main/modules/finance/finance-types';
import type { LearningApi } from '../shared/types/learning';
import type { AssistantApi } from '../shared/types/assistant';

const assistantAPI: AssistantApi = {
  status: () => ipcRenderer.invoke('assistant:status'),
  activities: (limit, includeDismissed) => ipcRenderer.invoke('assistant:activities', limit, includeDismissed),
  setMonitoringEnabled: enabled => ipcRenderer.invoke('assistant:monitoring:set', enabled),
  markRead: id => ipcRenderer.invoke('assistant:activity:read', id),
  dismiss: id => ipcRenderer.invoke('assistant:activity:dismiss', id),
  onUpdate: listener => {
    const handler = (_event: Electron.IpcRendererEvent, update: Parameters<typeof listener>[0]) => listener(update);
    ipcRenderer.on('assistant:update', handler);
    return () => ipcRenderer.removeListener('assistant:update', handler);
  },
  conversations: () => ipcRenderer.invoke('assistant:conversations'),
  conversation: id => ipcRenderer.invoke('assistant:conversation:get',id),
  newConversation: () => ipcRenderer.invoke('assistant:conversation:new'),
  deleteConversation: id => ipcRenderer.invoke('assistant:conversation:delete',id),
  sendMessage: (id,message) => ipcRenderer.invoke('assistant:chat:send',id,message),
  preferences: () => ipcRenderer.invoke('assistant:preferences'),
  setPreferences: input => ipcRenderer.invoke('assistant:preferences:set',input),
  checkModel: () => ipcRenderer.invoke('assistant:model:check'),
  memories: () => ipcRenderer.invoke('assistant:memories'),
  saveMemory: input => ipcRenderer.invoke('assistant:memory:save',input),
  deleteMemory: id => ipcRenderer.invoke('assistant:memory:delete',id)
};

const learningAPI: LearningApi = {
  subjects: {
    list: (includeArchived=false) => ipcRenderer.invoke('learning:subjects:list',includeArchived),
    getById: id => ipcRenderer.invoke('learning:subjects:get',id),
    create: input => ipcRenderer.invoke('learning:subjects:create',input),
    update: (id,input) => ipcRenderer.invoke('learning:subjects:update',id,input),
    archive: id => ipcRenderer.invoke('learning:subjects:archive',id),
    restore: id => ipcRenderer.invoke('learning:subjects:restore',id),
    complete: id => ipcRenderer.invoke('learning:subjects:complete',id),
    delete: id => ipcRenderer.invoke('learning:subjects:delete',id)
  },
  topics: {
    list: filters => ipcRenderer.invoke('learning:topics:list',filters),
    getById: id => ipcRenderer.invoke('learning:topics:get',id),
    create: input => ipcRenderer.invoke('learning:topics:create',input),
    update: (id,input) => ipcRenderer.invoke('learning:topics:update',id,input),
    updateProgress: (id,progress,status) => ipcRenderer.invoke('learning:topics:progress',id,progress,status),
    delete: id => ipcRenderer.invoke('learning:topics:delete',id)
  },
  sessions: {
    list: (limit=50,subjectId) => ipcRenderer.invoke('learning:sessions:list',limit,subjectId),
    current: () => ipcRenderer.invoke('learning:sessions:current'),
    start: input => ipcRenderer.invoke('learning:sessions:start',input),
    pause: id => ipcRenderer.invoke('learning:sessions:pause',id),
    resume: id => ipcRenderer.invoke('learning:sessions:resume',id),
    finish: (id,notes) => ipcRenderer.invoke('learning:sessions:finish',id,notes),
    cancel: id => ipcRenderer.invoke('learning:sessions:cancel',id),
    todaySeconds: () => ipcRenderer.invoke('learning:sessions:today'),
    weeklySeconds: () => ipcRenderer.invoke('learning:sessions:week')
  },
  notes: {
    list: (subjectId,topicId) => ipcRenderer.invoke('learning:notes:list',subjectId,topicId),
    create: input => ipcRenderer.invoke('learning:notes:create',input),
    update: (id,input) => ipcRenderer.invoke('learning:notes:update',id,input),
    delete: id => ipcRenderer.invoke('learning:notes:delete',id)
  },
  resources: {
    list: (subjectId,topicId) => ipcRenderer.invoke('learning:resources:list',subjectId,topicId),
    create: input => ipcRenderer.invoke('learning:resources:create',input),
    update: (id,input) => ipcRenderer.invoke('learning:resources:update',id,input),
    delete: id => ipcRenderer.invoke('learning:resources:delete',id),
    open: id => ipcRenderer.invoke('learning:resources:open',id)
  },
  quizzes: {
    list: subjectId => ipcRenderer.invoke('learning:quizzes:list',subjectId),
    getById: id => ipcRenderer.invoke('learning:quizzes:get',id),
    create: input => ipcRenderer.invoke('learning:quizzes:create',input),
    update: (id,input) => ipcRenderer.invoke('learning:quizzes:update',id,input),
    delete: id => ipcRenderer.invoke('learning:quizzes:delete',id),
    addQuestion: input => ipcRenderer.invoke('learning:questions:create',input),
    updateQuestion: (id,input) => ipcRenderer.invoke('learning:questions:update',id,input),
    deleteQuestion: id => ipcRenderer.invoke('learning:questions:delete',id),
    startAttempt: quizId => ipcRenderer.invoke('learning:attempts:start',quizId),
    submitAttempt: (attemptId,answers) => ipcRenderer.invoke('learning:attempts:submit',attemptId,answers),
    attempts: quizId => ipcRenderer.invoke('learning:attempts:list',quizId),
    resumeAttempt: id => ipcRenderer.invoke('learning:attempts:resume',id),
    abandonAttempt: id => ipcRenderer.invoke('learning:attempts:abandon',id)
  },
  revisions: {
    list: (status,subjectId) => ipcRenderer.invoke('learning:revisions:list',status,subjectId),
    dueToday: () => ipcRenderer.invoke('learning:revisions:today'),
    overdue: () => ipcRenderer.invoke('learning:revisions:overdue'),
    upcoming: () => ipcRenderer.invoke('learning:revisions:upcoming'),
    create: (topicId,dueAt) => ipcRenderer.invoke('learning:revisions:create',topicId,dueAt),
    complete: (id,grade) => ipcRenderer.invoke('learning:revisions:complete',id,grade),
    reschedule: (id,dueAt) => ipcRenderer.invoke('learning:revisions:reschedule',id,dueAt),
    dismiss: id => ipcRenderer.invoke('learning:revisions:dismiss',id)
  },
  goals: {
    list: status => ipcRenderer.invoke('learning:goals:list',status),
    create: input => ipcRenderer.invoke('learning:goals:create',input),
    update: (id,input) => ipcRenderer.invoke('learning:goals:update',id,input),
    complete: id => ipcRenderer.invoke('learning:goals:complete',id),
    archive: id => ipcRenderer.invoke('learning:goals:archive',id)
  },
  analytics: {
    overview: () => ipcRenderer.invoke('learning:analytics:overview'),
    studyTime: filter => ipcRenderer.invoke('learning:analytics:study-time',filter),
    performance: filter => ipcRenderer.invoke('learning:analytics:performance',filter),
    weakTopics: () => ipcRenderer.invoke('learning:analytics:weak-topics')
  }
};

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
  },

  finance: {
    settings: (): Promise<FinanceSettings> => ipcRenderer.invoke('finance:settings'),
    setCurrency: (code: string): Promise<FinanceSettings> => ipcRenderer.invoke('finance:currency', code),
    categories: (): Promise<FinanceCategory[]> => ipcRenderer.invoke('finance:categories'),
    addCategory: (name: string, type: FinanceCategoryType): Promise<FinanceCategory> => ipcRenderer.invoke('finance:category:add', { name, type }),
    updateCategory: (id: string, name: string): Promise<void> => ipcRenderer.invoke('finance:category:update', id, name),
    deactivateCategory: (id: string): Promise<void> => ipcRenderer.invoke('finance:category:deactivate', id),
    transactions: (from: string, to: string): Promise<FinanceTransaction[]> => ipcRenderer.invoke('finance:transactions', from, to),
    addTransaction: (input: FinanceTransactionInput): Promise<FinanceTransaction> => ipcRenderer.invoke('finance:transaction:add', input),
    updateTransaction: (id: string, input: FinanceTransactionInput): Promise<void> => ipcRenderer.invoke('finance:transaction:update', id, input),
    deleteTransaction: (id: string): Promise<boolean> => ipcRenderer.invoke('finance:transaction:delete', id),
    budgets: (year: number, month: number): Promise<FinanceBudget[]> => ipcRenderer.invoke('finance:budgets', year, month),
    addBudget: (input: FinanceBudgetInput): Promise<void> => ipcRenderer.invoke('finance:budget:add', input),
    updateBudget: (id: string, input: FinanceBudgetInput): Promise<void> => ipcRenderer.invoke('finance:budget:update', id, input),
    deleteBudget: (id: string): Promise<void> => ipcRenderer.invoke('finance:budget:delete', id),
    bills: (): Promise<FinanceBill[]> => ipcRenderer.invoke('finance:bills'),
    billPayments: (id: string): Promise<FinanceBillPayment[]> => ipcRenderer.invoke('finance:bill:payments', id),
    addBill: (input: FinanceBillInput): Promise<FinanceBill> => ipcRenderer.invoke('finance:bill:add', input),
    setBillStatus: (id: string, status: FinanceBill['status']): Promise<void> => ipcRenderer.invoke('finance:bill:status', id, status),
    payBill: (id: string, amountMinor?: number, paymentDate?: string, notes?: string): Promise<void> => ipcRenderer.invoke('finance:bill:pay', id, amountMinor, paymentDate, notes),
    snoozeBillReminder: (id: string): Promise<void> => ipcRenderer.invoke('finance:bill:snooze', id),
    dismissBillReminder: (id: string): Promise<void> => ipcRenderer.invoke('finance:bill:dismiss', id),
    goals: (): Promise<FinanceGoal[]> => ipcRenderer.invoke('finance:goals'),
    addGoal: (input: FinanceGoalInput): Promise<void> => ipcRenderer.invoke('finance:goal:add', input),
    updateGoal: (id: string, input: FinanceGoalInput): Promise<void> => ipcRenderer.invoke('finance:goal:update', id, input),
    contribute: (id: string, amountMinor: number, date?: string, description?: string): Promise<void> => ipcRenderer.invoke('finance:goal:contribute', id, amountMinor, date, description),
    contributions: (id: string): Promise<FinanceContribution[]> => ipcRenderer.invoke('finance:goal:contributions', id),
    updateContribution: (id: string, amountMinor: number, date: string, description?: string): Promise<void> => ipcRenderer.invoke('finance:goal:contribution:update', id, amountMinor, date, description),
    deleteContribution: (id: string): Promise<boolean> => ipcRenderer.invoke('finance:goal:contribution:delete', id),
    setGoalStatus: (id: string, status: 'active'|'paused'|'completed'|'archived'): Promise<void> => ipcRenderer.invoke('finance:goal:status', id, status),
    summary: (year?: number, month?: number): Promise<FinanceSummary> => ipcRenderer.invoke('finance:summary', year, month)
  },

  learning: learningAPI,
  assistant: assistantAPI
};

contextBridge.exposeInMainWorld('sidekick', sidekickAPI);
