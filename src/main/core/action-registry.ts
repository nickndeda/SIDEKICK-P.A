import * as repo from '../repositories/assistant-repository';
import { showAssistantNotification } from '../services/notification-service';
import { assistantEventBus } from './event-bus';
import type { AssistantActivity } from '../../shared/types/assistant';
import type { AssistantFinding } from './assistant-types';

export type AssistantAction =
  | { type: 'assistant.record_activity'; finding: AssistantFinding }
  | { type: 'assistant.notify'; activity: AssistantActivity };

/** Only explicitly registered, local and reversible assistant actions can run. */
export class AssistantActionRegistry {
  private readonly actions = new Map<AssistantAction['type'], (action: AssistantAction) => Promise<unknown>>();

  constructor() {
    this.register('assistant.record_activity', async action => {
      if (action.type !== 'assistant.record_activity') throw new Error('Invalid assistant action payload.');
      const saved = await repo.insertActivity(action.finding);
      if (saved.inserted) await assistantEventBus.emit('assistant.activity.created', { activityId: saved.activity.id, eventType: saved.activity.eventType });
      return saved;
    });
    this.register('assistant.notify', async action => {
      if (action.type !== 'assistant.notify') throw new Error('Invalid assistant action payload.');
      return showAssistantNotification(action.activity);
    });
  }

  private register<K extends AssistantAction['type']>(type: K, handler: (action: Extract<AssistantAction, { type: K }>) => Promise<unknown>): void {
    this.actions.set(type, handler as (action: AssistantAction) => Promise<unknown>);
  }

  async execute(action: AssistantAction): Promise<unknown> {
    const handler = this.actions.get(action.type);
    if (!handler) throw new Error(`Assistant action is not permitted: ${action.type}`);
    return handler(action);
  }
}

export const assistantActions = new AssistantActionRegistry();
