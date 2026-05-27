import React from 'react';
import type { Enemy } from '../../engine/types';
import type { ZoneConfig } from './ZoneScene';

interface EnemySpriteProps {
  enemy: Enemy;
  isHit: boolean;
  isDying: boolean;
  zone: ZoneConfig;
}

// Pixel art grids per tier (B=body, A=accent, space=transparent)
const PIXEL_ARTS: string[][][] = [
  // Tier 0 — simple blob (PERIMETER)
  [
    [' ', 'B', 'B', 'B', ' '],
    ['B', 'A', 'B', 'A', 'B'],
    ['B', 'B', 'B', 'B', 'B'],
    [' ', 'B', 'A', 'B', ' '],
    [' ', 'B', 'B', 'B', ' '],
    ['B', ' ', ' ', ' ', 'B'],
  ],
  // Tier 1 — winged form (FIREWALL)
  [
    ['B', ' ', 'B', 'B', ' ', 'B'],
    ['B', 'B', 'A', 'B', 'A', 'B'],
    ['B', 'B', 'B', 'B', 'B', 'B'],
    [' ', 'B', 'A', 'A', 'B', ' '],
    [' ', 'B', 'B', 'B', 'B', ' '],
    ['B', ' ', 'B', 'B', ' ', 'B'],
  ],
  // Tier 2 — spider form (KERNEL)
  [
    ['B', ' ', 'B', 'B', 'B', ' ', 'B'],
    [' ', 'B', 'A', 'B', 'A', 'B', ' '],
    ['B', 'B', 'B', 'B', 'B', 'B', 'B'],
    ['B', 'B', 'B', 'B', 'B', 'B', 'B'],
    [' ', 'B', 'A', 'B', 'A', 'B', ' '],
    ['B', ' ', 'B', ' ', 'B', ' ', 'B'],
    [' ', 'B', ' ', ' ', ' ', 'B', ' '],
  ],
  // Tier 3 — tall serpent (CORE)
  [
    [' ', ' ', 'B', 'B', 'B', ' ', ' '],
    [' ', 'B', 'A', 'B', 'A', 'B', ' '],
    ['B', 'B', 'B', 'B', 'B', 'B', 'B'],
    [' ', 'B', 'B', 'B', 'B', 'B', ' '],
    [' ', ' ', 'B', 'A', 'B', ' ', ' '],
    [' ', 'B', 'B', 'B', 'B', 'B', ' '],
    [' ', 'B', ' ', ' ', ' ', 'B', ' '],
    ['B', ' ', ' ', ' ', ' ', ' ', 'B'],
  ],
  // Tier 4 — void entity (THE VOID)
  [
    ['B', ' ', 'B', 'B', 'B', ' ', 'B'],
    [' ', 'B', 'A', 'A', 'A', 'B', ' '],
    ['B', 'A', 'B', 'B', 'B', 'A', 'B'],
    ['B', 'B', 'B', 'B', 'B', 'B', 'B'],
    ['B', 'A', 'B', 'B', 'B', 'A', 'B'],
    [' ', 'B', 'A', 'A', 'A', 'B', ' '],
    ['B', ' ', 'B', 'B', 'B', ' ', 'B'],
    [' ', 'B', ' ', 'B', ' ', 'B', ' '],
  ],
];

const BOSS_PIXEL_ART: string[][] = [
  [' ', 'B', 'B', ' ', ' ', 'B', 'B', ' '],
  ['B', 'B', 'B', 'B', 'B', 'B', 'B', 'B'],
  ['B', 'A', 'B', 'B', 'B', 'B', 'A', 'B'],
  ['B', 'B', 'A', 'B', 'B', 'A', 'B', 'B'],
  ['B', 'B', 'B', 'A', 'A', 'B', 'B', 'B'],
  [' ', 'B', 'A', 'B', 'B', 'A', 'B', ' '],
  [' ', 'B', 'B', 'B', 'B', 'B', 'B', ' '],
  ['B', ' ', 'B', ' ', ' ', 'B', ' ', 'B'],
  [' ', 'B', ' ', 'B', 'B', ' ', 'B', ' '],
];

