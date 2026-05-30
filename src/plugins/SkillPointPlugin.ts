import type { IPlugin, IEngine, GameState, GameEvent } from '../engine/types';
import { SKILL_POINT_CONFIG } from '../config/game.config';

/**
 * SkillPointPlugin manages skill points (SP), a currency separate from OCT.
 * SP are awarded at specific stage milestones and used for the skill tree.
 */
export class SkillPointPlugin implements IPlugin {
  id = 'skill_point';
  stateKeys = ['skillPoints', 'claimedSkillPointMilestones'] as (keyof GameState)[];
  defaultState = { skillPoints: 0, claimedSkillPointMilestones: [] as number[] };

  private engine!: IEngine;

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    // Check for unclaimed milestones on stage clear
    engine.on('stage_clear', (event: GameEvent<{ stage: number }>) => {
      this.checkMilestones(event.payload.stage);
    });

    // Also check on load in case player reached milestones while offline or in a previous session
    this.checkAllMilestones();
  }

  /**
   * Check if the given stage unlocks any unclaimed milestones.
   */
  private checkMilestones(currentStage: number): void {
    const claimed = this.engine.state.claimedSkillPointMilestones ?? [];
    const highestStage = Math.max(this.engine.state.highestStage, currentStage);
    
    let pointsToAward = 0;
    const newlyClaimed: number[] = [];

    for (const milestone of SKILL_POINT_CONFIG.milestones) {
      if (highestStage >= milestone && !claimed.includes(milestone)) {
        pointsToAward += 1;
        newlyClaimed.push(milestone);
      }
    }

    if (pointsToAward > 0) {
      const newSkillPoints = (this.engine.state.skillPoints ?? 0) + pointsToAward;
      const updatedClaimed = [...claimed, ...newlyClaimed].sort((a, b) => a - b);
      
      this.engine.updateState({
        skillPoints: newSkillPoints,
        claimedSkillPointMilestones: updatedClaimed,
      });

      this.engine.emit('skill_point_earned', { 
        amount: pointsToAward, 
        milestones: newlyClaimed,
        total: newSkillPoints,
      });
    }
  }

  /**
   * Check all milestones based on current highestStage (called on init).
   */
  private checkAllMilestones(): void {
    this.checkMilestones(this.engine.state.highestStage);
  }

  /**
   * Get the current skill point balance.
   */
  getSkillPoints(): number {
    return this.engine.state.skillPoints ?? 0;
  }

  /**
   * Get the next milestone stage and how many stages until it.
   */
  getNextMilestone(): { stage: number; stagesRemaining: number } | null {
    const highestStage = this.engine.state.highestStage;
    const nextMilestone = SKILL_POINT_CONFIG.milestones.find(m => m > highestStage);
    if (!nextMilestone) return null;
    return { stage: nextMilestone, stagesRemaining: nextMilestone - highestStage };
  }

  /**
   * Get all milestones with their claimed status.
   */
  getAllMilestones(): Array<{ stage: number; claimed: boolean }> {
    const claimed = this.engine.state.claimedSkillPointMilestones ?? [];
    return SKILL_POINT_CONFIG.milestones.map(stage => ({
      stage,
      claimed: claimed.includes(stage),
    }));
  }

  /**
   * Spend skill points (returns false if insufficient).
   */
  spend(amount: number): boolean {
    const current = this.engine.state.skillPoints ?? 0;
    if (current < amount) return false;
    this.engine.updateState({ skillPoints: current - amount });
    return true;
  }
}
