export interface PlannerContext {
  overdueTasks: Array<{ id: string; title: string; priority: string; dueAt: Date }>;
  dueToday: Array<{ id: string; title: string; priority: string; dueAt: Date }>;
  upcomingTasks: Array<{ id: string; title: string; priority: string; dueAt: Date }>;
  completedToday: number;
}

export interface ProductivityContext {
  activeSession: { id: string; title: string; status: string; elapsedSeconds: number } | null;
  todayFocusSeconds: number;
  completedSessionsToday: number;
}

export interface WellnessContext {
  waterConsumedMl: number;
  hydrationTargetMl: number;
  movementBreaks: number;
  eyeRestBreaks: number;
  remindersEnabled: boolean;
}

export interface FinanceContext {
  upcomingBills: Array<{ id: string; name: string; nextDueDate: string; reminderDaysBefore: number }>;
  currencyCode: string;
}

export interface LearningContext {
  overdueRevisions: Array<{ id: string; subjectName: string; topicTitle: string; dueAt: Date }>;
  dueTodayRevisions: Array<{ id: string; subjectName: string; topicTitle: string; dueAt: Date }>;
  activeSubjects: number;
  studyWeekSeconds: number;
  weakTopics: number;
}

export interface AssistantContext {
  capturedAt: Date;
  localDate: string;
  planner: PlannerContext | null;
  productivity: ProductivityContext | null;
  wellness: WellnessContext | null;
  finance: FinanceContext | null;
  learning: LearningContext | null;
  degradedModules: string[];
}

export interface AssistantFinding {
  dedupeKey: string;
  eventType: string;
  severity: 'info' | 'normal' | 'high' | 'critical';
  title: string;
  description: string;
  payload: Record<string, unknown>;
}

export interface AssistantEventPayloads {
  'task.created': { taskId: string; title: string };
  'task.updated': { taskId: string };
  'task.completed': { taskId: string };
  'task.deleted': { taskId: string };
  'productivity.session.started': { sessionId: string; title: string };
  'productivity.session.paused': { sessionId: string; title: string };
  'productivity.session.resumed': { sessionId: string; title: string };
  'productivity.session.completed': { sessionId: string; title: string };
  'learning.revision.scheduled': { revisionId: string; topicTitle: string };
  'learning.revision.completed': { revisionId: string; topicTitle: string };
  'assistant.monitor.requested': { reason: 'startup' | 'scheduler' | 'application_event' };
  'assistant.activity.created': { activityId: string; eventType: string };
  'assistant.state.changed': { state: string };
}

export type AssistantEventType = keyof AssistantEventPayloads;
export interface AssistantEvent<K extends AssistantEventType = AssistantEventType> {
  id: string;
  type: K;
  occurredAt: Date;
  payload: AssistantEventPayloads[K];
}
