# OVERCLOCK-RPG Balance Configuration

This document describes the key balancing parameters for OVERCLOCK-RPG.
All tunable values live in `src/config/game.config.ts` — this file provides a quick reference.

## Overclock Points (OCT)

OCT (Overclock Tokens) are the primary prestige currency earned by resetting progress.

### Current Balance (Harder Mode)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `minStageToOverclock` | 500 | Minimum stage before first overclock is available |
| `stagesPerOCT` | 500 | Base OCT = floor(highestStage / 500) |
| `runsPerTier` | 3 | Number of overclocks per tier upgrade |
| `maxTier` | 14 | Maximum achievable tier |
| `tierMultiplierPerTier` | 0.25 | OCT multiplier increase per tier |

### Milestone Bonuses

Extra OCT awarded on reaching these stages:

| Stage | Bonus OCT |
|-------|-----------|
| 1,000 | +1 |
| 5,000 | +2 |
| 10,000 | +3 |
| 25,000 | +5 |
| 50,000 | +10 |
| 100,000 | +20 |
| 250,000 | +50 |
| 500,000 | +100 |
| 999,999 | +500 |

### Formula

```
baseOCT = floor(highestStage / stagesPerOCT)
milestoneBonus = sum of all reached milestone bonuses
tierMultiplier = 1 + (tier × tierMultiplierPerTier)
totalOCT = max(1, floor((baseOCT + milestoneBonus) × tierMultiplier))
```

## Module Unlocks

Modules (perks) unlock based on:
1. **Tier requirement** — Some perks require a minimum overclock tier
2. **Branch progression** — Must purchase previous rank in the branch first
3. **OCT cost** — Each level costs OCT (costPerLevel × level)

### Effective Unlock Cadence

With `stagesPerOCT = 500`:
- Stage 500: First overclock available (1 base OCT)
- Stage 1000: 2 base OCT + 1 milestone = 3 OCT minimum
- Stage 5000: 10 base OCT + 3 milestones = 13 OCT minimum

This creates approximately **1 module unlock per 500 stages** of progress.

## Leaderboard

The global leaderboard ranks players by **Max Stage** (the highest stage ever reached).

### Sorting Priority
1. Primary: `highest_stage` (descending)
2. Secondary: `total_damage` (descending)

## Diamonds

Premium currency earned from:
- Daily Ops completion (scales with stage)
- Motherboard upgrades cost only diamonds

### Motherboard Diamond Costs

| Tier | Name | Diamond Cost |
|------|------|--------------|
| 0→1 | BUDGET → MODDED | 5 |
| 1→2 | MODDED → OVERCLOCKED | 10 |
| 2→3 | OVERCLOCKED → PHANTOM | 25 |
| 3→4 | PHANTOM → SILICON GHOST | 50 |
| 4→5 | SILICON GHOST → GODBOARD | 100 |
| 5→6 | GODBOARD → CHAOS | 200 |
| 6→7 | CHAOS → OMEGA RIG | 500 |

## Tournaments

- Entry: FREE (no diamond cost)
- Join window: 10 minutes after start
- Duration: 4 hours
- Ranked by: Score (current stage during tournament)
