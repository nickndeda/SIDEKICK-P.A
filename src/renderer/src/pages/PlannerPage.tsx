
import { useEffect, useState, type FormEvent } from 'react';

import {
  faCalendarDays,
  faCirclePlus,
  faRotate,
  faListCheck,
  faCheck,
  faPen,
  faTrash,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '../components/AppIcon';
import '../styles/planner.css';

type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueAt: Date | null;
  status: 'pending' | 'in_progress' | 'completed';
};

type TaskInput = Pick<Task, 'title' | 'description' | 'priority' | 'dueAt'>;

type PlannerWindow = Window & {
  sidekick: {
    tasks: {
      list: () => Promise<Task[]>;
      create: (input: TaskInput) => Promise<unknown>;
      update: (id: string, input: TaskInput) => Promise<unknown>;
      complete: (id: string) => Promise<unknown>;
      delete: (id: string) => Promise<unknown>;
    };
  };
};

function formatDueDate(value: Date | null): string {
  if (!value) return 'No deadline';

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

function toDateTimeLocal(value: Date | null): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueAt, setDueAt] = useState('');

  async function loadTasks() {
    setLoading(true);
    setError('');

    try {
      const savedTasks = await (window as unknown as PlannerWindow).sidekick.tasks.list();
      setTasks(savedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Unable to load tasks. Check your database connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, []);

  function resetForm() {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setPriority('normal');
    setDueAt('');
    setError('');
  }

  function startEditing(task: Task) {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setDueAt(toDateTimeLocal(task.dueAt));
    setError('');

    document.getElementById('task-title')?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setError('Please enter a task title.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const input = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueAt: dueAt ? new Date(dueAt) : null
      };

      if (editingTaskId) {
        await (window as unknown as PlannerWindow).sidekick.tasks.update(editingTaskId, input);
      } else {
        await (window as unknown as PlannerWindow).sidekick.tasks.create(input);
      }

      resetForm();
      await loadTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to save the task.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(task: Task) {
    if (task.status === 'completed') return;

    try {
      setError('');
      await (window as unknown as PlannerWindow).sidekick.tasks.complete(task.id);
      await loadTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError('Unable to complete this task.');
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = window.confirm(
      `Delete "${task.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError('');
      await (window as unknown as PlannerWindow).sidekick.tasks.delete(task.id);

      if (editingTaskId === task.id) {
        resetForm();
      }

      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Unable to delete this task.');
    }
  }

  const pendingCount = tasks.filter(
    (task) => task.status === 'pending' ||
      task.status === 'in_progress'
  ).length;

  const completedCount = tasks.filter(
    (task) => task.status === 'completed'
  ).length;

  return (
    <section className="planner-page">
      <div className="planner-heading">
        <div>
          <span className="planner-eyebrow">ORGANISE YOUR WORK</span>
          <h2>Your Planner</h2>
          <p>Manage your tasks, deadlines and personal commitments.</p>
        </div>

        <button
          type="button"
          className="planner-refresh-button"
          onClick={() => void loadTasks()}
          disabled={loading}
        >
          <AppIcon icon={faRotate} />
          Refresh
        </button>
      </div>

      <div className="planner-stats">
        <article className="planner-stat-card">
          <span>Total tasks</span>
          <strong>{tasks.length}</strong>
          <small>All saved tasks</small>
        </article>

        <article className="planner-stat-card">
          <span>Pending tasks</span>
          <strong>{pendingCount}</strong>
          <small>Tasks awaiting completion</small>
        </article>

        <article className="planner-stat-card">
          <span>Completed</span>
          <strong>{completedCount}</strong>
          <small>Finished tasks</small>
        </article>
      </div>

      <div className="planner-layout">
        <section className="planner-form-card">
          <div className="planner-card-heading">
            <div className="planner-heading-icon">
              <AppIcon icon={editingTaskId ? faPen : faCirclePlus} />
            </div>

            <div>
              <h3>{editingTaskId ? 'Edit task' : 'Create a task'}</h3>
              <p>
                {editingTaskId
                  ? 'Update your task details.'
                  : 'Add something you need to accomplish.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="planner-field">
              <label htmlFor="task-title">
                Task title <span>*</span>
              </label>

              <input
                id="task-title"
                type="text"
                placeholder="e.g. Revise Data Structures"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="planner-field">
              <label htmlFor="task-description">Description</label>

              <textarea
                id="task-description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>

            <div className="planner-form-row">
              <div className="planner-field">
                <label htmlFor="task-priority">Priority</label>

                <select
                  id="task-priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TaskPriority)
                  }
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="planner-field">
                <label htmlFor="task-due-date">Deadline</label>

                <input
                  id="task-due-date"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="planner-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="planner-submit-button"
              disabled={saving}
            >
              <AppIcon icon={editingTaskId ? faCheck : faCirclePlus} />
              {saving
                ? 'Saving...'
                : editingTaskId
                  ? 'Save changes'
                  : 'Create task'}
            </button>

            {editingTaskId && (
              <button
                type="button"
                className="planner-cancel-button"
                onClick={resetForm}
              >
                <AppIcon icon={faXmark} />
                Cancel editing
              </button>
            )}
          </form>
        </section>

        <section className="planner-tasks-card">
          <div className="planner-card-heading">
            <div className="planner-heading-icon">
              <AppIcon icon={faListCheck} />
            </div>

            <div>
              <h3>Your tasks</h3>
              <p>Your saved tasks from the database.</p>
            </div>
          </div>

          {loading ? (
            <div className="planner-state">Loading your tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="planner-empty-state">
              <AppIcon icon={faCalendarDays} />
              <h4>No tasks yet</h4>
              <p>
                Your tasks will appear here once you create your first one.
              </p>
            </div>
          ) : (
            <div className="planner-task-list">
              {tasks.map((task) => (
                <article className="planner-task-item" key={task.id}>
                  <div className="planner-task-main">
                    <div className="planner-task-title-row">
                      <h4>{task.title}</h4>

                      <span className={`planner-priority priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="planner-task-description">
                        {task.description}
                      </p>
                    )}

                    <div className="planner-task-meta">
                      <span>
                        <AppIcon icon={faCalendarDays} />
                        {formatDueDate(task.dueAt)}
                      </span>

                      <span className={`planner-status status-${task.status}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="planner-task-actions">
                      {task.status !== 'completed' && (
                        <button
                          type="button"
                          className="planner-action-button"
                          onClick={() => void handleComplete(task)}
                          title="Mark as completed"
                        >
                          <AppIcon icon={faCheck} />
                          Complete
                        </button>
                      )}

                      <button
                        type="button"
                        className="planner-action-button"
                        onClick={() => startEditing(task)}
                        title="Edit task"
                      >
                        <AppIcon icon={faPen} />
                        Edit
                      </button>

                      <button
                        type="button"
                        className="planner-action-button planner-delete-button"
                        onClick={() => void handleDelete(task)}
                        title="Delete task"
                      >
                        <AppIcon icon={faTrash} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {error && tasks.length > 0 && (
            <div className="planner-error planner-list-error" role="alert">
              {error}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

export default PlannerPage;
