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

// Zone-aware body/accent colors: bosses always use pink, others match the zone
function getSpriteColors(isBoss: boolean, zone: ZoneConfig) {
  if (isBoss) {
    return {
      body: '#ff0080',
      accent: '#b00058',
      glow: 'rgba(255,0,128,0.5)',
    };
  }
  return {
    body: zone.accentColor,
    accent: zone.accentColor + 'aa',
    glow: zone.accentColor + '66',
  };
}

export const EnemySprite: React.FC<EnemySpriteProps> = ({ enemy, isHit, isDying, zone }) => {
  const tier = Math.min(enemy.tier ?? 0, PIXEL_ARTS.length - 1);
  const pixels = enemy.isBoss ? BOSS_PIXEL_ART : PIXEL_ARTS[tier];
  const pixelSize = enemy.isBoss ? 12 : 10;
  const colors = getSpriteColors(enemy.isBoss, zone);

  return (
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
  );
};
