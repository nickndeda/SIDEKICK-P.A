import { getTasks } from '../repositories/task-repository';
import * as productivity from '../modules/productivity/productivity-service';
import * as wellness from '../modules/wellness/wellness-service';
import * as finance from '../modules/finance/finance-service';
import * as learning from '../modules/learning/learning-service';
import type { AssistantContext } from './assistant-types';

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

/** Builds a small, purpose-specific snapshot. Each module can fail independently. */
export async function gatherAssistantContext(now = new Date()): Promise<AssistantContext> {
  const [taskResult, sessionsResult, productivityResult, wellnessResult, wellnessSettingsResult, billsResult, learningOverviewResult, overdueResult, dueTodayResult] = await Promise.allSettled([
    getTasks(),
    productivity.getTodaySessions(),
    Promise.all([productivity.getActiveSession(), productivity.getSummary()]),
    wellness.getDailySummary(),
    wellness.getSettings(),
    finance.getBills(),
    learning.getOverview(),
    learning.overdueRevisions(),
    learning.dueToday()
  ]);

  const degradedModules: string[] = [];
  if (taskResult.status === 'rejected') degradedModules.push('planner');
  if (sessionsResult.status === 'rejected' || productivityResult.status === 'rejected') degradedModules.push('productivity');
  if (wellnessResult.status === 'rejected' || wellnessSettingsResult.status === 'rejected') degradedModules.push('wellness');
  if (billsResult.status === 'rejected') degradedModules.push('finance');
  if ([learningOverviewResult, overdueResult, dueTodayResult].some(result => result.status === 'rejected')) degradedModules.push('learning');

  const today = dateKey(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const tasks = taskResult.status === 'fulfilled' ? taskResult.value : [];
  const planner = taskResult.status === 'fulfilled' ? {
    overdueTasks: tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled' && task.dueAt && task.dueAt.getTime() < now.getTime()).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 20).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt! })),
    dueToday: tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled' && task.dueAt && dateKey(task.dueAt) === today && task.dueAt.getTime() >= now.getTime()).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 20).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt! })),
    upcomingTasks: tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled' && task.dueAt && dateKey(task.dueAt) > today && task.dueAt <= nextWeek).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 10).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt! })),
    completedToday: tasks.filter(task => task.status === 'completed' && task.completedAt && dateKey(task.completedAt) === today).length
  } : null;

  const sessions = sessionsResult.status === 'fulfilled' ? sessionsResult.value : [];
  const productivitySnapshot = productivityResult.status === 'fulfilled' ? productivityResult.value : null;
  const productivityContext = productivitySnapshot ? {
    activeSession: productivitySnapshot[0] ? { id: productivitySnapshot[0].id, title: productivitySnapshot[0].title, status: productivitySnapshot[0].status, elapsedSeconds: productivitySnapshot[0].elapsedSeconds } : null,
    todayFocusSeconds: productivitySnapshot[1].todayFocusMinutes * 60,
    completedSessionsToday: productivitySnapshot[1].todayCompletedSessions
  } : sessionsResult.status === 'fulfilled' ? { activeSession: null, todayFocusSeconds: 0, completedSessionsToday: sessions.filter(session => session.status === 'completed').length } : null;

  const learningOverview = learningOverviewResult.status === 'fulfilled' ? learningOverviewResult.value : null;
  const revisions = (result: typeof overdueResult) => result.status === 'fulfilled' ? result.value.slice(0, 20).map(item => ({ id: item.id, subjectName: item.subjectName, topicTitle: item.topicTitle, dueAt: item.dueAt })) : [];
  const financeBills = billsResult.status === 'fulfilled' ? billsResult.value.filter(bill => bill.status === 'active' && bill.nextDueDate <= dateKey(nextWeek) && (!bill.endDate || bill.nextDueDate <= bill.endDate)).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, 10).map(bill => ({ id: bill.id, name: bill.name, nextDueDate: bill.nextDueDate, reminderDaysBefore: bill.reminderDaysBefore })) : null;

  return {
    capturedAt: now,
    localDate: today,
    planner,
    productivity: productivityContext,
    wellness: wellnessResult.status === 'fulfilled' && wellnessSettingsResult.status === 'fulfilled' ? {
      waterConsumedMl: wellnessResult.value.waterConsumedMl,
      hydrationTargetMl: wellnessResult.value.hydrationTargetMl,
      movementBreaks: wellnessResult.value.movementBreaks,
      eyeRestBreaks: wellnessResult.value.eyeRestBreaks,
      remindersEnabled: wellnessSettingsResult.value.general.remindersEnabled
    } : null,
    finance: billsResult.status === 'fulfilled' ? { upcomingBills: financeBills ?? [], currencyCode: (await finance.getSettings().catch(() => ({ currencyCode: 'KES' }))).currencyCode } : null,
    learning: learningOverview && overdueResult.status === 'fulfilled' && dueTodayResult.status === 'fulfilled' ? {
      overdueRevisions: revisions(overdueResult),
      dueTodayRevisions: revisions(dueTodayResult),
      activeSubjects: learningOverview.activeSubjects,
      studyWeekSeconds: learningOverview.studyWeekSeconds,
      weakTopics: learningOverview.weakTopics.length
    } : null,
    degradedModules: [...new Set(degradedModules)]
  };
}
