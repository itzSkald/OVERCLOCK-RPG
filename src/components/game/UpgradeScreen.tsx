import React, { useState } from 'react';
import { X, Zap, Target, Flame, ArrowUp } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { HeroPlugin } from '../../plugins/HeroPlugin';
import { useGameState } from '../../hooks/useGameState';
import { Tooltip, TooltipLabel, TooltipText, TooltipStat } from './Tooltip';
import { HERO_CONFIG, SKILL_UPGRADE_CONFIG } from '../../config/game.config';

interface UpgradeScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

type TabType = 'hero' | 'skills';
type BulkAmount = 1 | 10 | 25 | 100 | 'max';

function formatNumber(n: number): string {
  if (!isFinite(n)) return 'MAX';
  if (n >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toString();
}

const ICON_MAP: Record<string, React.ReactNode> = {
  'hero_tap_power': <Zap size={18} />,
  'hero_crit_chance': <Target size={18} />,
  'hero_crit_damage': <Flame size={18} />,
};

const BULK_OPTIONS: BulkAmount[] = [1, 10, 25, 100, 'max'];

export const UpgradeScreen: React.FC<UpgradeScreenProps> = ({ engine, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('hero');
  const [bulkAmount, setBulkAmount] = useState<BulkAmount>(1);
  const gold = useGameState(engine, s => s.gold);
  const heroUpgrades = useGameState(engine, s => s.heroUpgrades);
  const skillUpgrades = useGameState(engine, s => s.skillUpgrades);

  const heroPlugin = engine.getPlugin<HeroPlugin>('hero');
  const heroUpgradesList = heroPlugin?.getHeroUpgrades() ?? [];
  const skillUpgradesList = heroPlugin?.getSkillUpgrades() ?? [];

  const getBulkCount = (upgradeId: string): number => {
    if (bulkAmount === 'max') {
      return heroPlugin?.getMaxPurchasable(upgradeId) ?? 0;
    }
    return bulkAmount;
  };

  const handleHeroUpgrade = (upgradeId: string) => {
    const count = getBulkCount(upgradeId);
    heroPlugin?.purchaseHeroUpgrade(upgradeId, count);
  };

  const handleSkillUpgrade = (skillId: string) => {
    const count = bulkAmount === 'max' ? 50 : bulkAmount;
    heroPlugin?.purchaseSkillUpgrade(skillId as any, count);
  };

  // Calculate total hero level for display
  const totalHeroLevel = Object.values(heroUpgrades).reduce((sum, lvl) => sum + (lvl ?? 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          background: '#0a0a0f',
          border: '1px solid #00f5ff33',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            background: '#050510',
            borderBottom: '1px solid #00f5ff22',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="font-pixel" style={{ color: '#00f5ff', fontSize: '10px', letterSpacing: '3px' }}>
              UPGRADES
            </div>
            <div style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 2 }}>
              Hero Level: {totalHeroLevel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #1a2a3a',
              color: '#3a4a5a',
              width: 28,
              height: 28,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Bulk Selector + Tabs */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderBottom: '1px solid #1a2a3a',
          }}
        >
          {/* Bulk purchase selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '8px 12px',
              background: '#050508',
              borderBottom: '1px solid #1a1a2a',
            }}
          >
            <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginRight: 8 }}>
              BUY:
            </span>
            {BULK_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setBulkAmount(opt)}
                style={{
                  background: bulkAmount === opt ? '#00f5ff22' : 'transparent',
                  border: `1px solid ${bulkAmount === opt ? '#00f5ff' : '#1a2a3a'}`,
                  color: bulkAmount === opt ? '#00f5ff' : '#3a5a6a',
                  padding: '4px 8px',
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  minWidth: 36,
                }}
              >
                {opt === 'max' ? 'MAX' : `x${opt}`}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            <button
              onClick={() => setActiveTab('hero')}
              className="font-pixel"
              style={{
                flex: 1,
                background: activeTab === 'hero' ? '#001a20' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'hero' ? '2px solid #00f5ff' : '2px solid transparent',
                color: activeTab === 'hero' ? '#00f5ff' : '#3a5a6a',
                padding: '10px',
                fontSize: '8px',
                letterSpacing: '2px',
                cursor: 'pointer',
              }}
            >
              TAP POWER
            </button>
            <button
              onClick={() => setActiveTab('skills')}
              className="font-pixel"
              style={{
                flex: 1,
                background: activeTab === 'skills' ? '#100018' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'skills' ? '2px solid #ff0080' : '2px solid transparent',
                color: activeTab === 'skills' ? '#ff0080' : '#3a5a6a',
                padding: '10px',
                fontSize: '8px',
                letterSpacing: '2px',
                cursor: 'pointer',
              }}
            >
              SKILLS
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {activeTab === 'hero' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '10px', marginBottom: 4 }}>
                Upgrade your tap damage, crit chance, and crit multiplier.
              </div>
              {heroUpgradesList.map(upgrade => (
                <div
                  key={upgrade.id}
                  style={{
                    background: '#080810',
                    border: `1px solid ${upgrade.canAfford ? upgrade.color + '44' : '#1a1a2a'}`,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: `${upgrade.color}11`,
                      border: `1px solid ${upgrade.color}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: upgrade.color,
                      flexShrink: 0,
                    }}
                  >
                    {ICON_MAP[upgrade.id] ?? <ArrowUp size={18} />}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Tooltip
                      position="right"
                      content={
                        <>
                          <TooltipLabel label={upgrade.name} color={upgrade.color} />
                          <TooltipText>{upgrade.description}</TooltipText>
                          <TooltipStat
                            label="Effect"
                            value={
                              upgrade.modifierType === 'tap_damage'
                                ? `+${upgrade.valuePerLevel} per level`
                                : upgrade.modifierType === 'crit_chance'
                                ? `+${(upgrade.valuePerLevel * 100).toFixed(0)}% per level`
                                : `+${(upgrade.valuePerLevel * 100).toFixed(0)}% per level`
                            }
                            color={upgrade.color}
                          />
                        </>
                      }
                    >
                      <div className="font-pixel" style={{ color: upgrade.color, fontSize: '9px', cursor: 'help' }}>
                        {upgrade.name}
                      </div>
                    </Tooltip>
                    <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px', marginTop: 2 }}>
                      {upgrade.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                        LVL <span style={{ color: upgrade.color }}>{upgrade.level}</span>
                        {upgrade.maxLevel < 9999 && <span style={{ color: '#2a3a4a' }}>/{upgrade.maxLevel}</span>}
                      </span>
                      {upgrade.modifierType === 'tap_damage' && (
                        <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                          +<span style={{ color: upgrade.color }}>{upgrade.level * upgrade.valuePerLevel}</span> DMG
                        </span>
                      )}
                      {upgrade.modifierType === 'crit_chance' && (
                        <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                          +<span style={{ color: upgrade.color }}>{(upgrade.level * upgrade.valuePerLevel * 100).toFixed(0)}%</span> CRIT
                        </span>
                      )}
                      {upgrade.modifierType === 'crit_multiplier' && (
                        <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                          +<span style={{ color: upgrade.color }}>{(upgrade.level * upgrade.valuePerLevel * 100).toFixed(0)}%</span> CRIT DMG
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handleHeroUpgrade(upgrade.id)}
                    disabled={!upgrade.canAfford}
                    className="font-pixel"
                    style={{
                      background: upgrade.canAfford ? `${upgrade.color}11` : '#0a0a0f',
                      border: `1px solid ${upgrade.canAfford ? upgrade.color : '#1a2a3a'}`,
                      color: upgrade.canAfford ? upgrade.color : '#2a3a4a',
                      padding: '8px 12px',
                      fontSize: '8px',
                      cursor: upgrade.canAfford ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {upgrade.level >= upgrade.maxLevel ? 'MAX' : `◆${formatNumber(upgrade.cost)}`}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'skills' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '10px', marginBottom: 4 }}>
                Upgrade your skills to increase their effectiveness.
              </div>
              {skillUpgradesList.map(upgrade => (
                <div
                  key={upgrade.skillId}
                  style={{
                    background: '#080810',
                    border: `1px solid ${upgrade.canAfford ? upgrade.color + '44' : '#1a1a2a'}`,
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Icon placeholder */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: `${upgrade.color}11`,
                      border: `1px solid ${upgrade.color}33`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: upgrade.color,
                      flexShrink: 0,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '14px',
                    }}
                  >
                    {upgrade.skillId.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-pixel" style={{ color: upgrade.color, fontSize: '9px' }}>
                      {upgrade.name}
                    </div>
                    <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px', marginTop: 2 }}>
                      {upgrade.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                        LVL <span style={{ color: upgrade.color }}>{upgrade.level}</span>
                        <span style={{ color: '#2a3a4a' }}>/{upgrade.maxLevel}</span>
                      </span>
                      <span style={{ color: '#3a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                        <span style={{ color: upgrade.color }}>{((upgrade.effectiveness - 1) * 100).toFixed(0)}%</span> BONUS
                      </span>
                    </div>
                  </div>

                  {/* Buy Button */}
                  <button
                    onClick={() => handleSkillUpgrade(upgrade.skillId)}
                    disabled={!upgrade.canAfford}
                    className="font-pixel"
                    style={{
                      background: upgrade.canAfford ? `${upgrade.color}11` : '#0a0a0f',
                      border: `1px solid ${upgrade.canAfford ? upgrade.color : '#1a2a3a'}`,
                      color: upgrade.canAfford ? upgrade.color : '#2a3a4a',
                      padding: '8px 12px',
                      fontSize: '8px',
                      cursor: upgrade.canAfford ? 'pointer' : 'not-allowed',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {upgrade.level >= upgrade.maxLevel ? 'MAX' : `◆${formatNumber(upgrade.cost)}`}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            flexShrink: 0,
            borderTop: '1px solid #1a2a3a',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            Gold: <span style={{ color: '#ffaa00' }}>◆{formatNumber(gold)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
