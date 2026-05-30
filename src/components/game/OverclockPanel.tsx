import React, { useState, useEffect } from 'react';
import { Lock, Zap, Wifi, Cpu, Flame, Shuffle, Infinity } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import {
  calculateOverclockGain,
  calculateTier,
  OVERCLOCK_PERKS,
  BRANCH_COLORS,
  BRANCH_SKILL_UNLOCKS,
  TIER_NAMES,
  getOverclockPerkLevel,
  isPerkUnlocked,
  isBranchSkillUnlocked,
} from '../../plugins/OverclockPlugin';
import type { OverclockPlugin, PerkBranch } from '../../plugins/OverclockPlugin';
import { UI_CONFIG, OVERCLOCK_CONFIG } from '../../config/game.config';

interface OverclockPanelProps {
  engine: GameEngine;
}

const BRANCH_ICONS: Record<PerkBranch, React.ReactNode> = {
  VOLTAGE: <Zap size={9} />,
  SIGNAL: <Wifi size={9} />,
  THERMAL: <Cpu size={9} />,
  ENTROPY: <Flame size={9} />,
  QUANTUM: <Infinity size={9} />,
};

const SKILL_ICON_EL: Record<string, React.ReactNode> = {
  Zap: <Zap size={8} />,
  Wifi: <Wifi size={8} />,
  Flame: <Flame size={8} />,
  Shuffle: <Shuffle size={8} />,
  Infinity: <Infinity size={8} />,
};

// Icon name per branch (matches BRANCH_SKILLS in SkillPlugin)
const BRANCH_SKILL_ICON: Record<PerkBranch, string> = {
  VOLTAGE: 'Zap',
  SIGNAL: 'Wifi',
  THERMAL: 'Flame',
  ENTROPY: 'Shuffle',
  QUANTUM: 'Infinity',
};

const TIER_COLORS = [
  '#5a6a7a', '#00f5ff', '#ffaa00', '#ff0080', '#39ff14',
  '#ffffff', '#cc44ff', '#ff8800', '#00ff88', '#ff0080',
  '#44ddff', '#ffcc00', '#ff44aa', '#88ff44', '#ffffff',
];

const MILESTONE_STAGES = UI_CONFIG.overclockMilestones;
const BRANCHES: PerkBranch[] = ['VOLTAGE', 'SIGNAL', 'THERMAL', 'ENTROPY', 'QUANTUM'];

