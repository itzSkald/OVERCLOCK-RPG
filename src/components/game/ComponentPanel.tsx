import React from 'react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import { getComponentCost, getComponentDps } from '../../plugins/ComponentPlugin';
import type { ComponentPlugin } from '../../plugins/ComponentPlugin';
import type { ComponentDef } from '../../engine/types';

interface ComponentPanelProps {
  engine: GameEngine;
}

const COLOR_MAP = {
  cyan: { text: '#00f5ff', border: '#003d42', bg: '#0a1f22', glow: 'rgba(0,245,255,0.3)' },
  green: { text: '#39ff14', border: '#0a3d02', bg: '#0a1a02', glow: 'rgba(57,255,20,0.3)' },
  amber: { text: '#ffaa00', border: '#3d2800', bg: '#1a1000', glow: 'rgba(255,170,0,0.3)' },
  pink: { text: '#ff0080', border: '#3d0024', bg: '#1a0010', glow: 'rgba(255,0,128,0.3)' },
};

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toString();
}

const ComponentCard: React.FC<{
  comp: ComponentDef;
  gold: number;
  onBuy: () => void;
}> = ({ comp, gold, onBuy }) => {
  const colors = COLOR_MAP[comp.color];
  const cost = getComponentCost(comp);
  const dps = getComponentDps(comp);
  const canAfford = gold >= cost;

  if (!comp.unlocked) return null;

  return (
    <div
      className="pixel-border mb-2"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        padding: '10px',
        boxShadow: `0 0 8px ${colors.glow}`,
      }}
    >
      <div className="flex justify-between items-start mb-1">
        <div>
          <div className="font-pixel" style={{ color: colors.text, fontSize: '8px', marginBottom: 3 }}>
            {comp.name}
          </div>
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
            {comp.description}
          </div>
        </div>
        <div className="font-pixel" style={{ color: '#5a6a7a', fontSize: '7px', textAlign: 'right' }}>
          LVL<br />
          <span style={{ color: colors.text, fontSize: '9px' }}>{comp.level}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#5a6a7a' }}>
          DPS: <span style={{ color: colors.text }}>{formatNumber(dps)}/s</span>
        </div>

        <button
          onClick={onBuy}
          disabled={!canAfford}
          className="font-pixel pixel-border"
          style={{
            background: canAfford ? colors.bg : '#0a0a0f',
            borderColor: canAfford ? colors.text : '#1a2a3a',
            color: canAfford ? colors.text : '#2a3a4a',
            padding: '5px 10px',
            fontSize: '7px',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            boxShadow: canAfford ? `0 0 6px ${colors.glow}` : 'none',
          }}
        >
          ◆{formatNumber(cost)}
        </button>
      </div>
    </div>
  );
};

export const ComponentPanel: React.FC<ComponentPanelProps> = ({ engine }) => {
  const components = useGameState(engine, s => s.components);
  const gold = useGameState(engine, s => s.gold);

  const handleBuy = (id: string) => {
    const plugin = engine.getPlugin<ComponentPlugin>('component');
    plugin?.purchase(id);
  };

  const unlockedComponents = Object.values(components).filter(c => c.unlocked);

  return (
    <div
      style={{ height: '100%', overflowY: 'auto', padding: '8px', background: '#0a0a0f' }}
    >
      <div className="font-pixel mb-3" style={{ color: '#5a6a7a', fontSize: '7px', letterSpacing: '2px', paddingBottom: 8, borderBottom: '1px solid #1a2a3a' }}>
        {'> HARDWARE MODULES'}
      </div>

      {unlockedComponents.length === 0 && (
        <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>
          Kill enemies to unlock components
        </div>
      )}

      {unlockedComponents.map(comp => (
        <ComponentCard
          key={comp.id}
          comp={comp}
          gold={gold}
          onBuy={() => handleBuy(comp.id)}
        />
      ))}
    </div>
  );
};
