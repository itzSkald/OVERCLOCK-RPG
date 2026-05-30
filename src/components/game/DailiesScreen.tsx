import React, { useCallback, useEffect, useState } from 'react';
import { X, Clock, CheckCircle, Diamond } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { DailyPlugin, DailyChallenge } from '../../plugins/DailyPlugin';
import { getDiamondReward } from '../../plugins/DailyPlugin';
import { useGameState } from '../../hooks/useGameState';

interface DailiesScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export const DailiesScreen: React.FC<DailiesScreenProps> = ({ engine, onClose }) => {
  const plugin = engine.getPlugin<DailyPlugin>('daily');
  const [challenges, setChallenges] = useState<DailyChallenge[]>(plugin?.getChallenges() ?? []);
  const highestStage = useGameState(engine, s => s.highestStage);
  const diamonds = useGameState(engine, s => s.diamonds ?? 0);

  const refresh = useCallback(() => {
    setChallenges([...(plugin?.getChallenges() ?? [])]);
  }, [plugin]);

  useEffect(() => {
    if (!plugin) return;
    refresh();
    return plugin.subscribe(refresh);
  }, [plugin, refresh]);

  const completedCount = challenges.filter(c => c.completed).length;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />

      <div
        style={{
          position: 'relative', zIndex: 1,
          background: '#0a0a0f',
          border: '1px solid #1a3a4a',
          width: '90%', maxWidth: 400, maxHeight: '80dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 0 40px rgba(0,245,255,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <Clock size={14} color="#00f5ff" />
            <span className="font-pixel" style={{ color: '#00f5ff', fontSize: '9px', letterSpacing: '2px' }}>DAILY OPS</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Diamond size={10} color="#00e5ff" />
              <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{diamonds}</span>
            </div>
            <span style={{ color: '#5a7a8a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              {completedCount}/{challenges.length}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #1a2a3a', color: '#5a6a7a', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Challenge list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {challenges.length === 0 && (
            <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center', padding: '30px 0' }}>
              Loading daily challenges...
            </div>
          )}

          {challenges.map((c) => {
            const pct = Math.min(100, (c.current_value / c.target_value) * 100);
            const diamondReward = getDiamondReward(c.challenge_type, highestStage);
            return (
              <div
                key={c.id}
                style={{
                  background: c.completed ? '#031a10' : '#080810',
                  border: `1px solid ${c.completed ? '#39ff1444' : '#1a2a3a'}`,
                  padding: '12px 14px',
                  marginBottom: 8,
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {c.completed ? (
                      <CheckCircle size={12} color="#39ff14" />
                    ) : (
                      <div style={{ width: 12, height: 12, border: '1px solid #2a3a4a' }} />
                    )}
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: c.completed ? '#39ff14' : '#8a9aaa',
                      textDecoration: c.completed ? 'line-through' : 'none',
                    }}>
                      {c.challenge_label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Diamond size={10} color="#00e5ff" />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#00e5ff' }}>
                      +{diamondReward}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: '#0a0a0f', height: 4, position: 'relative', border: '1px solid #1a2a3a' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${pct}%`,
                    background: c.completed ? '#39ff14' : '#00f5ff',
                    boxShadow: c.completed ? '0 0 4px #39ff14' : '0 0 4px #00f5ff',
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#4a5a6a', textAlign: 'right' }}>
                  {formatNumber(c.current_value)} / {formatNumber(c.target_value)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 16px', borderTop: '1px solid #1a2a3a' }}>
          <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center' }}>
            Challenges reset daily at 00:00 UTC
          </div>
        </div>
      </div>
    </div>
  );
};
