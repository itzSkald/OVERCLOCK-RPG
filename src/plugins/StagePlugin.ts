import type { IPlugin, IEngine, GameState } from '../engine/types';

export class StagePlugin implements IPlugin {
  id = 'stage';
  stateKeys = ['stage', 'highestStage'] as (keyof GameState)[];
  defaultState = { stage: 1, highestStage: 1 };

  async init(_engine: IEngine): Promise<void> {}

  onTick(_delta: number, _state: GameState): void {}
}
