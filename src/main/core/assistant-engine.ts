import * as repo from '../repositories/assistant-repository';
import * as wellness from '../modules/wellness/wellness-service';
import { assistantEventBus } from './event-bus';
import { assistantActions } from './action-registry';
import { gatherAssistantContext } from './context-manager';
import { evaluateAssistantRules, isWithinQuietHours } from './rule-engine';
import type { AssistantActivity, AssistantStatus, AssistantUpdate } from '../../shared/types/assistant';
import type { AssistantEventType } from './assistant-types';

type UpdateListener = (update: AssistantUpdate) => void;
let status: AssistantStatus = { state: 'initializing', monitoringEnabled: true, databaseAvailable: false, lastCheckedAt: null, unreadCount: 0, degradedModules: [], lastError: null };
let initialized = false;
let running = false;
let rerunRequested = false;
const listeners = new Set<UpdateListener>();
const unsubscribers: Array<() => void> = [];
const relevantEvents: AssistantEventType[] = ['task.created','task.updated','task.completed','task.deleted','productivity.session.started','productivity.session.paused','productivity.session.resumed','productivity.session.completed','learning.revision.scheduled','learning.revision.completed'];

function publish(update: AssistantUpdate): void {
  for (const listener of [...listeners]) {
    try { listener(update); } catch (error) { console.error('Assistant update listener failed:', error); }
  }
}

async function updateStatus(next: Partial<AssistantStatus>, latestActivity: AssistantActivity | null = null): Promise<void> {
  status = { ...status, ...next, unreadCount: status.databaseAvailable ? await repo.unreadActivityCount().catch(() => status.unreadCount) : 0 };
  publish({ status: { ...status, degradedModules: [...status.degradedModules] }, latestActivity });
  await assistantEventBus.emit('assistant.state.changed', { state: status.state });
}

async function deliverPendingNotifications(): Promise<void> {
  const settings = await wellness.getSettings();
  if (!settings.general.remindersEnabled || isWithinQuietHours(new Date(), settings.general.quietHoursEnabled, settings.general.quietStart, settings.general.quietEnd)) return;
  if (!await repo.monitoringEnabled()) return;
  const pending = await repo.pendingNotifications(20);
  const urgent = pending.filter(activity => activity.severity === 'high' || activity.severity === 'critical')
    .sort((a, b) => (a.severity === b.severity ? Number(a.eventType === 'assistant.daily_briefing') - Number(b.eventType === 'assistant.daily_briefing') : a.severity === 'critical' ? -1 : 1));
  const selected = urgent[0];
  if (selected) {
    try { await assistantActions.execute({ type: 'assistant.notify', activity: selected }); }
    catch (error) { console.error('Assistant notification delivery failed:', error); return; }
  }
  // Other findings remain available in the Assistant activity center without producing a notification burst.
  for (const activity of pending) await repo.markNotificationSent(activity.id);
}

