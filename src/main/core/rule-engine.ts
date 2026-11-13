import type { AssistantContext, AssistantFinding } from './assistant-types';

const PRIORITY_WEIGHT: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };
const DAY_MS = 86_400_000;

function localDate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

/** Predictable, explainable rules. These rules do not make or edit user records. */
export function evaluateAssistantRules(context: AssistantContext): AssistantFinding[] {
  const findings: AssistantFinding[] = [];
  const now = context.capturedAt.getTime();
  const today = context.localDate;
  const priority = (value: string) => PRIORITY_WEIGHT[value] ?? 1;

  for (const task of context.planner?.overdueTasks ?? []) {
    if (priority(task.priority) < PRIORITY_WEIGHT.high) continue;
    findings.push({
      dedupeKey: `task.overdue:${task.id}:${localDate(task.dueAt)}`,
      eventType: 'task.overdue',
      severity: task.priority === 'critical' ? 'critical' : 'high',
      title: task.priority === 'critical' ? 'Critical task is overdue' : 'High-priority task is overdue',
      description: `${task.title} was due ${task.dueAt.toLocaleString()}. It is still open.`,
      payload: { taskId: task.id, priority: task.priority, dueAt: task.dueAt.toISOString() }
    });
  }

  for (const task of context.planner?.dueToday ?? []) {
    const hours = (task.dueAt.getTime() - now) / 3_600_000;
    if (hours < 0 || hours > 24 || priority(task.priority) < PRIORITY_WEIGHT.high) continue;
    findings.push({
      dedupeKey: `task.deadline-soon:${task.id}:${localDate(task.dueAt)}`,
      eventType: 'task.deadline.approaching',
      severity: task.priority === 'critical' ? 'critical' : 'high',
      title: 'Important deadline approaching',
      description: `${task.title} is due today at ${task.dueAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}. Consider setting aside time for it.`,
      payload: { taskId: task.id, priority: task.priority, dueAt: task.dueAt.toISOString() }
    });
  }

  const overdueRevisions = context.learning?.overdueRevisions ?? [];
  if (overdueRevisions.length) {
    const revisionIds = overdueRevisions.map(revision => revision.id).sort();
    findings.push({
      dedupeKey: `learning.revisions.overdue:${revisionIds.join(',')}`,
      eventType: 'learning.revision.overdue',
      severity: 'high',
      title: overdueRevisions.length === 1 ? 'A learning revision is overdue' : `${overdueRevisions.length} learning revisions are overdue`,
      description: overdueRevisions.slice(0, 3).map(revision => `${revision.subjectName}: ${revision.topicTitle}`).join('; ') + (overdueRevisions.length > 3 ? `; and ${overdueRevisions.length - 3} more` : ''),
      payload: { revisionIds }
    });
  }

  const urgentCount = findings.length;
  const dueCount = context.planner?.dueToday.length ?? 0;
  const overdueCount = context.planner?.overdueTasks.length ?? 0;
  const revisionCount = context.learning?.dueTodayRevisions.length ?? 0;
  const billCount = context.finance?.upcomingBills.length ?? 0;
  const highPriorityTask = [...(context.planner?.overdueTasks ?? []), ...(context.planner?.dueToday ?? [])]
    .find(task => priority(task.priority) >= PRIORITY_WEIGHT.high);
  const hasRevision = revisionCount > 0 || overdueRevisions.length > 0;
  if (dueCount || overdueCount || revisionCount || billCount) {
    const summary = [
      overdueCount ? `${overdueCount} open ${overdueCount === 1 ? 'task is' : 'tasks are'} overdue` : '',
      dueCount ? `${dueCount} ${dueCount === 1 ? 'task is' : 'tasks are'} due today` : '',
      revisionCount ? `${revisionCount} learning ${revisionCount === 1 ? 'revision is' : 'revisions are'} due today` : '',
      billCount ? `${billCount} ${billCount === 1 ? 'bill is' : 'bills are'} approaching` : ''
    ].filter(Boolean);
    const explanation = highPriorityTask && hasRevision
      ? `A ${highPriorityTask.priority}-priority task and a learning revision need attention today. Handle “${highPriorityTask.title}” first, then reserve time for the revision.`
      : highPriorityTask
        ? `“${highPriorityTask.title}” is your highest-priority open deadline today.`
        : '';
    findings.push({
      dedupeKey: `assistant.daily-overview:${today}`,
      eventType: 'assistant.daily_briefing',
      severity: urgentCount ? 'high' : 'normal',
      title: 'Today’s priorities',
      description: `${summary.join('. ')}. ${explanation} ${context.productivity?.activeSession ? `Your ${context.productivity.activeSession.title} session is ${context.productivity.activeSession.status}.` : ''}`.trim(),
      payload: { dueCount, overdueCount, revisionCount, billCount, urgentCount, explanation }
    });
  }

  return findings;
}

export function isWithinQuietHours(now: Date, enabled: boolean, start: string, end: string): boolean {
  if (!enabled) return false;
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const current = now.getHours() * 60 + now.getMinutes();
  const startValue = startHour * 60 + startMinute;
  const endValue = endHour * 60 + endMinute;
  return startValue < endValue ? current >= startValue && current < endValue : current >= startValue || current < endValue;
}

export function isBillDueWithinDays(dueDate: string, now: Date, days: number): boolean {
  const today = new Date(`${localDate(now)}T00:00:00`).getTime();
  const due = new Date(`${dueDate}T00:00:00`).getTime();
  return Number.isFinite(due) && due >= today && due <= today + Math.max(0, days) * DAY_MS;
}
