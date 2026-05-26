import type { IPlugin, IEngine, GameState, GameEvent } from '../engine/types';
import { getZone } from '../components/game/ZoneScene';
import type { ZoneConfig } from '../components/game/ZoneScene';

export class ZonePlugin implements IPlugin {
  id = 'zone';
  dependencies = ['stage'];

  private engine!: IEngine;
  private currentZoneId = -1;
  private previousZoneId = -1;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.on('state_sync', (event: GameEvent<{ savedState: GameState } | null>) => {
      const stage = event.payload?.savedState?.stage ?? engine.state.stage;
      this.currentZoneId = getZone(stage).id;
      this.previousZoneId = this.currentZoneId;
    });

    engine.on('stage_clear', (event: GameEvent<{ stage: number }>) => {
      const nextStage = event.payload.stage + 1;
      const nextZoneId = getZone(nextStage).id;
      if (nextZoneId !== this.currentZoneId) {
        this.previousZoneId = this.currentZoneId;
        this.currentZoneId = nextZoneId;
        engine.emit('zone_changed', {
          zoneId: nextZoneId,
          previousZoneId: this.previousZoneId,
          zone: getZone(nextStage),
        });
      }
    });
  }

  getCurrentZone(): ZoneConfig {
    return getZone(this.engine.state.stage);
  }

  getPreviousZone(): ZoneConfig | null {
    if (this.previousZoneId < 0) return null;
    const stage = this.previousZoneId * 10 + 1;
    return getZone(stage);
  }
}
