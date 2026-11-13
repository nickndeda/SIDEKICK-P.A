
import {
  startProductivitySession,
  getActiveProductivitySession,
  getProductivitySessions,
  getTodayProductivitySessions,
  getProductivitySummary,
  pauseProductivitySession,
  resumeProductivitySession,
  completeProductivitySession,
  cancelProductivitySession
} from '../../repositories/productivity-repository';

import type {
  ProductivitySession,
  ProductivitySessionType,
  StartProductivitySessionInput,
  ProductivitySummary
} from './productivity-types';

function validateSessionInput(
  input: StartProductivitySessionInput
): StartProductivitySessionInput {
  const title = input.title.trim();

  if (!title || title.length > 160) {
    throw new Error('Session title must contain 1–160 characters.');
  }

  const validTypes: ProductivitySessionType[] = [
    'focus',
    'short_break',
    'long_break'
  ];

  if (!validTypes.includes(input.sessionType)) {
    throw new Error('Invalid productivity session type.');
  }

  if (
    !Number.isInteger(input.targetMinutes) ||
    input.targetMinutes < 1 ||
    input.targetMinutes > 240
  ) {
    throw new Error('Session duration must be between 1 and 240 minutes.');
  }

  if (
    input.taskId !== undefined &&
    input.taskId !== null &&
    (!Number.isSafeInteger(input.taskId) || input.taskId < 1)
  ) {
    throw new Error('Select a valid Planner task.');
  }

  return {
    title,
    sessionType: input.sessionType,
    targetMinutes: input.targetMinutes,
    taskId: input.taskId ?? null
  };
}

function validateSessionId(id: string): string {
  if (
    typeof id !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error('Invalid productivity session ID.');
  }

  return id;
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return undefined;
}

export async function startSession(
  input: StartProductivitySessionInput
): Promise<ProductivitySession> {
  const validatedInput = validateSessionInput(input);

  try {
    return await startProductivitySession(validatedInput);
  } catch (error) {
    if (getErrorCode(error) === 'ER_DUP_ENTRY') {
      throw new Error(
        'There is already an active or paused productivity session. Complete or cancel it before starting another.'
      );
    }

    throw error;
  }
}

export async function getActiveSession(): Promise<ProductivitySession | null> {
  return getActiveProductivitySession();
}

export async function getSessionHistory(): Promise<ProductivitySession[]> {
  return getProductivitySessions(30);
}

export async function getTodaySessions(): Promise<ProductivitySession[]> {
  return getTodayProductivitySessions();
}

export async function getSummary(): Promise<ProductivitySummary> {
  return getProductivitySummary();
}

export async function pauseSession(
  id: string
): Promise<ProductivitySession> {
  const session = await pauseProductivitySession(validateSessionId(id));

  if (!session || session.status !== 'paused') {
    throw new Error('The session could not be paused.');
  }

  return session;
}

export async function resumeSession(
  id: string
): Promise<ProductivitySession> {
  const session = await resumeProductivitySession(validateSessionId(id));

  if (!session || session.status !== 'running') {
    throw new Error('The session could not be resumed.');
  }

  return session;
}

export async function completeSession(
  id: string
): Promise<ProductivitySession> {
  const session = await completeProductivitySession(validateSessionId(id));

  if (!session || session.status !== 'completed') {
    throw new Error('The session could not be completed.');
  }

  return session;
}

export async function cancelSession(
  id: string
): Promise<ProductivitySession> {
  const session = await cancelProductivitySession(validateSessionId(id));

  if (!session || session.status !== 'cancelled') {
    throw new Error('The session could not be cancelled.');
  }

  return session;
}
