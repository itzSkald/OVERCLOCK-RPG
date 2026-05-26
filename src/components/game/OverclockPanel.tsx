import React, { useState } from 'react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import {
  calculateOverclockGain,
  OVERCLOCK_PERKS,
  getOverclockPerkLevel,
} from '../../plugins/OverclockPlugin';
import type { OverclockPlugin } from '../../plugins/OverclockPlugin';

interface OverclockPanelProps {
  engine: GameEngine;
}

export const OverclockPanel: React.FC<OverclockPanelProps> = ({ engine }) => {
  const highestStage = useGameState(engine, s => s.highestStage ?? s.stage);
  const stage = useGameState(engine, s => s.stage);
  const overclockCount = useGameState(engine, s => s.overclockCount);
  const upgrades = useGameState(engine, s => s.overclockUpgrades ?? {});
  const [confirming, setConfirming] = useState(false);

  const plugin = engine.getPlugin<OverclockPlugin>('overclock');
  const gain = calculateOverclockGain(highestStage);
  const canOverclock = gain > 0;
  const available = plugin?.getAvailableOCT() ?? 0;
  const spent = plugin?.getSpentOCT() ?? 0;

  const handleOverclock = () => {
    plugin?.perform();
    setConfirming(false);
  };

  return (
    <div className="flex flex-col gap-2" style={{ height: '100%' }}>
      {/* OCT Balance Header */}
      <div
        className="pixel-border"
        style={{
          background: '#0a0010',
          borderColor: '#ff0080',
          padding: '10px 12px',
          boxShadow: '0 0 12px rgba(255,0,128,0.15)',
          flexShrink: 0,
        }}
      >
        <div className="font-pixel mb-2" style={{ color: '#ff0080', fontSize: '7px', letterSpacing: '2px' }}>
          {'> OVERCLOCK TOKENS'}
        </div>
        <div className="flex items-baseline gap-3">
          <div>
            <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>TOTAL</div>
            <div className="font-pixel glow-pink" style={{ color: '#ff0080', fontSize: '18px' }}>{overclockCount}</div>
          </div>
          <div style={{ color: '#2a2a3a', fontSize: '14px' }}>|</div>
          <div>
            <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>SPENT</div>
            <div className="font-pixel" style={{ color: '#5a3a5a', fontSize: '14px' }}>{spent}</div>
          </div>
          <div style={{ color: '#2a2a3a', fontSize: '14px' }}>|</div>
          <div>
            <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>FREE</div>
            <div className="font-pixel glow-cyan" style={{ color: '#00f5ff', fontSize: '14px' }}>{available}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
          <div>
            <span style={{ color: '#3a4a5a' }}>STG </span>
            <span style={{ color: '#00f5ff' }}>{stage}</span>
            <span style={{ color: '#3a4a5a' }}> / PEAK </span>
            <span style={{ color: canOverclock ? '#ff0080' : '#3a3a5a' }}>{highestStage}</span>
          </div>
          <div>
            <span style={{ color: '#3a4a5a' }}>NEXT: </span>
            <span style={{ color: canOverclock ? '#ff0080' : '#2a2a3a' }}>+{gain} OCT</span>
          </div>
        </div>
      </div>

      {/* Perk Shop */}
      <div
        className="pixel-border flex flex-col gap-2 overflow-y-auto"
        style={{
          background: '#080010',
          borderColor: '#1a0a2a',
          padding: '10px 12px',
          flex: 1,
          minHeight: 0,
        }}
      >
        <div className="font-pixel mb-1" style={{ color: '#5a3a7a', fontSize: '7px', letterSpacing: '2px' }}>
          {'> EXPLOIT LIBRARY'}
        </div>

        {OVERCLOCK_PERKS.map(perk => {
          const level = getOverclockPerkLevel(upgrades, perk.id);
          const maxed = level >= perk.maxLevel;
          const canBuy = plugin?.canBuyPerk(perk.id) ?? false;
          const progress = level / perk.maxLevel;

          return (
            <div
              key={perk.id}
              className="pixel-border"
              style={{
                background: '#0a0015',
                borderColor: maxed ? perk.color : canBuy ? `${perk.color}44` : '#1a1a2a',
                padding: '8px 10px',
                boxShadow: maxed ? `0 0 8px ${perk.color}44` : canBuy ? `0 0 4px ${perk.color}22` : 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="font-pixel" style={{ color: maxed ? perk.color : canBuy ? perk.color : '#3a3a5a', fontSize: '7px', letterSpacing: '1px' }}>
                    {perk.name}
                  </div>
                  <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 2, fontStyle: 'italic' }}>
                    {perk.flavor}
                  </div>
                  <div style={{ color: '#5a6a5a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 1 }}>
                    {perk.description}
                  </div>

                  {/* Level bar */}
                  <div className="flex items-center gap-2 mt-2">
                    <div style={{ flex: 1, height: 3, background: '#1a1a2a', position: 'relative', overflow: 'hidden' }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: 0, top: 0, bottom: 0,
                          width: `${progress * 100}%`,
                          background: perk.color,
                          boxShadow: `0 0 6px ${perk.color}`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                    <div className="font-pixel" style={{ color: perk.color, fontSize: '7px', whiteSpace: 'nowrap' }}>
                      {level}/{perk.maxLevel}
                    </div>
                  </div>
                </div>

                <div style={{ flexShrink: 0 }}>
                  {maxed ? (
                    <div className="font-pixel" style={{ color: perk.color, fontSize: '7px', padding: '4px 6px', border: `1px solid ${perk.color}`, background: `${perk.color}11` }}>
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
                        padding: '4px 8px',
                        fontSize: '7px',
                        cursor: canBuy ? 'pointer' : 'not-allowed',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {perk.costPerLevel} OCT
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset Section */}
      <div
        className="pixel-border"
        style={{
          background: '#0d0010',
          borderColor: canOverclock ? '#ff0080' : '#1a1a2a',
          padding: '10px 12px',
          boxShadow: canOverclock ? '0 0 16px rgba(255,0,128,0.2)' : 'none',
          flexShrink: 0,
        }}
      >
        {!canOverclock ? (
          <div className="font-pixel" style={{ color: '#2a2a3a', fontSize: '7px', textAlign: 'center', lineHeight: 2 }}>
            REACH STAGE 5 TO UNLOCK RESET<br />
            <span style={{ color: '#1a2a1a' }}>HIGHER STAGE = MORE OCT</span>
          </div>
        ) : confirming ? (
          <div>
            <div className="font-pixel mb-2" style={{ color: '#ffaa00', fontSize: '7px', lineHeight: 1.8, textAlign: 'center' }}>
              WARNING: RESETS STAGE, GOLD &amp; COMPONENTS<br />
              <span style={{ color: '#ff0080' }}>GAIN +{gain} OCT — PERKS PERSIST</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOverclock}
                className="flex-1 font-pixel pixel-border-pink"
                style={{ background: '#3d0024', color: '#ff0080', padding: '8px', fontSize: '7px' }}
              >
                INITIATE RESET
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 font-pixel pixel-border"
                style={{ background: '#0a0a0f', color: '#5a6a7a', borderColor: '#1a2a3a', padding: '8px', fontSize: '7px' }}
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
              background: 'linear-gradient(135deg, #1a0010 0%, #2a0018 100%)',
              border: '1px solid #ff0080',
              color: '#ff0080',
              padding: '10px',
              fontSize: '8px',
              letterSpacing: '2px',
              boxShadow: '0 0 12px rgba(255,0,128,0.3)',
              cursor: 'pointer',
            }}
          >
            INITIATE OVERCLOCK RESET
            <div style={{ fontSize: '7px', color: '#ff008099', marginTop: 2, letterSpacing: '1px' }}>
              +{gain} OCT REWARD
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