async function monitorCycle(): Promise<void> {
  if (!initialized || !status.databaseAvailable) return;
  if (running) { rerunRequested = true; return; }
  running = true;
  try {
    const monitoringEnabled = await repo.monitoringEnabled();
    if (!monitoringEnabled) {
      await updateStatus({ state: 'paused', monitoringEnabled: false, degradedModules: [], lastError: null });
      return;
    }
    await updateStatus({ state: 'thinking', monitoringEnabled: true, lastError: null });
    const context = await gatherAssistantContext();
    await updateStatus({ state: 'planning', degradedModules: context.degradedModules });
    const findings = evaluateAssistantRules(context);
    if (findings.length) await updateStatus({ state: 'working' });
    let latest: AssistantActivity | null = null;
    for (const finding of findings) {
      if (!await repo.monitoringEnabled()) break;
      try {
        const saved = await assistantActions.execute({ type: 'assistant.record_activity', finding }) as { activity: AssistantActivity; inserted: boolean };
        if (saved.inserted) latest = saved.activity;
      } catch (error) { console.error('Assistant could not record a finding:', error); }
    }
    if (latest) publish({ status: { ...status }, latestActivity: latest });
    await updateStatus({ state: 'working', lastCheckedAt: context.capturedAt, degradedModules: context.degradedModules, lastError: null }, latest);
    try { await deliverPendingNotifications(); }
    catch (error) { console.error('Assistant notification checks failed:', error); }
    const attention = await repo.unreadActivityCount();
    const stillEnabled = await repo.monitoringEnabled();
    await updateStatus({
      state: !stillEnabled ? 'paused' : context.degradedModules.length && !context.planner && !context.productivity && !context.wellness && !context.finance && !context.learning ? 'error' : attention ? 'attention' : 'monitoring',
      monitoringEnabled: stillEnabled,
      unreadCount: attention
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assistant monitoring failed.';
    await updateStatus({ state: 'error', lastError: message });
    console.error('Assistant monitoring cycle failed:', error);
  } finally {
    running = false;
    if (rerunRequested) {
      rerunRequested = false;
      void monitorCycle();
    }
  }
}

async function requestMonitor(reason: 'startup'|'scheduler'|'application_event'): Promise<void> {
  await assistantEventBus.emit('assistant.monitor.requested', { reason });
}

/** Starts the process-owned assistant runtime; it remains alive while windows are hidden. */
export async function startAssistantEngine(databaseAvailable: boolean): Promise<void> {
  if (initialized) return;
  initialized = true;
  status = { ...status, state: databaseAvailable ? 'initializing' : 'offline', databaseAvailable, monitoringEnabled: databaseAvailable, lastError: null };
  if (!databaseAvailable) { publish({ status: { ...status }, latestActivity: null }); return; }
  try {
    status.monitoringEnabled = await repo.monitoringEnabled();
    for (const type of relevantEvents) {
      unsubscribers.push(assistantEventBus.on(type, () => requestMonitor('application_event')));
    }
    unsubscribers.push(assistantEventBus.on('assistant.monitor.requested', () => monitorCycle()));
    await updateStatus({ state: status.monitoringEnabled ? 'monitoring' : 'paused' });
  } catch (error) {
    await updateStatus({ state: 'error', lastError: error instanceof Error ? error.message : 'Assistant initialization failed.' });
  }
}

export async function runAssistantMonitorCycle(): Promise<void> {
  if (initialized && status.monitoringEnabled) await requestMonitor('scheduler');
}

export async function getAssistantStatus(): Promise<AssistantStatus> {
  if (status.databaseAvailable) {
    status = { ...status, unreadCount: await repo.unreadActivityCount().catch(() => status.unreadCount) };
    if (status.state === 'attention' && status.unreadCount === 0 && status.monitoringEnabled) status = { ...status, state: 'monitoring' };
    if (status.state === 'monitoring' && status.unreadCount > 0) status = { ...status, state: 'attention' };
  }
  return { ...status, degradedModules: [...status.degradedModules] };
}

export function getAssistantActivities(limit = 40, includeDismissed = false): Promise<AssistantActivity[]> {
  if (!status.databaseAvailable) return Promise.resolve([]);
  return repo.listActivities(limit, includeDismissed);
}

export async function setAssistantMonitoring(enabled: boolean): Promise<AssistantStatus> {
  if (!status.databaseAvailable) throw new Error('Assistant monitoring needs the local database.');
  if (typeof enabled !== 'boolean') throw new Error('Monitoring preference must be enabled or disabled.');
  await repo.setMonitoringEnabled(enabled);
  status = { ...status, monitoringEnabled: enabled, state: enabled ? 'monitoring' : 'paused', lastError: null };
  publish({ status: await getAssistantStatus(), latestActivity: null });
  if (enabled) await requestMonitor('application_event');
  return getAssistantStatus();
}

export async function markAssistantActivityRead(id: string): Promise<void> {
  if (!status.databaseAvailable || !await repo.markActivityRead(id)) throw new Error('Assistant activity was not found or was already handled.');
  publish({ status: await getAssistantStatus(), latestActivity: null });
}

export async function dismissAssistantActivity(id: string): Promise<void> {
  if (!status.databaseAvailable || !await repo.dismissActivity(id)) throw new Error('Assistant activity was not found or was already dismissed.');
  publish({ status: await getAssistantStatus(), latestActivity: null });
}

export function subscribeAssistantUpdates(listener: UpdateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function stopAssistantEngine(): Promise<void> {
  for (const unsubscribe of unsubscribers.splice(0)) unsubscribe();
  initialized = false;
  running = false;
  status = { ...status, state: 'idle' };
  publish({ status: { ...status }, latestActivity: null });
}
