
import { useCallback, useEffect, useState } from 'react';

import {
  faPlay,
  faPause,
  faCheck,
  faXmark,
  faRotate,
  faClock,
  faBullseye,
  faCalendarDays,
  faListCheck
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '../components/AppIcon';

import '../styles/productivity.css';

type ProductivitySession =
  Awaited<ReturnType<typeof window.sidekick.productivity.active>>;

type ProductivitySessionType =
  'focus' | 'short_break' | 'long_break';

type ProductivitySummary =
  Awaited<ReturnType<typeof window.sidekick.productivity.summary>>;
type PlannerTask = Awaited<ReturnType<typeof window.sidekick.tasks.list>>[number];

const durationOptions = [25, 50, 60, 90];

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, '0'),
      String(minutes).padStart(2, '0'),
      String(seconds).padStart(2, '0')
    ].join(':');
  }

  return [
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0')
  ].join(':');
}

function formatDate(value: Date | string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function getSessionTypeLabel(type: ProductivitySessionType): string {
  switch (type) {
    case 'short_break':
      return 'Short break';
    case 'long_break':
      return 'Long break';
    default:
      return 'Focus session';
  }
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function ProductivityPage() {
  const [activeSession, setActiveSession] =
    useState<ProductivitySession>(null);

  const [history, setHistory] = useState<
    Awaited<ReturnType<typeof window.sidekick.productivity.history>>
  >([]);

  const [summary, setSummary] = useState<ProductivitySummary | null>(null);
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [title, setTitle] = useState('Focus session');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [sessionType, setSessionType] =
    useState<ProductivitySessionType>('focus');

  const [targetMinutes, setTargetMinutes] = useState(25);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refreshProductivity = useCallback(async () => {
    const [active, sessions, statistics] = await Promise.all([
      window.sidekick.productivity.active(),
      window.sidekick.productivity.history(),
      window.sidekick.productivity.summary()
    ]);

    setActiveSession(active);
    setHistory(sessions);
    setSummary(statistics);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize(): Promise<void> {
      try {
        const [active, sessions, statistics, plannerTasks] = await Promise.all([
          window.sidekick.productivity.active(),
          window.sidekick.productivity.history(),
          window.sidekick.productivity.summary(),
          window.sidekick.tasks.list({ status: 'pending' }).then(async (pending) => [
            ...pending,
            ...await window.sidekick.tasks.list({ status: 'in_progress' })
          ])
        ]);

        if (!mounted) {
          return;
        }

        setActiveSession(active);
        setHistory(sessions);
        setSummary(statistics);
        setTasks(plannerTasks);
        setElapsedSeconds(active?.elapsedSeconds ?? 0);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load productivity data.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setElapsedSeconds(activeSession?.elapsedSeconds ?? 0);
  }, [activeSession?.id, activeSession?.elapsedSeconds]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== 'running') {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [activeSession?.id, activeSession?.status]);

  async function runAction(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError('');

    try {
      await action();
      await refreshProductivity();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'The productivity operation failed.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleStart(): Promise<void> {
    setBusy(true);
    setError('');

    try {
      const cleanTitle = title.trim() || 'Focus session';

      await window.sidekick.productivity.start({
        title: cleanTitle,
        sessionType,
        targetMinutes,
        taskId: selectedTaskId ? Number(selectedTaskId) : null
      });

      await refreshProductivity();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to start the session.'
      );
    } finally {
      setBusy(false);
    }
  }

  const remainingSeconds = activeSession
    ? Math.max(
        0,
        activeSession.targetMinutes * 60 - elapsedSeconds
      )
    : targetMinutes * 60;

  const progress = activeSession
    ? Math.min(
        100,
        (elapsedSeconds / (activeSession.targetMinutes * 60)) * 100
      )
    : 0;

  const weeklyData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));

    const key = getLocalDateKey(date);

    const minutes =
      summary?.dailyFocus.find((item) => item.date === key)?.focusMinutes ?? 0;

    return {
      key,
      label: new Intl.DateTimeFormat('en-KE', {
        weekday: 'short'
      }).format(date),
      minutes
    };
  });

  const maximumWeeklyMinutes = Math.max(
    1,
    ...weeklyData.map((item) => item.minutes)
  );

  if (loading) {
    return (
      <section className="productivity-page">
        <div className="productivity-loading">
          Loading productivity data...
        </div>
      </section>
    );
  }

  return (
    <section className="productivity-page">
      <div className="productivity-heading">
        <div>
          <span className="productivity-eyebrow">
            TIME MANAGEMENT
          </span>

          <h2>Productivity</h2>

          <p>
            Build focused work sessions and understand how you spend your time.
          </p>
        </div>

        <button
          type="button"
          className="productivity-refresh"
          onClick={() => {
            void runAction(refreshProductivity);
          }}
          disabled={busy}
        >
          <AppIcon icon={faRotate} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="productivity-error" role="alert">
          {error}
        </div>
      )}

      <div className="productivity-stats">
        <article className="productivity-stat-card">
          <div className="productivity-stat-icon">
            <AppIcon icon={faClock} />
          </div>

          <span>Today's focus time</span>

          <strong>{summary?.todayFocusMinutes ?? 0} min</strong>

          <small>Completed focus sessions</small>
        </article>

        <article className="productivity-stat-card">
          <div className="productivity-stat-icon">
            <AppIcon icon={faBullseye} />
          </div>

          <span>Sessions started</span>

          <strong>{summary?.todaySessions ?? 0}</strong>

          <small>Today</small>
        </article>

        <article className="productivity-stat-card">
          <div className="productivity-stat-icon">
            <AppIcon icon={faCheck} />
          </div>

          <span>Sessions completed</span>

          <strong>{summary?.todayCompletedSessions ?? 0}</strong>

          <small>Today</small>
        </article>

        <article className="productivity-stat-card">
          <div className="productivity-stat-icon">
            <AppIcon icon={faCalendarDays} />
          </div>

          <span>This week's focus</span>

          <strong>{summary?.weeklyFocusMinutes ?? 0} min</strong>

          <small>Last seven days</small>
        </article>
      </div>

      <div className="productivity-main-grid">
        <article className="productivity-panel productivity-timer-panel">
          <div className="productivity-panel-heading">
            <div>
              <h3>Focus timer</h3>
              <p>Choose a session and give it your attention.</p>
            </div>

            <span className="productivity-live-indicator">
              {activeSession ? 'Session active' : 'Ready'}
            </span>
          </div>

          {activeSession ? (
            <div className="productivity-active-session">
              <span className="productivity-session-type">
                {getSessionTypeLabel(activeSession.sessionType)}
              </span>

              <h4>{activeSession.title}</h4>

              <div
                className="productivity-timer"
                aria-live="off"
              >
                {formatTime(remainingSeconds)}
              </div>

              <div className="productivity-progress-track">
                <div
                  className="productivity-progress-value"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="productivity-timer-meta">
                <span>
                  {formatTime(elapsedSeconds)} elapsed
                </span>

                <span>
                  {activeSession.targetMinutes} min target
                </span>
              </div>

              {remainingSeconds === 0 && (
                <p className="productivity-target-reached">
                  Target reached. You can complete the session when ready.
                </p>
              )}

              <div className="productivity-session-controls">
                {activeSession.status === 'running' ? (
                  <button
                    type="button"
                    className="productivity-button productivity-button-secondary"
                    disabled={busy}
                    onClick={() => {
                      void runAction(() =>
                        window.sidekick.productivity.pause(activeSession.id)
                      );
                    }}
                  >
                    <AppIcon icon={faPause} />
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    className="productivity-button productivity-button-primary"
                    disabled={busy}
                    onClick={() => {
                      void runAction(() =>
                        window.sidekick.productivity.resume(activeSession.id)
                      );
                    }}
                  >
                    <AppIcon icon={faPlay} />
                    Resume
                  </button>
                )}

                <button
                  type="button"
                  className="productivity-button productivity-button-success"
                  disabled={busy}
                  onClick={() => {
                    void runAction(() =>
                      window.sidekick.productivity.complete(activeSession.id)
                    );
                  }}
                >
                  <AppIcon icon={faCheck} />
                  Complete
                </button>

                <button
                  type="button"
                  className="productivity-button productivity-button-danger"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Cancel this session? Its recorded time will remain in your history as a cancelled session.'
                      )
                    ) {
                      void runAction(() =>
                        window.sidekick.productivity.cancel(activeSession.id)
                      );
                    }
                  }}
                >
                  <AppIcon icon={faXmark} />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="productivity-start-form">
              <div className="productivity-session-type-picker">
                <button
                  type="button"
                  className={sessionType === 'focus' ? 'selected' : ''}
                  onClick={() => {
                    setSessionType('focus');
                    setTargetMinutes(25);
                    setTitle('Focus session');
                  }}
                >
                  Focus
                </button>

                <button
                  type="button"
                  className={sessionType === 'short_break' ? 'selected' : ''}
                  onClick={() => {
                    setSessionType('short_break');
                    setTargetMinutes(5);
                    setTitle('Short break');
                  }}
                >
                  Short break
                </button>

                <button
                  type="button"
                  className={sessionType === 'long_break' ? 'selected' : ''}
                  onClick={() => {
                    setSessionType('long_break');
                    setTargetMinutes(15);
                    setTitle('Long break');
                  }}
                >
                  Long break
                </button>
              </div>

              <label
                className="productivity-field-label"
                htmlFor="productivity-session-title"
              >
                Session name
              </label>

              <input
                id="productivity-session-title"
                type="text"
                maxLength={160}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="What are you working on?"
              />

              <label
                className="productivity-field-label"
                htmlFor="productivity-task"
              >
                Planner task (optional)
              </label>

              <select
                id="productivity-task"
                value={selectedTaskId}
                onChange={(event) => setSelectedTaskId(event.target.value)}
              >
                <option value="">General focus session</option>
                {tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>

              <label className="productivity-field-label">
                Duration
              </label>

              <div className="productivity-duration-options">
                {(
                  sessionType === 'focus'
                    ? durationOptions
                    : sessionType === 'short_break'
                      ? [5, 10, 15]
                      : [15, 20, 30]
                ).map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    className={
                      targetMinutes === minutes ? 'selected' : ''
                    }
                    onClick={() => setTargetMinutes(minutes)}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>

              <div className="productivity-preview-time">
                {formatTime(targetMinutes * 60)}
              </div>

              <button
                type="button"
                className="productivity-button productivity-button-primary productivity-start-button"
                disabled={busy}
                onClick={() => {
                  void handleStart();
                }}
              >
                <AppIcon icon={faPlay} />
                Start session
              </button>
            </div>
          )}
        </article>

        <article className="productivity-panel productivity-week-panel">
          <div className="productivity-panel-heading">
            <div>
              <h3>Weekly focus</h3>
              <p>Your completed focus time over seven days.</p>
            </div>
          </div>

          <div className="productivity-week-total">
            <strong>{summary?.weeklyFocusMinutes ?? 0}</strong>
            <span>minutes this week</span>
          </div>

          <div className="productivity-week-chart">
            {weeklyData.map((day) => (
              <div className="productivity-week-day" key={day.key}>
                <div className="productivity-week-bar-area">
                  <div
                    className="productivity-week-bar"
                    style={{
                      height: `${Math.max(
                        day.minutes > 0 ? 6 : 0,
                        (day.minutes / maximumWeeklyMinutes) * 100
                      )}%`
                    }}
                    title={`${day.minutes} focus minutes`}
                  />
                </div>

                <span>{day.label}</span>
                <small>{day.minutes}m</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="productivity-panel productivity-history-panel">
        <div className="productivity-panel-heading">
          <div>
            <h3>Recent sessions</h3>
            <p>Your latest productivity sessions.</p>
          </div>

          <span className="productivity-history-count">
            {history.length} sessions
          </span>
        </div>

        {history.length === 0 ? (
          <div className="productivity-empty">
            <AppIcon icon={faListCheck} />

            <h4>No sessions recorded yet</h4>

            <p>
              Start your first focus session and your history will appear here.
            </p>
          </div>
        ) : (
          <div className="productivity-history-list">
            {history.map((session) => (
              <div
                className="productivity-history-item"
                key={session.id}
              >
                <div className="productivity-history-icon">
                  <AppIcon
                    icon={
                      session.sessionType === 'focus'
                        ? faBullseye
                        : faClock
                    }
                  />
                </div>

                <div className="productivity-history-details">
                  <strong>{session.title}</strong>

                  <span>
                    {getSessionTypeLabel(session.sessionType)}
                    {session.taskId !== null && (
                      ` · ${tasks.find((task) => task.id === session.taskId)?.title ?? 'Planner task'}`
                    )}
                    {' · '}
                    {formatDate(session.startedAt)}
                  </span>
                </div>

                <div className="productivity-history-duration">
                  <strong>
                    {Math.floor(session.elapsedSeconds / 60)} min
                  </strong>

                  <span>{session.targetMinutes} min target</span>
                </div>

                <span
                  className={`productivity-status productivity-status-${session.status}`}
                >
                  {session.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

export default ProductivityPage;
