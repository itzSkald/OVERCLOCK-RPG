import React, { useState } from 'react';
import { CircuitBoard, Zap } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import { getComponentBulkCost, getComponentDps } from '../../plugins/ComponentPlugin';
import type { ComponentPlugin } from '../../plugins/ComponentPlugin';
import type { ComponentDef } from '../../engine/types';
import type { OverclockPlugin } from '../../plugins/OverclockPlugin';
import { Tooltip, TooltipLabel, TooltipText, TooltipStat } from './Tooltip';

type PurchaseMode = 1 | 10 | 100 | 'max';

interface ComponentPanelProps {
  engine: GameEngine;
  onOpenMotherboard?: () => void;
  onOpenOverclock?: () => void;
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
  onBuy: (qty: number) => void;
}> = ({ comp, gold, purchaseMode, maxQty, onBuy }) => {
  const colors = COLOR_MAP[comp.color];
  const dps = getComponentDps(comp);

  const qty = purchaseMode === 'max' ? maxQty : purchaseMode;
  const cost = qty > 0 ? getComponentBulkCost(comp, qty) : 0;
  const canAfford = qty > 0 && gold >= cost;

  if (!comp.unlocked) return null;

  const label =
    purchaseMode === 'max'
      ? maxQty > 0 ? `MAX x${maxQty} ◆${formatNumber(cost)}` : 'MAX ◆--'
      : `x${qty} ◆${formatNumber(cost)}`;

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
          onClick={() => onBuy(qty)}
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
          }}
        >
          {label}
        </button>
      </div>
    </div>
  );
};

export const ComponentPanel: React.FC<ComponentPanelProps> = ({ engine, onOpenMotherboard, onOpenOverclock }) => {
  const components = useGameState(engine, s => s.components);
  const gold = useGameState(engine, s => s.gold);
  const inventoryCount = useGameState(engine, s => (s.inventory ?? []).length);
  const equippedItems = useGameState(engine, s => s.equippedItems);
  const overclockCount = useGameState(engine, s => s.overclockCount);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(1);

  const equippedCount = Object.values(equippedItems ?? {})
    .flatMap(v => Array.isArray(v) ? v : [v])
    .filter(Boolean).length;

  const availableOCT = engine.getPlugin<OverclockPlugin>('overclock')?.getAvailableOCT() ?? overclockCount;
  const plugin = engine.getPlugin<ComponentPlugin>('component');

  const handleBuy = (id: string, qty: number) => {
    if (qty <= 0) return;
    plugin?.purchaseBulk(id, qty);
  };

  const unlockedComponents = Object.values(components).filter(c => c.unlocked);

  const hasBoardActivity = equippedCount > 0 || inventoryCount > 0;
  const hasOCT = availableOCT > 0;

  const MODES: { label: string; value: PurchaseMode }[] = [
    { label: 'x1', value: 1 },
    { label: 'x10', value: 10 },
    { label: 'x100', value: 100 },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0f' }}>

      {/* Shortcut buttons */}
      <div style={{ flexShrink: 0, padding: '8px 8px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>

          {/* Motherboard / Hardware button */}
          <button
            onClick={onOpenMotherboard}
            className="font-pixel flex items-center justify-center gap-1"
            style={{
              background: hasBoardActivity ? '#031a10' : '#080810',
              border: `1px solid ${hasBoardActivity ? '#39ff1455' : '#1a2a2a'}`,
              color: hasBoardActivity ? '#39ff14' : '#2a3a4a',
              padding: '7px 6px',
              fontSize: '6px',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s, box-shadow 0.15s',
              boxShadow: hasBoardActivity ? '0 0 8px rgba(57,255,20,0.12)' : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#39ff14';
              e.currentTarget.style.color = '#39ff14';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(57,255,20,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = hasBoardActivity ? '#39ff1455' : '#1a2a2a';
              e.currentTarget.style.color = hasBoardActivity ? '#39ff14' : '#2a3a4a';
              e.currentTarget.style.boxShadow = hasBoardActivity ? '0 0 8px rgba(57,255,20,0.12)' : 'none';
            }}
          >
            <CircuitBoard size={10} />
            HARDWARE
            {inventoryCount > 0 && (
              <span style={{
                background: '#39ff14', color: '#000',
                padding: '0 3px', fontSize: '6px', lineHeight: '11px',
                minWidth: 11, textAlign: 'center', fontFamily: 'var(--font-mono)',
              }}>
                {inventoryCount}
              </span>
            )}
          </button>

          {/* Overclock button */}
          <button
            onClick={onOpenOverclock}
            className="font-pixel flex items-center justify-center gap-1"
            style={{
              background: hasOCT ? '#130010' : '#080808',
              border: `1px solid ${hasOCT ? '#ff008055' : '#1a1a2a'}`,
              color: hasOCT ? '#ff0080' : '#2a2a3a',
              padding: '7px 6px',
              fontSize: '6px',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'border-color 0.15s, color 0.15s, box-shadow 0.15s',
              boxShadow: hasOCT ? '0 0 8px rgba(255,0,128,0.12)' : 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#ff0080';
              e.currentTarget.style.color = '#ff0080';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(255,0,128,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = hasOCT ? '#ff008055' : '#1a1a2a';
              e.currentTarget.style.color = hasOCT ? '#ff0080' : '#2a2a3a';
              e.currentTarget.style.boxShadow = hasOCT ? '0 0 8px rgba(255,0,128,0.12)' : 'none';
            }}
          >
            <Zap size={10} />
            OVERCLOCK
            {hasOCT && (
              <span style={{
                background: '#ff0080', color: '#000',
                padding: '0 3px', fontSize: '6px', lineHeight: '11px',
                minWidth: 11, textAlign: 'center', fontFamily: 'var(--font-mono)',
              }}>
                {availableOCT}
              </span>
            )}
          </button>
        </div>

        {/* Header + purchase mode selector */}
        <div style={{ borderBottom: '1px solid #1a2a3a', paddingBottom: 8, marginBottom: 0 }}>
          <div
            className="font-pixel mb-2"
            style={{ color: '#5a6a7a', fontSize: '7px', letterSpacing: '2px' }}
          >
            {'> HARDWARE MODULES'}
          </div>

          {/* x1 / x10 / x100 row */}
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

          {/* BUY MAX button */}
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