function getSpriteColors(enemy: Enemy, zone: ZoneConfig) {
  if (enemy.isBoss) {
    return {
      body: '#ff0080',
      accent: '#b00058',
      glow: 'rgba(255,0,128,0.5)',
    };
  }
  if (enemy.isElite) {
    return {
      body: '#ffaa00',
      accent: '#ff6600',
      glow: 'rgba(255,170,0,0.5)',
    };
  }
  return {
    body: zone.accentColor,
    accent: zone.accentColor + 'aa',
    glow: zone.accentColor + '66',
  };
}

function getPhaseOverlay(phase: string | undefined): React.CSSProperties | null {
  if (!phase || phase === 'none') return null;
  switch (phase) {
    case 'shield': return { boxShadow: 'inset 0 0 20px rgba(0,200,255,0.4), 0 0 30px rgba(0,200,255,0.3)' };
    case 'enrage': return { boxShadow: 'inset 0 0 20px rgba(255,50,0,0.5), 0 0 30px rgba(255,50,0,0.3)' };
    case 'regen': return { boxShadow: 'inset 0 0 20px rgba(57,255,20,0.4), 0 0 30px rgba(57,255,20,0.3)' };
    default: return null;
  }
}

export const EnemySprite: React.FC<EnemySpriteProps> = ({ enemy, isHit, isDying, zone }) => {
  const tier = Math.min(enemy.tier ?? 0, PIXEL_ARTS.length - 1);
  const pixels = enemy.isBoss ? BOSS_PIXEL_ART : PIXEL_ARTS[tier];
  const pixelSize = enemy.isBoss ? 12 : enemy.isElite ? 11 : 10;
  const colors = getSpriteColors(enemy, zone);
  const phaseStyle = getPhaseOverlay(enemy.bossPhase);

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Phase overlay aura */}
      {phaseStyle && (
        <div
          style={{
            position: 'absolute', inset: -8, borderRadius: 4, pointerEvents: 'none',
            ...phaseStyle,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Elite indicator */}
      {enemy.isElite && (
        <div
          className="font-pixel"
          style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            color: '#ffaa00', fontSize: '6px', letterSpacing: '1px', whiteSpace: 'nowrap',
            textShadow: '0 0 4px #ffaa00',
          }}
        >
          ELITE
        </div>
      )}

      {/* Boss phase label */}
      {enemy.bossPhase && enemy.bossPhase !== 'none' && (
        <div
          className="font-pixel"
          style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            color: enemy.bossPhase === 'shield' ? '#00c8ff' : enemy.bossPhase === 'enrage' ? '#ff3200' : '#39ff14',
            fontSize: '6px', letterSpacing: '1px', whiteSpace: 'nowrap',
            textShadow: `0 0 4px currentColor`,
          }}
        >
          {enemy.bossPhase.toUpperCase()}
        </div>
      )}

      <div
        className={isDying ? 'animate-enemy-death' : isHit ? 'animate-enemy-hit' : ''}
        style={{
          display: 'inline-block',
          filter: enemy.isBoss
            ? `drop-shadow(0 0 16px ${colors.glow}) drop-shadow(0 0 32px ${colors.glow})`
            : `drop-shadow(0 0 10px ${colors.glow}) drop-shadow(0 0 20px ${colors.glow})`,
          imageRendering: 'pixelated',
          animation: enemy.isBoss && !isHit && !isDying ? 'boss-pulse 2s steps(4) infinite' : undefined,
        }}
      >
        {pixels.map((row, ri) => (
          <div key={ri} style={{ display: 'flex' }}>
            {row.map((cell, ci) => (
              <div
                key={ci}
                style={{
                  width: pixelSize,
                  height: pixelSize,
                  background:
                    cell === 'B' ? colors.body :
                    cell === 'A' ? colors.accent :
                    'transparent',
                  imageRendering: 'pixelated',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
