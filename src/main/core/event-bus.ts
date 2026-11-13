import { randomUUID } from 'node:crypto';
import type { AssistantEvent, AssistantEventPayloads, AssistantEventType } from './assistant-types';

type Listener<K extends AssistantEventType> = (event: AssistantEvent<K>) => void | Promise<void>;
type ErasedListener = (event: AssistantEvent) => void | Promise<void>;

/** Typed in-process event bus with isolated listener failures and bounded history. */
class AssistantEventBus {
  private readonly listeners = new Map<AssistantEventType, Set<ErasedListener>>();
  private readonly history: AssistantEvent[] = [];
  private dispatchDepth = 0;
  private readonly maxDepth = 16;
  private readonly maxHistory = 200;

  on<K extends AssistantEventType>(type: K, listener: Listener<K>): () => void {
    const existing = this.listeners.get(type) ?? new Set<ErasedListener>();
    existing.add(listener as ErasedListener);
    this.listeners.set(type, existing);
    return () => existing.delete(listener as ErasedListener);
  }

  async emit<K extends AssistantEventType>(type: K, payload: AssistantEventPayloads[K]): Promise<void> {
    if (this.dispatchDepth >= this.maxDepth) {
      console.error(`Assistant event recursion limit reached for ${String(type)}.`);
      return;
    }
    const event: AssistantEvent<K> = { id: randomUUID(), type, occurredAt: new Date(), payload };
    this.history.push(event as AssistantEvent);
    if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    const listeners = [...(this.listeners.get(type) ?? [])];
    this.dispatchDepth += 1;
    try {
      await Promise.all(listeners.map(async listener => {
        try { await listener(event as AssistantEvent); }
        catch (error) { console.error(`Assistant event listener failed (${String(type)}):`, error); }
      }));
    } finally { this.dispatchDepth -= 1; }
  }

  recentEvents(limit = 50): AssistantEvent[] {
    return this.history.slice(-Math.max(0, Math.min(200, Math.floor(limit))));
  }
}

export const assistantEventBus = new AssistantEventBus();
