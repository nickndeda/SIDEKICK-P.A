import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  faBullseye,
  faCalendarCheck,
  faCheck,
  faClock,
  faRotate
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '../components/AppIcon';

type Task = Awaited<ReturnType<typeof window.sidekick.tasks.list>>[number];
type Session = Awaited<ReturnType<typeof window.sidekick.productivity.today>>[number];
type Summary = Awaited<ReturnType<typeof window.sidekick.productivity.summary>>;
type WellnessSummary = Awaited<ReturnType<typeof window.sidekick.wellness.summary>>;

interface OverviewData {
  tasks: Task[];
  todaySessions: Session[];
  activeSession: Awaited<ReturnType<typeof window.sidekick.productivity.active>>;
  summary: Summary;
  wellnessSummary: WellnessSummary | null;
}

function localDateKey(value: Date | string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(value: Date | string | null): string {
  if (!value) return 'No deadline';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid deadline';

  return new Intl.DateTimeFormat('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return formatMinutes(minutes);
}

function isOpenTask(task: Task): boolean {
  return task.status === 'pending' || task.status === 'in_progress';
}

function sessionLabel(session: Session): string {
  if (session.sessionType === 'short_break') return 'Short break';
  if (session.sessionType === 'long_break') return 'Long break';
  return 'Focus session';
}

interface OverviewPageProps {
  onNavigate: (section: string) => void;
}

function OverviewPage({ onNavigate }: OverviewPageProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const coreData = Promise.all([
        window.sidekick.tasks.list(),
        window.sidekick.productivity.today(),
        window.sidekick.productivity.active(),
        window.sidekick.productivity.summary()
      ]);
      const wellnessData = window.sidekick.wellness.summary().catch(() => null);
      const [[tasks, todaySessions, activeSession, summary], wellnessSummary] = await Promise.all([
        coreData,
        wellnessData
      ]);
      setData({ tasks, todaySessions, activeSession, summary, wellnessSummary });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load your dashboard data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const taskGroups = useMemo(() => {
    const now = new Date();
    const todayKey = localDateKey(now);
    const openTasks = data?.tasks.filter(isOpenTask) ?? [];
    const dueToday = openTasks.filter(
      (task) =>
        task.dueAt &&
        localDateKey(task.dueAt) === todayKey &&
        new Date(task.dueAt).getTime() >= now.getTime()
    );
    const overdue = openTasks.filter(
      (task) => task.dueAt && new Date(task.dueAt).getTime() < now.getTime()
    );
    const upcoming = openTasks
      .filter((task) => task.dueAt && new Date(task.dueAt).getTime() > now.getTime())
      .sort((left, right) =>
        new Date(left.dueAt!).getTime() - new Date(right.dueAt!).getTime()
      )
      .slice(0, 5);

    return {
      dueToday,
      overdue,
      completed: data?.tasks.filter((task) => task.status === 'completed').length ?? 0,
      upcoming
    };
  }, [data?.tasks]);

  return (
    <section className="overview-page">
      <div className="overview-welcome">
        <div>
          <span className="overview-eyebrow">YOUR PERSONAL WORKSPACE</span>
          <h2>Good morning.</h2>
          <p>Planner tasks and focus activity, together in one place.</p>
        </div>
        <div className="overview-welcome-actions">
          <div className="overview-date">
            {new Intl.DateTimeFormat('en-KE', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).format(new Date())}
          </div>
          <button
            type="button"
            className="overview-refresh"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Refresh overview"
          >
            <AppIcon icon={faRotate} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="overview-error" role="alert">{error}</div>}

      <div className="overview-section-heading">
        <div>
          <h3>Your day at a glance</h3>
          <p>Current tasks and productivity from your Planner and focus sessions.</p>
        </div>
      </div>

      <div className="overview-grid">
        <article className="overview-card">
          <span className="overview-card-label">Tasks due today</span>
          <strong>{loading || !data ? '—' : taskGroups.dueToday.length}</strong>
          <span className="overview-card-note">{data ? `${taskGroups.overdue.length} overdue` : 'Planner status unavailable'}</span>
        </article>
        <article className="overview-card overview-card-overdue">
          <span className="overview-card-label">Overdue tasks</span>
          <strong>{loading || !data ? '—' : taskGroups.overdue.length}</strong>
          <span className="overview-card-note">Open tasks past their deadline</span>
        </article>
        <article className="overview-card">
          <span className="overview-card-label">Tasks completed</span>
          <strong>{loading || !data ? '—' : taskGroups.completed}</strong>
          <span className="overview-card-note">Completed in Planner</span>
        </article>
        <article className="overview-card">
          <span className="overview-card-label">Focused today</span>
          <strong>{loading || !data ? '—' : formatMinutes(data.summary.todayFocusMinutes)}</strong>
          <span className="overview-card-note">
            {data ? `${data.todaySessions.length} sessions · completed focus time` : 'Productivity status unavailable'}
          </span>
        </article>
      </div>

      <div className="overview-content-grid">
        <article className="overview-detail-card">
          <div className="overview-detail-heading">
            <div className="overview-detail-icon"><AppIcon icon={faCalendarCheck} /></div>
            <div>
              <h3>Today’s sessions</h3>
              <p>{data ? `${data.todaySessions.length} sessions recorded today` : 'Session history unavailable'}</p>
            </div>
            <button type="button" onClick={() => onNavigate('productivity')}>Productivity</button>
          </div>

          {loading || !data ? (
            <p className="overview-empty-state">Loading sessions…</p>
          ) : data?.todaySessions.length ? (
            <ul className="overview-session-list">
              {data.todaySessions.slice(0, 5).map((session) => (
                <li key={session.id}>
                  <span className="overview-list-icon"><AppIcon icon={faBullseye} /></span>
                  <span className="overview-list-main">
                    <strong>{session.title}</strong>
                    <small>{sessionLabel(session)} · {session.status}</small>
                  </span>
                  <span className="overview-list-value">{formatElapsed(session.elapsedSeconds)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="overview-empty-state">No productivity sessions yet today.</p>
          )}
        </article>

        <article className="overview-detail-card overview-current-card">
          <div className="overview-detail-heading">
            <div className="overview-detail-icon"><AppIcon icon={faClock} /></div>
            <div>
              <h3>Current productivity status</h3>
          <p>{!data ? 'Status unavailable' : data.activeSession ? 'A session is in progress' : 'Ready for a focus session'}</p>
            </div>
          </div>
          {!data ? (
            <p className="overview-empty-state">Current session status could not be loaded.</p>
          ) : data.activeSession ? (
            <div className="overview-active-session">
              <span className={`overview-active-status overview-active-status-${data.activeSession.status}`}>
                {data.activeSession.status}
              </span>
              <strong>{data.activeSession.title}</strong>
              <span>{formatElapsed(data.activeSession.elapsedSeconds)} elapsed of {data.activeSession.targetMinutes} min</span>
              <button type="button" onClick={() => onNavigate('productivity')}>Open session</button>
            </div>
          ) : (
            <div className="overview-no-session">
              <p>No active session</p>
              <button type="button" onClick={() => onNavigate('productivity')}>
                <AppIcon icon={faBullseye} /> Start a focus session
              </button>
            </div>
          )}
        </article>
      </div>

      <article className="overview-wellness-summary">
        <div className="overview-wellness-heading">
          <div>
            <span className="overview-eyebrow">WELLNESS</span>
            <h3>Daily wellness</h3>
            <p>Hydration, movement and eye-rest entries recorded today.</p>
          </div>
          <button type="button" onClick={() => onNavigate('wellness')}>Open Wellness</button>
        </div>
        {!data?.wellnessSummary ? (
          <p className="overview-wellness-unavailable">Wellness summary is unavailable right now.</p>
        ) : (
          <>
            <div className="overview-wellness-progress">
              <div className="overview-wellness-progress-label">
                <span>Water</span>
                <strong>{data.wellnessSummary.waterConsumedMl} / {data.wellnessSummary.hydrationTargetMl} ml</strong>
              </div>
              <div className="overview-wellness-track" role="progressbar" aria-label="Today's hydration progress" aria-valuenow={Math.min(100, Math.round(data.wellnessSummary.waterConsumedMl / Math.max(1, data.wellnessSummary.hydrationTargetMl) * 100))} aria-valuemin={0} aria-valuemax={100}>
                <div style={{ width: `${Math.min(100, Math.round(data.wellnessSummary.waterConsumedMl / Math.max(1, data.wellnessSummary.hydrationTargetMl) * 100))}%` }} />
              </div>
            </div>
            <div className="overview-wellness-stats">
              <span><strong>{data.wellnessSummary.movementBreaks}</strong> movement breaks</span>
              <span><strong>{data.wellnessSummary.eyeRestBreaks}</strong> eye-rest breaks</span>
              <span><strong>{data.wellnessSummary.upcomingReminders.length}</strong> active reminders</span>
              <span><strong>{data.wellnessSummary.remindersEnabled ? 'On' : 'Off'}</strong> reminder status</span>
            </div>
            <p className="overview-wellness-next">
              {data.wellnessSummary.upcomingReminders[0]
                ? `Next: ${data.wellnessSummary.upcomingReminders[0].title} · ${formatTime(data.wellnessSummary.upcomingReminders[0].snoozedUntil ?? data.wellnessSummary.upcomingReminders[0].scheduledAt)}`
                : 'No upcoming wellness reminders.'}
            </p>
          </>
        )}
      </article>

      <div className="overview-section-heading overview-upcoming-heading">
        <div>
          <h3>Upcoming tasks and deadlines</h3>
          <p>Your next open Planner tasks with a scheduled deadline.</p>
        </div>
        <button type="button" className="overview-text-button" onClick={() => onNavigate('planner')}>
          Open Planner
        </button>
      </div>

      <article className="overview-upcoming-card">
        {loading || !data ? (
          <p className="overview-empty-state">
            {loading ? 'Loading upcoming tasks…' : 'Upcoming tasks could not be loaded.'}
          </p>
        ) : taskGroups.upcoming.length ? (
          <ul className="overview-task-list">
            {taskGroups.upcoming.map((task) => (
              <li key={task.id}>
                <span className="overview-task-check"><AppIcon icon={faCheck} /></span>
                <span className="overview-list-main">
                  <strong>{task.title}</strong>
                  <small>{task.status.replace('_', ' ')}</small>
                </span>
                <time dateTime={new Date(task.dueAt!).toISOString()}>{formatTime(task.dueAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="overview-empty-state">No upcoming deadlines. Add or schedule a task in Planner.</p>
        )}
      </article>
    </section>
  );
}

export default OverviewPage;
