
export type ProductivitySessionType =
  | 'focus'
  | 'short_break'
  | 'long_break';

export type ProductivitySessionStatus =
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled';

export interface ProductivitySession {
  id: string;
  taskId: number | null;
  title: string;
  sessionType: ProductivitySessionType;
  targetMinutes: number;
  status: ProductivitySessionStatus;
  startedAt: Date;
  endedAt: Date | null;
  elapsedSeconds: number;
  createdAt: Date;
}

export interface StartProductivitySessionInput {
  title: string;
  sessionType: ProductivitySessionType;
  targetMinutes: number;
  taskId?: number | null;
}

export interface DailyFocusSummary {
  date: string;
  focusMinutes: number;
}

export interface ProductivitySummary {
  todayFocusMinutes: number;
  todaySessions: number;
  todayCompletedSessions: number;
  weeklyFocusMinutes: number;
  dailyFocus: DailyFocusSummary[];
}
