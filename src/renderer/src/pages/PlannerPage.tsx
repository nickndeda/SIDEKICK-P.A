
import { useEffect, useState, type FormEvent } from 'react';

import {
  faCalendarDays,
  faCirclePlus,
  faRotate,
  faListCheck,
  faCheck,
  faPen,
  faTrash,
  faXmark,
  faBoxOpen,
  faRotateLeft,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons';

import AppIcon from '../components/AppIcon';
import '../styles/planner.css';

type Task = Awaited<
  ReturnType<typeof window.sidekick.tasks.list>
>[number];

type DeletedTask = Awaited<
  ReturnType<typeof window.sidekick.deletedTasks.list>
>[number];

type TaskPriority = Task['priority'];

type TaskInput = {
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueAt: Date | null;
};

type PlannerTab = 'tasks' | 'trash';

function formatDate(value: Date | null): string {
  if (!value) return 'No deadline';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
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
  const [deletedTasks, setDeletedTasks] = useState<DeletedTask[]>([]);

  const [activeTab, setActiveTab] = useState<PlannerTab>('tasks');

  const [loading, setLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyArchiveId, setBusyArchiveId] = useState<string | null>(null);
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  const [error, setError] = useState('');
  const [trashError, setTrashError] = useState('');

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueAt, setDueAt] = useState('');

  async function loadTasks() {
    setLoading(true);
    setError('');

    try {
      const savedTasks = await window.sidekick.tasks.list();
      setTasks(savedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError(
        'Unable to load tasks. Check your database connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDeletedTasks() {
    setTrashLoading(true);
    setTrashError('');

    try {
      const archivedTasks = await window.sidekick.deletedTasks.list();
      setDeletedTasks(archivedTasks);
    } catch (err) {
      console.error('Failed to load deleted tasks:', err);
      setTrashError(
        'Unable to load Trash. Check your database connection and try again.'
      );
    } finally {
      setTrashLoading(false);
    }
  }

  async function refreshPlanner() {
    await Promise.all([
      loadTasks(),
      loadDeletedTasks()
    ]);
  }

  useEffect(() => {
    void refreshPlanner();
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
      const input: TaskInput = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueAt: dueAt ? new Date(dueAt) : null
      };

      if (editingTaskId) {
        await window.sidekick.tasks.update(editingTaskId, input);
      } else {
        await window.sidekick.tasks.create(input);
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
      await window.sidekick.tasks.complete(task.id);
      await loadTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError('Unable to complete this task.');
    }
  }

  async function handleDelete(task: Task) {
    const confirmed = window.confirm(
      `Move "${task.title}" to Trash?\n\nYou can restore it later.`
    );

    if (!confirmed) return;

    try {
      setError('');

      const deleted = await window.sidekick.tasks.delete(task.id);

      if (!deleted) {
        throw new Error('This task could not be found.');
      }

      if (editingTaskId === task.id) {
        resetForm();
      }

      await Promise.all([
        loadTasks(),
        loadDeletedTasks()
      ]);
    } catch (err) {
      console.error('Failed to move task to Trash:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to move this task to Trash.'
      );
    }
  }

  async function handleRestore(task: DeletedTask) {
    const confirmed = window.confirm(
      `Restore "${task.title}" to your active tasks?`
    );

    if (!confirmed) return;

    setBusyArchiveId(task.archiveId);
    setTrashError('');

    try {
      const restored = await window.sidekick.deletedTasks.restore(
        task.archiveId
      );

      if (!restored) {
        throw new Error('This archived task could not be found.');
      }

      await Promise.all([
        loadTasks(),
        loadDeletedTasks()
      ]);
    } catch (err) {
      console.error('Failed to restore task:', err);
      setTrashError(
        err instanceof Error ? err.message : 'Unable to restore this task.'
      );
    } finally {
      setBusyArchiveId(null);
    }
  }

  async function handlePermanentDelete(task: DeletedTask) {
    const confirmed = window.confirm(
      `Permanently delete "${task.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setBusyArchiveId(task.archiveId);
    setTrashError('');

    try {
      const deleted = await window.sidekick.deletedTasks.permanentlyDelete(
        task.archiveId
      );

      if (!deleted) {
        throw new Error('This archived task could not be found.');
      }

      await loadDeletedTasks();
    } catch (err) {
      console.error('Failed to permanently delete task:', err);
      setTrashError(
        err instanceof Error
          ? err.message
          : 'Unable to permanently delete this task.'
      );
    } finally {
      setBusyArchiveId(null);
    }
  }

  async function handleEmptyTrash() {
    if (deletedTasks.length === 0 || emptyingTrash) return;

    const confirmed = window.confirm(
      `Permanently delete all ${deletedTasks.length} archived tasks?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setEmptyingTrash(true);
    setTrashError('');

    try {
      await window.sidekick.deletedTasks.empty();
      await loadDeletedTasks();
    } catch (err) {
      console.error('Failed to empty Trash:', err);
      setTrashError(
        err instanceof Error ? err.message : 'Unable to empty Trash.'
      );
    } finally {
      setEmptyingTrash(false);
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
          onClick={() => void refreshPlanner()}
          disabled={loading || trashLoading}
        >
          <AppIcon icon={faRotate} />
          Refresh
        </button>
      </div>

      <div className="planner-stats">
        <article className="planner-stat-card">
          <span>Total tasks</span>
          <strong>{tasks.length}</strong>
          <small>All active saved tasks</small>
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

      <div className="planner-tabs" role="tablist" aria-label="Planner views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tasks'}
          className={`planner-tab ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <AppIcon icon={faListCheck} />
          Tasks
          <span className="planner-tab-count">{tasks.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'trash'}
          className={`planner-tab ${activeTab === 'trash' ? 'active' : ''}`}
          onClick={() => setActiveTab('trash')}
        >
          <AppIcon icon={faTrash} />
          Trash
          <span className="planner-tab-count">{deletedTasks.length}</span>
        </button>
      </div>

      {activeTab === 'tasks' ? (
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
                <p>Your active tasks saved in the database.</p>
              </div>
            </div>

            {loading ? (
              <div className="planner-state">Loading your tasks...</div>
            ) : error && tasks.length === 0 ? (
              <div className="planner-state planner-state-error" role="alert">
                {error}
              </div>
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
                          {formatDate(task.dueAt)}
                        </span>

                        <span className={`planner-status status-${task.status}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="planner-task-actions">
                        {task.status !== 'completed' &&
                          task.status !== 'cancelled' && (
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
                          title="Move task to Trash"
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
      ) : (
        <section className="planner-trash-card">
          <div className="planner-trash-heading">
            <div className="planner-card-heading">
              <div className="planner-heading-icon">
                <AppIcon icon={faTrash} />
              </div>

              <div>
                <h3>Recently deleted</h3>
                <p>Restore tasks or permanently remove them.</p>
              </div>
            </div>

            <button
              type="button"
              className="planner-empty-trash-button"
              onClick={() => void handleEmptyTrash()}
              disabled={
                deletedTasks.length === 0 ||
                trashLoading ||
                emptyingTrash ||
                busyArchiveId !== null
              }
            >
              <AppIcon icon={faTrash} />
              {emptyingTrash ? 'Emptying...' : 'Empty Trash'}
            </button>
          </div>

          <div className="planner-trash-notice">
            <AppIcon icon={faTriangleExclamation} />
            <span>
              Permanently deleted tasks cannot be recovered.
            </span>
          </div>

          {trashError && (
            <div className="planner-error" role="alert">
              {trashError}
            </div>
          )}

          {trashLoading ? (
            <div className="planner-state">Loading Trash...</div>
          ) : deletedTasks.length === 0 ? (
            <div className="planner-empty-state">
              <AppIcon icon={faBoxOpen} />
              <h4>Your Trash is empty</h4>
              <p>
                Tasks you delete will appear here. You can restore them or
                permanently remove them.
              </p>
            </div>
          ) : (
            <div className="planner-task-list">
              {deletedTasks.map((task) => {
                const busy = busyArchiveId === task.archiveId || emptyingTrash;

                return (
                  <article
                    className="planner-task-item planner-deleted-task"
                    key={task.archiveId}
                  >
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

                      <div className="planner-task-meta planner-trash-meta">
                        <span>
                          <AppIcon icon={faCalendarDays} />
                          Deadline: {formatDate(task.dueAt)}
                        </span>

                        <span className={`planner-status status-${task.status}`}>
                          {task.status.replace('_', ' ')}
                        </span>

                        <span className="planner-deleted-date">
                          Deleted: {formatDate(task.deletedAt)}
                        </span>
                      </div>

                      <div className="planner-task-actions">
                        <button
                          type="button"
                          className="planner-action-button planner-restore-button"
                          onClick={() => void handleRestore(task)}
                          disabled={busy}
                        >
                          <AppIcon icon={faRotateLeft} />
                          {busyArchiveId === task.archiveId ? 'Working...' : 'Restore'}
                        </button>

                        <button
                          type="button"
                          className="planner-action-button planner-delete-button"
                          onClick={() => void handlePermanentDelete(task)}
                          disabled={busy}
                        >
                          <AppIcon icon={faTrash} />
                          Permanently delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </section>
  );
}

export default PlannerPage;