export const OverclockPanel: React.FC<OverclockPanelProps> = ({ engine }) => {
  const highestStage = useGameState(engine, s => s.highestStage ?? s.stage);
  const stage = useGameState(engine, s => s.stage);
  const overclockCount = useGameState(engine, s => s.overclockCount);
  const totalOverclocks = useGameState(engine, s => s.totalOverclocks ?? 0);
  const overclockTier = useGameState(engine, s => s.overclockTier ?? 0);
  const upgrades = useGameState(engine, s => s.overclockUpgrades ?? {});

  const [confirming, setConfirming] = useState(false);
  const [pulse, setPulse] = useState(false);

  const plugin = engine.getPlugin<OverclockPlugin>('overclock');
  const gain = calculateOverclockGain(highestStage, overclockTier);
  const canOverclock = gain > 0;
  const available = plugin?.getAvailableOCT() ?? 0;
  const spent = plugin?.getSpentOCT() ?? 0;

  const isMaxTier = overclockTier >= TIER_NAMES.length - 1;
  const tierName = TIER_NAMES[overclockTier] ?? TIER_NAMES[TIER_NAMES.length - 1];
  const tierColor = TIER_COLORS[overclockTier] ?? '#ffffff';
  const tierProgress = (totalOverclocks % UI_CONFIG.tierProgressRuns) / UI_CONFIG.tierProgressRuns;
  const newTierAfterReset = calculateTier(totalOverclocks + 1);
  const tierWillIncrease = newTierAfterReset > overclockTier;
  const nextMilestone = MILESTONE_STAGES.find(s => s > highestStage);

  useEffect(() => {
    if (!canOverclock) return;
    const id = setInterval(() => setPulse(p => !p), UI_CONFIG.overclockPulseMs);
    return () => clearInterval(id);
  }, [canOverclock]);

  const handleOverclock = () => {
    plugin?.perform();
    setConfirming(false);
  };

  return (
    <div className="flex flex-col gap-2" style={{ height: '100%' }}>

      {/* ── Tier + OCT header ─────────────────────────────────────────────── */}
      <div
        className="pixel-border"
        style={{
          background: '#06000f', borderColor: tierColor,
          padding: '10px 12px', boxShadow: `0 0 16px ${tierColor}22`, flexShrink: 0,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="font-pixel"
              style={{
                color: tierColor, fontSize: '6px', letterSpacing: '2px',
                padding: '2px 6px', border: `1px solid ${tierColor}`,
                background: `${tierColor}18`, boxShadow: `0 0 8px ${tierColor}44`,
              }}
            >
              {tierName}
            </div>
            {!isMaxTier && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#3a4a5a' }}>
                T{overclockTier} → T{overclockTier + 1} in {3 - (totalOverclocks % 3)} runs
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#2a3a4a' }}>
            #{totalOverclocks} REBOOTS
          </div>
        </div>

        {/* Tier progress bar */}
        {!isMaxTier && (
          <div style={{ height: 2, background: '#1a1a2a', marginBottom: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${tierProgress * 100}%`,
              background: `linear-gradient(90deg, ${tierColor}88, ${tierColor})`,
              boxShadow: `0 0 6px ${tierColor}`, transition: 'width 0.4s',
            }} />
          </div>
        )}

        {/* Tier road — 15 pills */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 8, alignItems: 'center' }}>
          {TIER_NAMES.map((name, i) => {
            const tc = TIER_COLORS[i] ?? '#ffffff';
            const isCurrent = i === overclockTier;
            const isPast = i < overclockTier;
            return (
              <div
                key={i}
                title={`T${i}: ${name}`}
                style={{
                  width: isCurrent ? 18 : 9, height: isCurrent ? 7 : 5,
                  background: isPast ? tc : isCurrent ? tc : '#1a1a2a',
                  opacity: i > overclockTier ? 0.3 : 1,
                  boxShadow: isCurrent ? `0 0 6px ${tc}` : 'none',
                  transition: 'all 0.3s', flexShrink: 0,
                }}
              />
            );
          })}
        </div>

        {/* OCT numbers */}
        <div className="flex items-end gap-3">
          <div>
            <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>OCT TOTAL</div>
            <div className="font-pixel" style={{ color: '#ff0080', fontSize: '22px', textShadow: '0 0 12px rgba(255,0,128,0.6)', lineHeight: 1 }}>
              {overclockCount}
            </div>
          </div>
          <div style={{ color: '#1a1a2a', fontSize: '14px', marginBottom: 2 }}>|</div>
          <div>
            <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>SPENT</div>
            <div className="font-pixel" style={{ color: '#4a2a4a', fontSize: '14px' }}>{spent}</div>
          </div>
          <div style={{ color: '#1a1a2a', fontSize: '14px', marginBottom: 2 }}>|</div>
          <div>
            <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>FREE</div>
            <div className="font-pixel" style={{
              color: available > 0 ? '#00f5ff' : '#2a3a4a', fontSize: '14px',
              textShadow: available > 0 ? '0 0 8px rgba(0,245,255,0.5)' : 'none',
            }}>
              {available}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
          <div>
            <span style={{ color: '#2a3a4a' }}>STAGE </span>
            <span style={{ color: '#00f5ff' }}>{stage}</span>
            <span style={{ color: '#2a3a4a' }}> / PEAK </span>
            <span style={{ color: canOverclock ? '#ff0080' : '#2a3a4a' }}>{highestStage}</span>
          </div>
          <div>
            {canOverclock ? (
              <span style={{ color: '#ff0080' }}>+{gain} OCT ON RESET</span>
            ) : nextMilestone ? (
              <span style={{ color: '#2a3a4a' }}>MILESTONE AT STG {nextMilestone}</span>
            ) : (
              <span style={{ color: '#2a3a4a' }}>REACH STG 10</span>
            )}
          </div>
        </div>
      </div>

      {/* ── 5-branch perk columns ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {BRANCHES.map(branch => {
          const branchColor = BRANCH_COLORS[branch];
          const branchPerks = OVERCLOCK_PERKS
            .filter(p => p.branch === branch)
            .sort((a, b) => a.branchRank - b.branchRank);
          const skillUnlock = BRANCH_SKILL_UNLOCKS[branch];
          const skillEarned = isBranchSkillUnlocked(upgrades, branch);

          return (
            <div
              key={branch}
              className="flex flex-col overflow-y-auto"
              style={{
                background: '#050010',
                border: `1px solid ${branchColor}28`,
                padding: '5px 4px',
                gap: 4,
                minHeight: 0,
              }}
            >
              {/* Branch label */}
              <div style={{ flexShrink: 0, borderBottom: `1px solid ${branchColor}22`, paddingBottom: 4 }}>
                <div className="flex items-center gap-1 mb-2">
                  <span style={{ color: branchColor }}>{BRANCH_ICONS[branch]}</span>
                  <div className="font-pixel" style={{ color: branchColor, fontSize: '5px', letterSpacing: '1px' }}>
                    {branch}
                  </div>
                </div>

                {/* Branch skill unlock badge */}
                <div style={{
                  background: skillEarned ? `${branchColor}12` : '#030008',
                  border: `1px solid ${skillEarned ? branchColor + '88' : branchColor + '22'}`,
                  padding: '4px',
                  boxShadow: skillEarned ? `0 0 10px ${branchColor}44` : 'none',
                  transition: 'all 0.3s',
                }}>
                  <div className="flex items-center gap-1 mb-1">
                    <span style={{ color: skillEarned ? branchColor : branchColor + '33' }}>
                      {SKILL_ICON_EL[BRANCH_SKILL_ICON[branch]]}
                    </span>
                    <div className="font-pixel" style={{
                      color: skillEarned ? branchColor : branchColor + '44',
                      fontSize: '5px',
                    }}>
                      {skillUnlock.name}
                    </div>
                  </div>
                  <div style={{
                    color: skillEarned ? branchColor + '99' : '#252535',
                    fontFamily: 'var(--font-mono)', fontSize: '7px', lineHeight: 1.3,
                  }}>
                    {skillUnlock.description}
                  </div>
                  <div className="font-pixel" style={{
                    color: skillEarned ? branchColor : '#2a2a3a',
                    fontSize: '5px', letterSpacing: '1px', marginTop: 2,
                  }}>
                    {skillEarned ? 'UNLOCKED' : `RANK ${skillUnlock.requiresRank} REQ`}
                  </div>
                </div>
              </div>

              {/* Perks */}
              {branchPerks.map(perk => {
                const level = getOverclockPerkLevel(upgrades, perk.id);
                const maxed = level >= perk.maxLevel;
                const unlocked = isPerkUnlocked(perk, upgrades, overclockTier);
                const canBuy = plugin?.canBuyPerk(perk.id) ?? false;

                if (!unlocked) {
                  return (
                    <div
                      key={perk.id}
                      style={{
                        background: '#030008', border: '1px solid #0f0f1a',
                        padding: '5px', opacity: 0.45, flexShrink: 0,
                      }}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Lock size={7} color="#252535" />
                        <div className="font-pixel" style={{ color: '#252535', fontSize: '5px' }}>
                          {perk.name}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#252535', lineHeight: 1.3 }}>
                        {perk.requiresTier !== undefined && overclockTier < perk.requiresTier
                          ? `T${perk.requiresTier} REQ`
                          : 'BUY PREV'}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={perk.id}
                    style={{
                      background: maxed ? `${perk.color}0a` : '#060012',
                      border: `1px solid ${maxed ? perk.color : canBuy ? perk.color + '55' : '#1a1a2a'}`,
                      padding: '5px', flexShrink: 0,
                      boxShadow: maxed ? `0 0 7px ${perk.color}33` : canBuy ? `0 0 3px ${perk.color}18` : 'none',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div className="font-pixel" style={{
                      color: maxed ? perk.color : canBuy ? perk.color : '#3a3a5a',
                      fontSize: '5px', letterSpacing: '0.5px', marginBottom: 1,
                    }}>
                      {perk.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '7px',
                      color: '#3a4a5a', fontStyle: 'italic', marginBottom: 1, lineHeight: 1.3,
                    }}>
                      {perk.flavor}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: '#4a5a4a', marginBottom: 2 }}>
                      {perk.description}
                    </div>

                    {perk.requiresTier !== undefined && (
                      <div className="font-pixel" style={{
                        color: overclockTier >= perk.requiresTier ? perk.color + '55' : '#2a2a3a',
                        fontSize: '5px', marginBottom: 2,
                      }}>
                        TIER {perk.requiresTier}
                      </div>
                    )}

                    {/* Level segments */}
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: Math.min(perk.maxLevel, 15) }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1, height: 3,
                            background: i < level ? perk.color : '#1a1a2a',
                            boxShadow: i < level ? `0 0 3px ${perk.color}` : 'none',
                          }}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="font-pixel" style={{ color: maxed ? perk.color : '#2a3a4a', fontSize: '6px' }}>
                        {level}/{perk.maxLevel}
                      </div>
                      {maxed ? (
                        <div className="font-pixel" style={{
                          color: perk.color, fontSize: '5px', padding: '1px 3px',
                          border: `1px solid ${perk.color}`, background: `${perk.color}18`,
                        }}>
                          MAX
                        </div>
                      ) : (
                        <button
                          onClick={() => plugin?.buyPerk(perk.id)}
                          disabled={!canBuy}
                          className="font-pixel"
                          style={{
                            background: canBuy ? `${perk.color}22` : '#0a0010',
                            border: `1px solid ${canBuy ? perk.color : '#1a1a2a'}`,
                            color: canBuy ? perk.color : '#2a2a3a',
                            padding: '2px 4px', fontSize: '6px',
                            cursor: canBuy ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
                          }}
                        >
                          {perk.costPerLevel} OCT
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Reboot section ────────────────────────────────────────────────── */}
      <div
        className="pixel-border"
        style={{
          background: canOverclock ? '#0d0010' : '#060008',
          borderColor: canOverclock ? (pulse ? '#ff0080' : '#cc0060') : '#1a1a2a',
          padding: '10px 12px', flexShrink: 0,
          boxShadow: canOverclock ? `0 0 ${pulse ? 20 : 10}px rgba(255,0,128,${pulse ? 0.3 : 0.15})` : 'none',
          transition: 'box-shadow 0.9s, border-color 0.9s',
        }}
      >
        {!canOverclock ? (
          <div className="text-center">
            <div className="font-pixel" style={{ color: '#2a2a3a', fontSize: '6px', letterSpacing: '1px', lineHeight: 2 }}>
              REACH STAGE 500 TO UNLOCK REBOOT
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#1a2a1a', marginTop: 2 }}>
              higher peak stage = exponentially more OCT
            </div>
          </div>
        ) : confirming ? (
          <div>
            <div className="font-pixel mb-1 text-center" style={{ color: '#ffaa00', fontSize: '6px', letterSpacing: '1px' }}>
              !! REBOOT PROTOCOL ACTIVE !!
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '8px', color: '#5a4a2a',
              lineHeight: 1.8, marginBottom: 6, textAlign: 'center',
            }}>
              Stage, gold &amp; components reset.<br />
              <span style={{ color: '#ff0080' }}>+{gain} OCT earned</span>
              {tierWillIncrease && (
                <span style={{ color: TIER_COLORS[newTierAfterReset] }}>
                  {' '}· TIER → {TIER_NAMES[newTierAfterReset]}
                </span>
              )}
              <br />
              <span style={{ color: '#2a4a2a' }}>Perks &amp; items persist.</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOverclock}
                className="flex-1 font-pixel"
                style={{
                  background: 'linear-gradient(135deg, #3d0024 0%, #1a0010 100%)',
                  border: '1px solid #ff0080', color: '#ff0080',
                  padding: '8px', fontSize: '6px', letterSpacing: '1px',
                  boxShadow: '0 0 10px rgba(255,0,128,0.4)', cursor: 'pointer',
                }}
              >
                EXECUTE REBOOT
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 font-pixel"
                style={{
                  background: '#0a0a0f', border: '1px solid #1a2a3a',
                  color: '#4a5a6a', padding: '8px', fontSize: '6px', cursor: 'pointer',
                }}
              >
                ABORT
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="w-full font-pixel"
            style={{
              background: 'linear-gradient(135deg, #160010 0%, #200018 50%, #160010 100%)',
              border: `1px solid ${pulse ? '#ff0080' : '#cc0060'}`,
              color: pulse ? '#ff0080' : '#dd0070',
              padding: '12px 10px', fontSize: '8px', letterSpacing: '2px',
              boxShadow: `0 0 ${pulse ? 16 : 8}px rgba(255,0,128,${pulse ? 0.4 : 0.2})`,
              cursor: 'pointer', transition: 'all 0.9s', textAlign: 'center' as const,
            }}
          >
            REBOOT PROTOCOL
            <div style={{
              fontSize: '7px', color: pulse ? '#ff008099' : '#aa004455',
              marginTop: 3, letterSpacing: '1px', transition: 'color 0.9s',
            }}>
              +{gain} OCT
              {tierWillIncrease && (
                <span style={{ color: TIER_COLORS[newTierAfterReset], marginLeft: 6 }}>
                  {'· TIER UP → '}{TIER_NAMES[newTierAfterReset]}
                </span>
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
