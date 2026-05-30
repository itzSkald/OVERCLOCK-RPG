import type { IPlugin, IEngine, GameState } from '../engine/types';

export class StagePlugin implements IPlugin {
  id = 'stage';
  stateKeys = ['stage', 'highestStage', 'maxStage', 'tournamentMaxStage', 'tournamentSessionId'] as (keyof GameState)[];
  defaultState = { stage: 1, highestStage: 1, maxStage: 1, tournamentMaxStage: 1, tournamentSessionId: null };

  async init(_engine: IEngine): Promise<void> {}

  onTick(_delta: number, _state: GameState): void {}
}
