import { getTasks } from '../repositories/task-repository';
import * as productivity from '../modules/productivity/productivity-service';
import * as wellness from '../modules/wellness/wellness-service';
import * as finance from '../modules/finance/finance-service';
import * as learning from '../modules/learning/learning-service';
import type { AssistantContextSources } from '../../shared/types/assistant';
import type { AssistantContext } from './assistant-types';

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

const allSources:AssistantContextSources={planner:true,productivity:true,wellness:true,finance:true,learning:true};

/** Builds a small, purpose-specific snapshot. Disabled sources are not queried. */
export async function gatherAssistantContext(now = new Date(), sources:AssistantContextSources=allSources): Promise<AssistantContext> {
  const [taskResult, sessionsResult, productivityResult, wellnessResult, wellnessSettingsResult, billsResult, financeSettingsResult, learningOverviewResult, overdueResult, dueTodayResult] = await Promise.allSettled([
    sources.planner ? getTasks() : Promise.resolve(null),
    sources.productivity ? productivity.getTodaySessions() : Promise.resolve(null),
    sources.productivity ? Promise.all([productivity.getActiveSession(), productivity.getSummary()]) : Promise.resolve(null),
    sources.wellness ? wellness.getDailySummary() : Promise.resolve(null),
    sources.wellness ? wellness.getSettings() : Promise.resolve(null),
    sources.finance ? finance.getBills() : Promise.resolve(null),
    sources.finance ? finance.getSettings() : Promise.resolve(null),
    sources.learning ? learning.getOverview() : Promise.resolve(null),
    sources.learning ? learning.overdueRevisions() : Promise.resolve(null),
    sources.learning ? learning.dueToday() : Promise.resolve(null)
  ]);

  const degradedModules: string[] = [];
  if (sources.planner && taskResult.status === 'rejected') degradedModules.push('planner');
  if (sources.productivity && (sessionsResult.status === 'rejected' || productivityResult.status === 'rejected')) degradedModules.push('productivity');
  if (sources.wellness && (wellnessResult.status === 'rejected' || wellnessSettingsResult.status === 'rejected')) degradedModules.push('wellness');
  if (sources.finance && (billsResult.status === 'rejected' || financeSettingsResult.status === 'rejected')) degradedModules.push('finance');
  if (sources.learning && [learningOverviewResult, overdueResult, dueTodayResult].some(result => result.status === 'rejected')) degradedModules.push('learning');

  const today = dateKey(now);
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const tasks = taskResult.status === 'fulfilled' && taskResult.value ? taskResult.value : [];
  const planner = sources.planner && taskResult.status === 'fulfilled' && taskResult.value ? {
    overdueTasks: tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled' && task.dueAt && task.dueAt.getTime() < now.getTime()).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 20).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt! })),
    dueToday: tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled' && task.dueAt && dateKey(task.dueAt) === today && task.dueAt.getTime() >= now.getTime()).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 20).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt! })),
    upcomingTasks: tasks.filter(task => task.status !== 'completed' && task.status !== 'cancelled' && task.dueAt && dateKey(task.dueAt) > today && task.dueAt <= nextWeek).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime()).slice(0, 10).map(task => ({ id: task.id, title: task.title, priority: task.priority, dueAt: task.dueAt! })),
    completedToday: tasks.filter(task => task.status === 'completed' && task.completedAt && dateKey(task.completedAt) === today).length
  } : null;

  const sessions = sessionsResult.status === 'fulfilled' && sessionsResult.value ? sessionsResult.value : [];
  const productivitySnapshot = productivityResult.status === 'fulfilled' ? productivityResult.value : null;
  const productivityContext = !sources.productivity ? null : productivitySnapshot ? {
    activeSession: productivitySnapshot[0] ? { id: productivitySnapshot[0].id, title: productivitySnapshot[0].title, status: productivitySnapshot[0].status, elapsedSeconds: productivitySnapshot[0].elapsedSeconds } : null,
    todayFocusSeconds: productivitySnapshot[1].todayFocusMinutes * 60,
    completedSessionsToday: productivitySnapshot[1].todayCompletedSessions
  } : sessionsResult.status === 'fulfilled' ? { activeSession: null, todayFocusSeconds: 0, completedSessionsToday: sessions.filter(session => session.status === 'completed').length } : null;

  const learningOverview = learningOverviewResult.status === 'fulfilled' ? learningOverviewResult.value : null;
  const revisions = (result: typeof overdueResult) => result.status === 'fulfilled' && result.value ? result.value.slice(0, 20).map(item => ({ id: item.id, subjectName: item.subjectName, topicTitle: item.topicTitle, dueAt: item.dueAt })) : [];
  const financeBills = billsResult.status === 'fulfilled' && billsResult.value ? billsResult.value.filter(bill => bill.status === 'active' && bill.nextDueDate <= dateKey(nextWeek) && (!bill.endDate || bill.nextDueDate <= bill.endDate)).sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, 10).map(bill => ({ id: bill.id, name: bill.name, nextDueDate: bill.nextDueDate, reminderDaysBefore: bill.reminderDaysBefore })) : null;

  return {
    capturedAt: now,
    localDate: today,
    planner,
    productivity: productivityContext,
    wellness: sources.wellness && wellnessResult.status === 'fulfilled' && wellnessResult.value && wellnessSettingsResult.status === 'fulfilled' && wellnessSettingsResult.value ? {
      waterConsumedMl: wellnessResult.value.waterConsumedMl,
      hydrationTargetMl: wellnessResult.value.hydrationTargetMl,
      movementBreaks: wellnessResult.value.movementBreaks,
      eyeRestBreaks: wellnessResult.value.eyeRestBreaks,
      remindersEnabled: wellnessSettingsResult.value.general.remindersEnabled
    } : null,
    finance: sources.finance && billsResult.status === 'fulfilled' && financeSettingsResult.status === 'fulfilled' && financeSettingsResult.value ? { upcomingBills: financeBills ?? [], currencyCode: financeSettingsResult.value.currencyCode } : null,
    learning: sources.learning && learningOverview && overdueResult.status === 'fulfilled' && dueTodayResult.status === 'fulfilled' ? {
      overdueRevisions: revisions(overdueResult),
      dueTodayRevisions: revisions(dueTodayResult),
      activeSubjects: learningOverview.activeSubjects,
      studyWeekSeconds: learningOverview.studyWeekSeconds,
      weakTopics: learningOverview.weakTopics.length
    } : null,
    degradedModules: [...new Set(degradedModules)],
    omittedModules: (Object.entries(sources) as Array<[keyof AssistantContextSources,boolean]>).filter(([,enabled])=>!enabled).map(([name])=>name)
  };
}
