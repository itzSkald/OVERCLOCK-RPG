import React from 'react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import { ENEMY_CONFIG } from '../../config/game.config';

interface BossTimerProps {
  engine: GameEngine;
}

export const BossTimer: React.FC<BossTimerProps> = ({ engine }) => {
  const isBossActive = useGameState(engine, s => s.isBossActive);
  const bossTimeRemaining = useGameState(engine, s => s.bossTimeRemaining);
  const BOSS_TIMEOUT = ENEMY_CONFIG.bossTimeoutSeconds;

  if (!isBossActive) return null;

  const pct = Math.max(0, (bossTimeRemaining / BOSS_TIMEOUT) * 100);
  const isLow = bossTimeRemaining < 10;

  return (
    <div
      className="pixel-border"
      style={{ background: '#1a0010', borderColor: '#ff0080', padding: '6px 10px' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-pixel glow-pink" style={{ color: '#ff0080', fontSize: '7px' }}>
          BOSS TIMER
        </span>
        <span
          className={`font-pixel ${isLow ? 'glow-red animate-blink' : 'glow-pink'}`}
          style={{ color: isLow ? '#ff2222' : '#ff0080', fontSize: '8px' }}
        >
          {Math.ceil(bossTimeRemaining)}s
        </span>
      </div>
      <div style={{ background: '#3d0024', height: 6, position: 'relative' }}>
        <div
          className="hp-bar-fill"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: isLow ? '#ff2222' : '#ff0080',
            boxShadow: `0 0 6px ${isLow ? 'rgba(255,34,34,0.8)' : 'rgba(255,0,128,0.6)'}`,
          }}
        />
      </div>
    </div>
  );
};
