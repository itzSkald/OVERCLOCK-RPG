import React, { useState, useEffect, useCallback } from 'react';
import { X, Zap, Cpu, Coins, Target, ShoppingBag } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import { SHOP_CATALOG, type ShopItem } from '../../plugins/ShopPlugin';
import type { ShopPlugin } from '../../plugins/ShopPlugin';

interface ShopScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.FC<{ size: number; color: string }>> = {
  Zap, Cpu, Coins, Target,
};

function ShopItemCard({
  item,
  canBuy,
  purchaseCount,
  onBuy,
}: {
  item: ShopItem;
  canBuy: boolean;
  purchaseCount: number;
  onBuy: () => void;
}) {
  const [flash, setFlash] = useState(false);
  const maxed = purchaseCount >= item.maxPurchases;
  const Icon = ICON_MAP[item.icon] ?? Zap;

  const currencySymbol = item.currency === 'oct' ? 'OC' : '◈';
  const currencyColor = item.currency === 'oct' ? '#ff0080' : '#00e5ff';

  const handleClick = () => {
    if (!canBuy || maxed) return;
    onBuy();
    setFlash(true);
    setTimeout(() => setFlash(false), 400);
  };

  return (
    <div
      style={{
        background: flash ? `${item.color}18` : '#0a0a12',
        border: `1px solid ${maxed ? '#1a2a1a' : canBuy ? item.color + '55' : '#1a1a2a'}`,
        padding: '10px 12px',
        marginBottom: 8,
        position: 'relative',
        transition: 'background 0.2s, border-color 0.2s',
        boxShadow: canBuy && !maxed ? `0 0 8px ${item.color}22` : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: maxed ? '#0a120a' : `${item.color}12`,
            border: `1px solid ${maxed ? '#1a2a1a' : item.color + '44'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={14} color={maxed ? '#2a3a2a' : item.color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-pixel" style={{ color: maxed ? '#3a4a3a' : item.color, fontSize: '8px', marginBottom: 2 }}>
            {item.name}
          </div>
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
            {item.description}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {maxed ? (
            <span className="font-pixel" style={{ color: '#39ff14', fontSize: '7px', letterSpacing: '1px' }}>MAXED</span>
          ) : (
            <button
              onClick={handleClick}
              disabled={!canBuy}
              className="font-pixel"
              style={{
                background: canBuy ? `${item.color}18` : '#080808',
                border: `1px solid ${canBuy ? item.color : '#1a1a2a'}`,
                color: canBuy ? item.color : '#2a2a3a',
                padding: '4px 8px',
                fontSize: '7px',
                cursor: canBuy ? 'pointer' : 'not-allowed',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
                boxShadow: canBuy ? `0 0 6px ${item.color}33` : 'none',
                transition: 'all 0.1s',
              }}
            >
              {item.price} <span style={{ color: currencyColor }}>{currencySymbol}</span>
            </button>
          )}
          <span style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            {purchaseCount}/{item.maxPurchases}
          </span>
        </div>
      </div>
    </div>
  );
}

type ShopTab = 'oct' | 'diamond';

export const ShopScreen: React.FC<ShopScreenProps> = ({ engine, onClose }) => {
  const [tab, setTab] = useState<ShopTab>('oct');
  const overclockCount = useGameState(engine, s => s.overclockCount);
  const diamonds = useGameState(engine, s => s.diamonds);

  const shopPlugin = engine.getPlugin<ShopPlugin>('shop');
  const [, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => {
    if (!shopPlugin) return;
    return shopPlugin.subscribe(refresh);
  }, [shopPlugin, refresh]);

  const visibleItems = SHOP_CATALOG.filter(i => i.currency === tab);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          background: '#0a0a12',
          border: '1px solid #1a2a3a',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 12px',
          boxShadow: '0 0 40px rgba(0,245,255,0.08)',
        }}
      >
        {/* Header */}
        <div
          style={{
            flexShrink: 0,
            padding: '12px 14px',
            borderBottom: '1px solid #1a2a3a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#050510',
          }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} color="#00f5ff" />
            <span className="font-pixel" style={{ color: '#00f5ff', fontSize: '10px', letterSpacing: '2px' }}>
              BLACK MARKET
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span style={{ color: '#ff0080', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>OC</span>
              <span className="font-pixel" style={{ color: '#ff0080', fontSize: '10px' }}>{overclockCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>◈</span>
              <span className="font-pixel" style={{ color: '#00e5ff', fontSize: '10px' }}>{diamonds}</span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #1a2a3a',
                color: '#3a4a5a',
                width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'color 0.1s, border-color 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.borderColor = '#ff4444'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3a4a5a'; e.currentTarget.style.borderColor = '#1a2a3a'; }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            flexShrink: 0,
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            borderBottom: '1px solid #1a2a3a',
          }}
        >
          <button
            onClick={() => setTab('oct')}
            className="font-pixel"
            style={{
              background: tab === 'oct' ? '#130010' : 'transparent',
              border: 'none',
              borderBottom: tab === 'oct' ? '2px solid #ff0080' : '2px solid transparent',
              color: tab === 'oct' ? '#ff0080' : '#3a4a5a',
              padding: '10px',
              fontSize: '8px',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            OC TOKEN STORE
          </button>
          <button
            onClick={() => setTab('diamond')}
            className="font-pixel"
            style={{
              background: tab === 'diamond' ? '#001520' : 'transparent',
              border: 'none',
              borderBottom: tab === 'diamond' ? '2px solid #00e5ff' : '2px solid transparent',
              color: tab === 'diamond' ? '#00e5ff' : '#3a4a5a',
              padding: '10px',
              fontSize: '8px',
              letterSpacing: '1px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ◈ DIAMOND STORE
          </button>
        </div>

        {/* Description bar */}
        <div style={{ flexShrink: 0, padding: '8px 14px', background: '#06060e', borderBottom: '1px solid #10182a' }}>
          {tab === 'oct' ? (
            <div style={{ color: '#5a7a8a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
              Spend OC tokens earned from Overclock events to buy permanent stat boosts.
            </div>
          ) : (
            <div style={{ color: '#5a7a8a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
              Diamonds ◈ are earned by completing daily ops. Spend them on powerful upgrades.
            </div>
          )}
        </div>

        {/* Item list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
          {visibleItems.map(item => (
            <ShopItemCard
              key={item.id}
              item={item}
              canBuy={shopPlugin?.canBuy(item) ?? false}
              purchaseCount={shopPlugin?.getPurchaseCount(item.id) ?? 0}
              onBuy={() => shopPlugin?.buy(item.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
