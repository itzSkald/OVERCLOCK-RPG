import type { IPlugin, IEngine, GameState, GameEventType } from '../engine/types';
import { SAVE_CONFIG } from '../config/game.config';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * SavePlugin - Manages game state persistence with configurable triggers.
 * 
 * Features:
 * - Periodic auto-save at configurable intervals
 * - Action-based saving on important game events (configurable)
 * - Debouncing to prevent rapid-fire saves
 * - Save on tab hide / beforeunload for data safety (web)
 * - Save on app pause/background for data safety (mobile via Capacitor)
 * - Manual save via saveNow() method
 * 
 * Configuration (in SAVE_CONFIG):
 * - autoSaveIntervalMs: How often to auto-save (default: 5 minutes)
 * - saveOnActions: Array of event types that trigger immediate saves
 * - saveDebounceMs: Minimum time between saves (default: 2 seconds)
 * - saveOnActionsEnabled: Toggle action-based saving on/off
 */
export class SavePlugin implements IPlugin {
  id = 'save';
  dependencies = ['supabase'];
  stateKeys = ['totalDamageDealt', 'overclockCount', 'lastSaveTime'] as (keyof GameState)[];
  defaultState = { totalDamageDealt: 0, overclockCount: 0, lastSaveTime: 0 };

  private engine!: IEngine;
  private saveTimer: ReturnType<typeof setInterval> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSaveTime = 0;
  private isAuthenticated = false;
  private boundBeforeUnload!: () => void;
  private boundVisibilityChange!: () => void;
  private actionUnsubscribers: Array<() => void> = [];
  private capacitorAppStateListener: (() => void) | null = null;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    // Start/stop auto-save based on auth state
    engine.on('auth_success', () => {
      this.isAuthenticated = true;
      this.startAutoSave();
      this.subscribeToActions();
    });

    engine.on('auth_signout', () => {
      this.isAuthenticated = false;
      this.stopAutoSave();
      this.unsubscribeFromActions();
    });

    // Set up platform-specific lifecycle listeners
    if (Capacitor.isNativePlatform()) {
      // Mobile: Use Capacitor App plugin for lifecycle events
      this.setupCapacitorListeners();
    } else {
      // Web: Use browser events
      this.setupWebListeners();
    }
  }

  /**
   * Set up Capacitor app lifecycle listeners for mobile platforms.
   */
  private async setupCapacitorListeners(): Promise<void> {
    // Save when app goes to background (pause)
    const listener = await App.addListener('appStateChange', (state) => {
      if (!state.isActive && this.isAuthenticated) {
        // App is going to background - save immediately
        this.saveImmediate();
      }
    });
    
    this.capacitorAppStateListener = () => {
      listener.remove();
    };
  }

  /**
   * Set up web browser lifecycle listeners.
   */
  private setupWebListeners(): void {
    // Save on page unload
    this.boundBeforeUnload = () => {
      if (this.isAuthenticated) {
        this.saveImmediate();
      }
    };
    window.addEventListener('beforeunload', this.boundBeforeUnload);

    // Save when tab becomes hidden to prevent data loss
    this.boundVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && this.isAuthenticated) {
        this.saveImmediate();
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityChange);
  }

  /**
   * Subscribe to all configured "important action" events.
   * Each action triggers a debounced save.
   */
  private subscribeToActions(): void {
    if (!SAVE_CONFIG.saveOnActionsEnabled) return;

    for (const action of SAVE_CONFIG.saveOnActions) {
      const unsub = this.engine.on(action as GameEventType, () => {
        this.saveDebounced();
      });
      this.actionUnsubscribers.push(unsub);
    }
  }

  /**
   * Unsubscribe from all action listeners.
   */
  private unsubscribeFromActions(): void {
    for (const unsub of this.actionUnsubscribers) {
      unsub();
    }
    this.actionUnsubscribers = [];
  }

  /**
   * Start the periodic auto-save timer.
   */
  private startAutoSave(): void {
    this.stopAutoSave();
    this.saveTimer = setInterval(() => {
      this.saveDebounced();
    }, SAVE_CONFIG.autoSaveIntervalMs);
  }

  /**
   * Stop the periodic auto-save timer.
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Trigger a save with debouncing to prevent rapid-fire saves.
   * Multiple calls within saveDebounceMs will result in a single save.
   */
  private saveDebounced(): void {
    if (!this.isAuthenticated) return;

    // Clear any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Check if we're within the debounce window
    const now = Date.now();
    const timeSinceLastSave = now - this.lastSaveTime;

    if (timeSinceLastSave >= SAVE_CONFIG.saveDebounceMs) {
      // Enough time has passed, save immediately
      this.saveImmediate();
    } else {
      // Schedule a save after the remaining debounce time
      const delay = SAVE_CONFIG.saveDebounceMs - timeSinceLastSave;
      this.debounceTimer = setTimeout(() => {
        this.saveImmediate();
      }, delay);
    }
  }

  /**
   * Perform an immediate save (bypasses debounce).
   * Used for critical moments like page unload.
   */
  private saveImmediate(): void {
    if (!this.isAuthenticated) return;

    this.lastSaveTime = Date.now();
    this.engine.updateState({ lastSaveTime: this.lastSaveTime });
    this.engine.emit('save_requested', {});

    // Clear any pending debounce timer since we just saved
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Public method to manually trigger a save (e.g., from UI "Save" button).
   * Respects debouncing.
   */
  saveNow(): void {
    this.saveDebounced();
  }

  /**
   * Public method to force an immediate save (bypasses debounce).
   * Use sparingly - prefer saveNow() for normal operations.
   */
  forceSave(): void {
    this.saveImmediate();
  }

  /**
   * Get the timestamp of the last successful save.
   */
  getLastSaveTime(): number {
    return this.lastSaveTime;
  }

  /**
   * Check if a save is currently pending (debounce timer active).
   */
  isSavePending(): boolean {
    return this.debounceTimer !== null;
  }

  cleanup(): void {
    this.stopAutoSave();
    this.unsubscribeFromActions();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Clean up platform-specific listeners
    if (Capacitor.isNativePlatform()) {
      if (this.capacitorAppStateListener) {
        this.capacitorAppStateListener();
        this.capacitorAppStateListener = null;
      }
    } else {
      window.removeEventListener('beforeunload', this.boundBeforeUnload);
      document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    }
  }
}
