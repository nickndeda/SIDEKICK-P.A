type ScheduledWork = () => Promise<void>;

let timer: NodeJS.Timeout | null = null;
let scheduledWork: ScheduledWork | null = null;
let running = false;

const SCHEDULER_RETRY_MS = 60_000;

function queueNextTick(delay = SCHEDULER_RETRY_MS): void {
  if (!scheduledWork || timer) return;
  timer = setTimeout(() => {
    timer = null;
    void runTick();
  }, delay);
  timer.unref?.();
}

async function runTick(): Promise<void> {
  if (!scheduledWork || running) return;
  running = true;
  try {
    await scheduledWork();
  } catch (error) {
    console.error('Background scheduler failed:', error);
  } finally {
    running = false;
    queueNextTick();
  }
}

/** Starts the single main-process timer shared by reminders and assistant monitoring. */
export function startScheduler(work: ScheduledWork): void {
  scheduledWork = work;
  void runTick();
}

/** Runs the next reminder cycle promptly after settings or reminder actions change. */
export function wakeScheduler(): void {
  if (!scheduledWork) return;
  if (timer) clearTimeout(timer);
  timer = null;
  queueNextTick(0);
}

export function stopScheduler(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  scheduledWork = null;
}
