import React, { useState } from 'react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import { getComponentBulkCost, getComponentDps } from '../../plugins/ComponentPlugin';
import type { ComponentPlugin } from '../../plugins/ComponentPlugin';
import type { ComponentDef } from '../../engine/types';
import { Tooltip, TooltipLabel, TooltipText, TooltipStat } from './Tooltip';

type PurchaseMode = 1 | 10 | 100 | 'max';

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
  purchaseMode: PurchaseMode;
  maxQty: number;
  onBuy: (qty: number) => boolean;
}> = ({ comp, gold, purchaseMode, maxQty, onBuy }) => {
  const colors = COLOR_MAP[comp.color];
  const dps = getComponentDps(comp);
  const [levelUpKey, setLevelUpKey] = useState(0);
  const [levelUpQty, setLevelUpQty] = useState(0);
  const [showLevelUpText, setShowLevelUpText] = useState(false);

  const qty = purchaseMode === 'max' ? maxQty : purchaseMode;
  const cost = qty > 0 ? getComponentBulkCost(comp, qty) : 0;
  const canAfford = qty > 0 && gold >= cost;

  if (!comp.unlocked) return null;

  const label =
    purchaseMode === 'max'
      ? maxQty > 0 ? `MAX x${maxQty} ◆${formatNumber(cost)}` : 'MAX ◆--'
      : `x${qty} ◆${formatNumber(cost)}`;

  const handleBuyClick = () => {
    if (!canAfford) return;
    const purchased = qty > 0 ? qty : 0;
    const success = onBuy(qty);
    if (success && purchased > 0) {
      setLevelUpQty(purchased);
      setLevelUpKey(k => k + 1);
      setShowLevelUpText(true);
      setTimeout(() => setShowLevelUpText(false), 650);
    }
  };

  return (
    <div
      key={levelUpKey > 0 ? `flash-${levelUpKey}` : comp.id}
      className={`pixel-border mb-2${levelUpKey > 0 ? ' animate-level-up-flash' : ''}`}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        padding: '10px',
        boxShadow: `0 0 8px ${colors.glow}`,
        position: 'relative',
        ['--luf-color' as string]: colors.text,
        transition: 'box-shadow 0.1s',
      }}
    >
      {showLevelUpText && (
        <div
          className="animate-level-up-text font-pixel"
          style={{
            position: 'absolute',
            top: 4,
            right: 8,
            color: colors.text,
            fontSize: '7px',
            textShadow: `0 0 8px ${colors.text}`,
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          +{levelUpQty} LVL
        </div>
      )}

      <div className="flex justify-between items-start mb-1">
        <Tooltip
          position="right"
          content={
            <>
              <TooltipLabel label={comp.name} color={colors.text} />
              <TooltipText>{comp.description}</TooltipText>
              <TooltipStat label="Level" value={`${comp.level}`} color={colors.text} />
              <TooltipStat label="DPS/lvl" value={`${formatNumber(comp.baseDps ?? dps / Math.max(1, comp.level))}`} color="#5a7a8a" />
              <TooltipStat label="Total DPS" value={`${formatNumber(dps)}/s`} color={colors.text} />
            </>
          }
        >
          <div>
            <div className="font-pixel" style={{ color: colors.text, fontSize: '8px', marginBottom: 3, cursor: 'help' }}>
              {comp.name}
            </div>
            <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              {comp.description}
            </div>
          </div>
        </Tooltip>
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
          onClick={handleBuyClick}
          disabled={!canAfford}
          className="font-pixel pixel-border"
          style={{
            background: canAfford ? colors.bg : '#0a0a0f',
            borderColor: canAfford ? colors.text : '#1a2a3a',
            color: canAfford ? colors.text : '#2a3a4a',
            padding: '5px 8px',
            fontSize: '7px',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            boxShadow: canAfford ? `0 0 6px ${colors.glow}` : 'none',
            whiteSpace: 'nowrap',
            transition: 'transform 0.08s, box-shadow 0.08s',
          }}
          onMouseDown={e => { if (canAfford) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.93)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {label}
        </button>
      </div>
    </div>
  );
};

export const ComponentPanel: React.FC<ComponentPanelProps> = ({ engine }) => {
  const components = useGameState(engine, s => s.components);
  const gold = useGameState(engine, s => s.gold);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(1);

  const plugin = engine.getPlugin<ComponentPlugin>('component');

  const handleBuy = (id: string, qty: number): boolean => {
    if (qty <= 0) return false;
    return plugin?.purchaseBulk(id, qty) ?? false;
  };

  const unlockedComponents = Object.values(components).filter(c => c.unlocked);

  const MODES: { label: string; value: PurchaseMode }[] = [
    { label: 'x1', value: 1 },
    { label: 'x10', value: 10 },
    { label: 'x100', value: 100 },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f' }}>

      {/* Header + purchase mode selector */}
      <div style={{ flexShrink: 0, padding: '8px 8px 0' }}>
        <div style={{ borderBottom: '1px solid #1a2a3a', paddingBottom: 8, marginBottom: 0 }}>
          <div
            className="font-pixel mb-2"
            style={{ color: '#5a6a7a', fontSize: '7px', letterSpacing: '2px' }}
          >
            {'> HARDWARE MODULES'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 4 }}>
            {MODES.map(m => {
              const active = purchaseMode === m.value;
              return (
                <button
                  key={m.value}
                  onClick={() => setPurchaseMode(m.value)}
                  className="font-pixel"
                  style={{
                    background: active ? '#001a20' : '#080810',
                    border: `1px solid ${active ? '#00f5ff' : '#1a2a3a'}`,
                    color: active ? '#00f5ff' : '#3a4a5a',
                    padding: '5px 0',
                    fontSize: '7px',
                    cursor: 'pointer',
                    boxShadow: active ? '0 0 8px rgba(0,245,255,0.2)' : 'none',
                    transition: 'all 0.1s',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPurchaseMode('max')}
            className="font-pixel w-full"
            style={{
              background: purchaseMode === 'max' ? '#130800' : '#080808',
              border: `1px solid ${purchaseMode === 'max' ? '#ffaa00' : '#1a1a2a'}`,
              color: purchaseMode === 'max' ? '#ffaa00' : '#3a3a4a',
              padding: '5px 0',
              fontSize: '7px',
              letterSpacing: '2px',
              cursor: 'pointer',
              boxShadow: purchaseMode === 'max' ? '0 0 8px rgba(255,170,0,0.2)' : 'none',
              transition: 'all 0.1s',
            }}
          >
            BUY MAX
          </button>
        </div>
      </div>

      {/* Scrollable components list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 8px' }}>
        {unlockedComponents.length === 0 && (
          <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>
            Kill enemies to unlock components
          </div>
        )}

        {unlockedComponents.map(comp => {
          const maxQty = plugin?.getMaxAffordable(comp.id) ?? 0;
          return (
            <ComponentCard
              key={comp.id}
              comp={comp}
              gold={gold}
              purchaseMode={purchaseMode}
              maxQty={maxQty}
              onBuy={qty => handleBuy(comp.id, qty)}
            />
          );
        })}
      </div>
    </div>
  );
};
