import type { GameEventType, GameEvent, EventHandler } from './types';

export class EventSystem {
  private handlers = new Map<GameEventType, Set<EventHandler<unknown>>>();

  on<T>(type: GameEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler<unknown>);
    return () => this.off(type, handler);
  }

  off<T>(type: GameEventType, handler: EventHandler<T>): void {
    this.handlers.get(type)?.delete(handler as EventHandler<unknown>);
  }

  emit<T>(type: GameEventType, payload: T): void {
    const event: GameEvent<T> = { type, payload, timestamp: Date.now() };
    const set = this.handlers.get(type);
    if (!set) return;
    for (const handler of set) {
      try {
        (handler as EventHandler<T>)(event);
      } catch (err) {
        console.error(`[EventSystem] Handler error for ${type}:`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
