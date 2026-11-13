import { assistantEventBus } from './event-bus';
import type { AssistantEventPayloads, AssistantEventType } from './assistant-types';

export function publishAssistantEvent<K extends AssistantEventType>(type: K, payload: AssistantEventPayloads[K]): void {
  void assistantEventBus.emit(type, payload);
}
