import React, { useState, useEffect, useCallback } from 'react';
import { X, Cpu, MemoryStick, Zap, PlusSquare, CircuitBoard, ArrowUpCircle, Layers, Diamond } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import type { HardwareItem, ItemSlot, ItemRarity, ModifierDef, GameState } from '../../engine/types';
import type { ItemPlugin } from '../../plugins/ItemPlugin';
import { normalizeEquipped } from '../../plugins/ItemPlugin';
import type { MoboPlugin } from '../../plugins/MoboPlugin';
import { MOBO_TIERS } from '../../plugins/MoboPlugin';
import { SET_CATALOG } from '../../plugins/SetPlugin';
import type { SetPlugin } from '../../plugins/SetPlugin';

interface MotherboardScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const RARITY_COLOR: Record<ItemRarity, string> = {
  Common: '#6b7a8d',
  Rare: '#00f5ff',
  Epic: '#ffaa00',
  Legendary: '#ff0080',
  Mythic: '#e8d48b',
};

const RARITY_GLOW: Record<ItemRarity, string> = {
  Common: 'none',
  Rare: '0 0 8px rgba(0,245,255,0.45)',
  Epic: '0 0 10px rgba(255,170,0,0.5)',
  Legendary: '0 0 14px rgba(255,0,128,0.7)',
  Mythic: '0 0 18px rgba(232,212,139,0.8)',
};

const SLOT_COLOR: Record<ItemSlot, string> = {
  RAM: '#39ff14',
  GPU: '#00f5ff',
  CPU: '#ffaa00',
  EXPANSION: '#ff6600',
};

const SLOT_FULL_LABEL: Record<ItemSlot, string> = {
  RAM: 'RAM BANK',
  GPU: 'GPU SLOT',
  CPU: 'CPU SOCKET',
  EXPANSION: 'EXPANSION',
};

const SLOT_ICON: Record<ItemSlot, React.FC<{ size?: number; color?: string }>> = {
  RAM: ({ size = 14, color }) => <MemoryStick size={size} color={color} />,
  GPU: ({ size = 14, color }) => <Zap size={size} color={color} />,
  CPU: ({ size = 14, color }) => <Cpu size={size} color={color} />,
  EXPANSION: ({ size = 14, color }) => <PlusSquare size={size} color={color} />,
};

const BOARD_POSITIONS: { slot: ItemSlot; x: string; y: string }[] = [
  { slot: 'CPU',       x: '50%', y: '22%' },
  { slot: 'RAM',       x: '17%', y: '52%' },
  { slot: 'GPU',       x: '50%', y: '76%' },
  { slot: 'EXPANSION', x: '83%', y: '52%' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatStatValue(stat: ModifierDef): string {
  if (stat.isMultiplier) return `+${((stat.value - 1) * 100).toFixed(0)}%`;
  return `+${(stat.value * 100).toFixed(1)}%`;
}

function getStatLabel(type: ModifierDef['type']): string {
  const m: Record<ModifierDef['type'], string> = {
    tap_damage: 'TAP',
    idle_dps: 'DPS',
    gold_rate: 'GOLD',
    crit_chance: 'CRIT%',
    crit_multiplier: 'CRIT×',
  };
  return m[type];
}

function formatGold(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

// ── PCB Trace overlay ──────────────────────────────────────────────────────

const PCBTraces: React.FC = () => (
  <svg
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    overflow="visible"
  >
    <line x1="0"   y1="40%" x2="100%" y2="40%" stroke="#00f5ff0a" strokeWidth="1" strokeDasharray="5 7" />
    <line x1="0"   y1="60%" x2="100%" y2="60%" stroke="#39ff140a" strokeWidth="1" strokeDasharray="5 7" />
    <line x1="50%" y1="0"   x2="50%"  y2="100%" stroke="#ff008008" strokeWidth="1" strokeDasharray="4 9" />
    <rect x="5" y="5" width="12" height="12" fill="none" stroke="#00f5ff18" strokeWidth="1" />
    <rect x="5" y="5" width="6"  height="6"  fill="#00f5ff0c" />
    {[18, 38, 62, 82].map(x => (
      <circle key={x} cx={`${x}%`} cy="50%" r="2.5" fill="#04080408" stroke="#39ff1420" strokeWidth="1" />
    ))}
  </svg>
);

// ── Board Slot Card ────────────────────────────────────────────────────────

interface BoardSlotCardProps {
  slot: ItemSlot;
  slotArray: (HardwareItem | null)[];
  totalSlots: number;
  active: boolean;
  onClick: () => void;
}

const BoardSlotCard: React.FC<BoardSlotCardProps> = ({ slot, slotArray, totalSlots, active, onClick }) => {
  const Icon = SLOT_ICON[slot];
  const color = SLOT_COLOR[slot];
  const filled = slotArray.filter((i): i is HardwareItem => i !== null);
  const firstItem = filled[0];

  return (
    <div
      onClick={onClick}
      style={{
        width: 84,
        background: active ? `${color}18` : firstItem ? `${color}0c` : '#020808',
        border: `1px solid ${active ? color : firstItem ? `${color}88` : `${color}25`}`,
        padding: '5px 7px',
        cursor: 'pointer',
        boxShadow: active ? `0 0 14px ${color}55` : firstItem ? `0 0 8px ${color}28` : 'none',
        transition: 'all 0.15s',
      }}
    >
      <div className="flex items-center gap-1 mb-1">
        <Icon size={8} color={active ? color : firstItem ? color : `${color}55`} />
        <div
          className="font-pixel"
          style={{ color: active ? color : firstItem ? `${color}99` : `${color}44`, fontSize: '5px', letterSpacing: '1px' }}
        >
          {SLOT_FULL_LABEL[slot]}
        </div>
      </div>

      {firstItem ? (
        <>
          <div
            className="font-pixel"
            style={{
              color: RARITY_COLOR[firstItem.rarity],
              fontSize: '6px', letterSpacing: '0.5px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {firstItem.name}
          </div>
          <div style={{ color: `${color}55`, fontFamily: 'var(--font-mono)', fontSize: '7px', marginTop: 1 }}>
            {totalSlots > 1 ? `${filled.length}/${totalSlots}` : firstItem.rarity}
          </div>
        </>
      ) : (
        <div style={{ color: `${color}30`, fontFamily: 'var(--font-mono)', fontSize: '7px', lineHeight: 1.5 }}>
          {totalSlots > 1 ? `×${totalSlots} SLOTS` : 'EMPTY'}
        </div>
      )}
    </div>
  );
};

// ── Top Panel: Always-visible PCB ─────────────────────────────────────────

interface BoardPanelProps {
  engine: GameEngine;
  equipped: GameState['equippedItems'];
  ramSlots: number;
  expansionSlots: number;
  activeSlot: ItemSlot;
  onSelectSlot: (slot: ItemSlot) => void;
}

const BoardPanel: React.FC<BoardPanelProps> = ({
  engine, equipped, ramSlots, expansionSlots, activeSlot, onSelectSlot,
}) => {
  const moboPlugin = engine.getPlugin<MoboPlugin>('mobo');
  const diamonds = useGameState(engine, s => s.diamonds ?? 0);
  const motherboardTier = useGameState(engine, s => s.motherboardTier ?? 0);

  const currentTier = MOBO_TIERS[motherboardTier] ?? MOBO_TIERS[0];
  const nextTier = MOBO_TIERS[motherboardTier + 1] ?? null;
  const canUpgrade = !!nextTier && diamonds >= nextTier.diamondCost;

  return (
    <div
      style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(ellipse at 50% 40%, #031203 0%, #020708 100%)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <PCBTraces />

      <div
        className="font-pixel"
        style={{ position: 'absolute', top: 6, left: 10, color: '#0a2a0a', fontSize: '5px', letterSpacing: '3px', zIndex: 1 }}
      >
        OVERCLOCK-MOBO-{currentTier.revision}
      </div>

      {/* PCH chipset center */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 24, height: 24,
          background: '#020d02', border: '1px solid #0a2a0a',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
        }}
      >
        <div className="font-pixel" style={{ color: '#0a3a0a', fontSize: '4px', textAlign: 'center', lineHeight: 1.2 }}>
          PCH<br />{currentTier.revision}
        </div>
      </div>

      {/* Slot cards */}
      {BOARD_POSITIONS.map(({ slot, x, y }) => {
        const slotArray = equipped[slot] ?? [null];
        const total = slot === 'RAM' ? ramSlots : slot === 'EXPANSION' ? expansionSlots : 1;
        return (
          <div
            key={slot}
            style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', zIndex: 2 }}
          >
            <BoardSlotCard
              slot={slot}
              slotArray={Array.isArray(slotArray) ? slotArray : [slotArray]}
              totalSlots={total}
              active={activeSlot === slot}
              onClick={() => onSelectSlot(slot)}
            />
          </div>
        );
      })}

      {/* Upgrade strip */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(2,4,2,0.92)', borderTop: '1px solid #0a1a0a',
          padding: '5px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 3, gap: 8,
        }}
      >
        <div>
          <div className="font-pixel" style={{ color: '#39ff14', fontSize: '6px', letterSpacing: '1px' }}>
            {currentTier.name}
          </div>
          <div style={{ color: '#1a4a1a', fontFamily: 'var(--font-mono)', fontSize: '7px' }}>
            RAM×{ramSlots} · EXP×{expansionSlots}
          </div>
        </div>

        {nextTier ? (
          <button
            onClick={() => moboPlugin?.upgrade()}
            disabled={!canUpgrade}
            className="font-pixel flex items-center gap-1"
            style={{
              background: canUpgrade ? '#031a03' : '#020a02',
              border: `1px solid ${canUpgrade ? '#39ff14' : '#1a2a1a'}`,
              color: canUpgrade ? '#39ff14' : '#1a3a1a',
              padding: '4px 8px', fontSize: '5px', letterSpacing: '1px',
              cursor: canUpgrade ? 'pointer' : 'not-allowed',
              boxShadow: canUpgrade ? '0 0 8px rgba(57,255,20,0.2)' : 'none',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            <ArrowUpCircle size={8} />
            <span>{nextTier.revision}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 4, color: canUpgrade ? '#00e5ff' : '#1a3a3a' }}>
              <Diamond size={7} />
              {nextTier.diamondCost}
            </span>
          </button>
        ) : (
          <div className="font-pixel" style={{ color: '#1a4a1a', fontSize: '5px', letterSpacing: '1px' }}>
            MAX TIER
          </div>
        )}
      </div>
    </div>
  );
};

// ── Item inventory card ────────────────────────────────────────────────────

interface ItemCardProps {
  item: HardwareItem;
  selected: boolean;
  onClick: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, selected, onClick }) => {
  const rc = RARITY_COLOR[item.rarity];
  const Icon = SLOT_ICON[item.slot];

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `${rc}14` : '#050010',
        border: `1px solid ${selected ? rc : `${rc}44`}`,
        padding: '7px 9px', cursor: 'pointer',
        boxShadow: selected ? RARITY_GLOW[item.rarity] : 'none',
        position: 'relative', transition: 'border-color 0.12s, box-shadow 0.12s',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: rc, boxShadow: `0 0 4px ${rc}` }} />
      <div className="flex items-start gap-2" style={{ paddingLeft: 7 }}>
        <Icon size={10} color={rc} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-pixel" style={{ color: rc, fontSize: '6px', letterSpacing: '1px' }}>
            {item.name}
          </div>
          <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            {item.rarity} T{item.tier}
          </div>
          <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '8px', fontStyle: 'italic', lineHeight: 1.4, marginTop: 2 }}>
            {item.flavorText}
          </div>
          <div className="flex flex-wrap gap-x-3 mt-1">
            {item.stats.map((stat, i) => (
              <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                <span style={{ color: '#3a4a3a' }}>{getStatLabel(stat.type)}: </span>
                <span style={{ color: rc }}>{formatStatValue(stat)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sets Panel ────────────────────────────────────────────────────────────

interface SetsPanelProps { engine: GameEngine; }

const SetsPanel: React.FC<SetsPanelProps> = ({ engine }) => {
  const setPlugin = engine.getPlugin<SetPlugin>('sets');
  const setItems = useGameState(engine, s => s.setItems ?? []);
  const collectedSets = useGameState(engine, s => s.collectedSets ?? {});
  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => setPlugin?.subscribe(refresh), [setPlugin, refresh]);

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '10px 12px' }}>
      <div className="font-pixel" style={{ color: '#3a3a2a', fontSize: '6px', letterSpacing: '2px', marginBottom: 10 }}>
        {'> MYTHIC SET COLLECTION'}
      </div>
      <div style={{ color: '#2a3a3a', fontFamily: 'var(--font-mono)', fontSize: '8px', marginBottom: 12, lineHeight: 1.5 }}>
        Mythic set pieces are awarded from tournaments. Collect a full set for a permanent bonus — even unequipped.
      </div>

      {SET_CATALOG.map(set => {
        const progress = setPlugin?.getProgressForSet(set.id) ?? { owned: 0, total: set.pieces.length, ownedPieces: [] };
        const isComplete = collectedSets[set.id] ?? false;
        const completePct = progress.total > 0 ? (progress.owned / progress.total) * 100 : 0;

        return (
          <div key={set.id} style={{
            background: isComplete ? `${set.color}0a` : '#080810',
            border: `1px solid ${isComplete ? set.color + '55' : '#1a1a28'}`,
            padding: '11px 13px', marginBottom: 8,
            boxShadow: isComplete ? `0 0 14px ${set.color}22` : 'none',
          }}>
            {/* Set header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div className="font-pixel" style={{ color: isComplete ? set.color : set.color + '88', fontSize: '9px', marginBottom: 2 }}>
                  {set.name}
                  {isComplete && <span style={{ marginLeft: 8, fontSize: '7px', color: '#e8d48b' }}>✦ COMPLETE</span>}
                </div>
                <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>{set.description}</div>
              </div>
              <div className="font-pixel" style={{ color: set.color, fontSize: '10px', flexShrink: 0, marginLeft: 8 }}>
                {progress.owned}/{progress.total}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: '#1a1a2a', marginBottom: 8, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: `${completePct}%`,
                background: isComplete ? set.color : set.color + '66',
                boxShadow: isComplete ? `0 0 6px ${set.color}` : 'none',
                transition: 'width 0.4s',
              }} />
            </div>

            {/* Set bonus */}
            <div style={{
              background: isComplete ? '#0a0a00' : '#050508',
              border: `1px solid ${isComplete ? set.color + '33' : '#151520'}`,
              padding: '6px 8px', marginBottom: 8,
            }}>
              <div className="font-pixel" style={{ color: isComplete ? '#e8d48b' : '#2a2a3a', fontSize: '6px', letterSpacing: '1px', marginBottom: 2 }}>
                SET BONUS
              </div>
              <div style={{ color: isComplete ? set.color : '#2a2a3a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                {set.setBonusDescription}
              </div>
            </div>

            {/* Pieces */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {set.pieces.map(piece => {
                const owned = progress.ownedPieces.includes(piece.name);
                const ownedItem = setItems.find(i => i.setId === set.id && i.name === piece.name);
                return (
                  <div key={piece.name} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px',
                    background: owned ? `${set.color}0a` : 'transparent',
                    border: `1px solid ${owned ? set.color + '33' : '#101018'}`,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: owned ? set.color : '#1a1a2a',
                      boxShadow: owned ? `0 0 5px ${set.color}` : 'none',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="font-pixel" style={{ color: owned ? set.color : '#2a2a3a', fontSize: '6px' }}>
                        {piece.name}
                      </span>
                      <span style={{ color: '#3a3a4a', fontFamily: 'var(--font-mono)', fontSize: '7px', marginLeft: 6 }}>
                        [{piece.slot}]
                      </span>
                    </div>
                    {owned && ownedItem && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {ownedItem.stats.slice(0, 2).map((stat, i) => (
                          <span key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: set.color + 'aa' }}>
                            {stat.isMultiplier ? `+${((stat.value - 1) * 100).toFixed(0)}%` : `+${(stat.value * 100).toFixed(0)}%`}
                            {' '}{stat.type === 'tap_damage' ? 'TAP' : stat.type === 'idle_dps' ? 'DPS' : stat.type === 'gold_rate' ? 'G' : stat.type === 'crit_chance' ? 'CC' : 'CM'}
                          </span>
                        ))}
                      </div>
                    )}
                    {!owned && (
                      <span style={{ color: '#1a2a2a', fontFamily: 'var(--font-mono)', fontSize: '7px' }}>MISSING</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── Bottom Panel: Tabs + slot content ─────────────────────────────────────

interface SlotPanelProps {
  activeSlot: ItemSlot;
  onSelectSlot: (slot: ItemSlot) => void;
  equipped: GameState['equippedItems'];
  inventory: HardwareItem[];
  ramSlots: number;
  expansionSlots: number;
  itemPlugin: ItemPlugin | undefined;
}

const SlotPanel: React.FC<SlotPanelProps> = ({
  activeSlot, onSelectSlot, equipped, inventory, ramSlots, expansionSlots, itemPlugin,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const slot = activeSlot;
  const color = SLOT_COLOR[slot];
  const Icon = SLOT_ICON[slot];
  const slotArray = Array.isArray(equipped[slot]) ? (equipped[slot] as (HardwareItem | null)[]) : [equipped[slot] as HardwareItem | null];
  const slotCount = slot === 'RAM' ? ramSlots : slot === 'EXPANSION' ? expansionSlots : 1;
  const inventoryForSlot = inventory.filter(i => i.slot === slot);

  const TABS: ItemSlot[] = ['CPU', 'GPU', 'RAM', 'EXPANSION'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Tab bar */}
      <div
        className="flex"
        style={{ background: '#04000e', borderBottom: '1px solid #0f0820', flexShrink: 0, overflowX: 'auto' }}
      >
        {TABS.map(tab => {
          const isActive = activeSlot === tab;
          const tc = SLOT_COLOR[tab];
          const TabIcon = SLOT_ICON[tab];
          const tabRaw = equipped[tab];
          const tabArray = Array.isArray(tabRaw) ? (tabRaw as (HardwareItem | null)[]) : [tabRaw as HardwareItem | null];
          const filledCount = tabArray.filter(Boolean).length;
          const tabSlotCount = tab === 'RAM' ? ramSlots : tab === 'EXPANSION' ? expansionSlots : 1;
          const invCount = inventory.filter(i => i.slot === tab).length;

          return (
            <button
              key={tab}
              onClick={() => { onSelectSlot(tab); setSelectedItemId(null); }}
              className="font-pixel flex items-center gap-1"
              style={{
                padding: '7px 11px', fontSize: '6px', letterSpacing: '1px',
                background: isActive ? `${tc}0a` : 'none', border: 'none',
                borderBottom: isActive ? `2px solid ${tc}` : '2px solid transparent',
                color: isActive ? tc : '#2a3a4a',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.12s', flexShrink: 0,
              }}
            >
              <TabIcon size={9} color={isActive ? tc : '#2a3a4a'} />
              {tab}{tabSlotCount > 1 ? ` ×${tabSlotCount}` : ''}
              {(filledCount > 0 || invCount > 0) && (
                <span style={{
                  background: filledCount > 0 ? tc : `${tc}44`,
                  color: filledCount > 0 ? '#000' : tc,
                  padding: '0 3px', fontSize: '6px', lineHeight: '12px',
                  minWidth: 12, textAlign: 'center', fontFamily: 'var(--font-mono)',
                }}>
                  {filledCount > 0 ? `${filledCount}/${tabSlotCount}` : invCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Installed slots */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid #0a0818', padding: '8px 12px', background: '#030010' }}>
        <div className="font-pixel mb-2" style={{ color: `${color}55`, fontSize: '6px', letterSpacing: '2px' }}>
          INSTALLED
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${slotCount}, 1fr)`, gap: 6 }}>
          {Array.from({ length: slotCount }).map((_, i) => {
            const item = slotArray[i] ?? null;
            if (item) {
              return (
                <div
                  key={i}
                  style={{
                    background: `${RARITY_COLOR[item.rarity]}0a`,
                    border: `1px solid ${RARITY_COLOR[item.rarity]}`,
                    padding: '6px 8px', boxShadow: RARITY_GLOW[item.rarity], position: 'relative',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: RARITY_COLOR[item.rarity] }} />
                  <div style={{ paddingLeft: 6 }}>
                    <div className="flex items-center gap-1 mb-1">
                      <Icon size={8} color={RARITY_COLOR[item.rarity]} />
                      <div className="font-pixel" style={{ color: RARITY_COLOR[item.rarity], fontSize: '6px' }}>
                        {item.name}
                      </div>
                    </div>
                    <div style={{ color: '#3a4a3a', fontFamily: 'var(--font-mono)', fontSize: '7px', marginBottom: 3 }}>
                      {item.rarity} T{item.tier}
                    </div>
                    <div className="flex flex-wrap gap-x-2">
                      {item.stats.map((stat, si) => (
                        <span key={si} style={{ fontFamily: 'var(--font-mono)', fontSize: '7px' }}>
                          <span style={{ color: '#3a4a3a' }}>{getStatLabel(stat.type)}: </span>
                          <span style={{ color: RARITY_COLOR[item.rarity] }}>{formatStatValue(stat)}</span>
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => itemPlugin?.unequip(slot, i)}
                      style={{
                        marginTop: 4, background: 'none',
                        border: `1px solid ${color}33`, color: `${color}55`,
                        padding: '2px 0', fontSize: '7px', fontFamily: 'var(--font-mono)',
                        cursor: 'pointer', width: '100%', letterSpacing: '1px',
                      }}
                    >
                      REMOVE
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={i}
                style={{
                  background: '#040010', border: `1px dashed ${color}1e`,
                  padding: '8px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 60,
                }}
              >
                <Icon size={11} color={`${color}28`} />
                <div style={{ color: `${color}28`, fontFamily: 'var(--font-mono)', fontSize: '7px' }}>
                  SLOT {i + 1} EMPTY
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div className="font-pixel mb-1" style={{ color: '#1a3a2a', fontSize: '6px', letterSpacing: '2px', flexShrink: 0 }}>
          STORAGE · {inventoryForSlot.length} {slot} ITEMS
        </div>

        {inventoryForSlot.length === 0 ? (
          <div style={{ color: '#1a2a1a', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', marginTop: 20, lineHeight: 2 }}>
            NO {slot} HARDWARE IN STORAGE<br />
            <span style={{ color: '#0f1a0f' }}>DEFEAT ENEMIES TO FIND HARDWARE</span>
          </div>
        ) : (
          inventoryForSlot.map(item => (
            <div key={item.id}>
              <ItemCard
                item={item}
                selected={selectedItemId === item.id}
                onClick={() => setSelectedItemId(prev => prev === item.id ? null : item.id)}
              />
              {selectedItemId === item.id && (
                <button
                  onClick={() => { itemPlugin?.equip(item.id); setSelectedItemId(null); }}
                  className="w-full font-pixel"
                  style={{
                    background: `${color}18`, border: `1px solid ${color}`, borderTop: 'none',
                    color, padding: '5px', fontSize: '6px', cursor: 'pointer', letterSpacing: '1px',
                  }}
                >
                  INSTALL INTO {SLOT_FULL_LABEL[slot]}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Root ───────────────────────────────────────────────────────────────────

export const MotherboardScreen: React.FC<MotherboardScreenProps> = ({ engine, onClose }) => {
  const inventory = useGameState(engine, s => s.inventory ?? []);
  const equipped = useGameState(engine, s => normalizeEquipped(s.equippedItems));
  const motherboardTier = useGameState(engine, s => s.motherboardTier ?? 0);
  const ramSlots = useGameState(engine, s => s.ramSlots ?? 1);
  const expansionSlots = useGameState(engine, s => s.expansionSlots ?? 1);
  const setItems = useGameState(engine, s => s.setItems ?? []);

  const [activeSlot, setActiveSlot] = useState<ItemSlot>('CPU');
  const [bottomMode, setBottomMode] = useState<'slots' | 'sets'>('slots');

  const itemPlugin = engine.getPlugin<ItemPlugin>('items');
  const currentTierDef = MOBO_TIERS[motherboardTier] ?? MOBO_TIERS[0];
  const allEquipped = Object.values(equipped).flat().filter(Boolean).length;
  const totalSlots = 2 + ramSlots + expansionSlots;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.80)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Window */}
      <div
        style={{
          width: '100%', maxWidth: 540,
          height: 'min(88vh, 680px)',
          background: '#030008', border: '1px solid #180a28',
          boxShadow: '0 0 80px rgba(0,0,0,0.95), 0 0 40px rgba(0,245,255,0.04)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Corner chrome */}
        {['tl','tr','bl','br'].map(c => (
          <div key={c} style={{
            position: 'absolute', width: 14, height: 14, zIndex: 10, pointerEvents: 'none',
            top: c.startsWith('t') ? 0 : undefined, bottom: c.startsWith('b') ? 0 : undefined,
            left: c.endsWith('l') ? 0 : undefined, right: c.endsWith('r') ? 0 : undefined,
            borderTop: c.startsWith('t') ? `2px solid ${c === 'tl' || c === 'tr' ? '#00f5ff33' : 'transparent'}` : undefined,
            borderBottom: c.startsWith('b') ? `2px solid #00f5ff1a` : undefined,
            borderLeft: c.endsWith('l') ? `2px solid ${c === 'tl' ? '#00f5ff33' : '#00f5ff1a'}` : undefined,
            borderRight: c.endsWith('r') ? `2px solid ${c === 'tr' ? '#00f5ff33' : '#00f5ff1a'}` : undefined,
          }} />
        ))}

        {/* Title bar */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: '#050010', borderBottom: '1px solid #180a28', flexShrink: 0 }}
        >
          <div className="flex items-center gap-2">
            <CircuitBoard size={12} color="#00f5ff" />
            <div>
              <div className="font-pixel" style={{ color: '#00f5ff', fontSize: '8px', letterSpacing: '3px' }}>
                SYSTEM BOARD
              </div>
              <div style={{ color: '#253545', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                {currentTierDef.revision} · {allEquipped}/{totalSlots} SLOTS · {inventory.length} IN STORAGE
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid #1a1a2a', color: '#3a4a5a',
              width: 24, height: 24, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* TOP 35%: PCB board — always visible */}
        <div style={{ height: '35%', flexShrink: 0, borderBottom: '1px solid #0f0820', overflow: 'hidden' }}>
          <BoardPanel
            engine={engine}
            equipped={equipped}
            ramSlots={ramSlots}
            expansionSlots={expansionSlots}
            activeSlot={activeSlot}
            onSelectSlot={setActiveSlot}
          />
        </div>

        {/* BOTTOM 65%: Mode switcher + content */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Mode switcher bar */}
          <div style={{ flexShrink: 0, display: 'flex', background: '#04000e', borderBottom: '1px solid #0f0820' }}>
            <button
              onClick={() => setBottomMode('slots')}
              className="font-pixel flex items-center gap-1"
              style={{
                padding: '7px 14px', fontSize: '6px', letterSpacing: '1px', border: 'none',
                background: bottomMode === 'slots' ? '#00f5ff0a' : 'none',
                borderBottom: bottomMode === 'slots' ? '2px solid #00f5ff' : '2px solid transparent',
                color: bottomMode === 'slots' ? '#00f5ff' : '#2a3a4a', cursor: 'pointer',
              }}
            >
              <CircuitBoard size={9} color={bottomMode === 'slots' ? '#00f5ff' : '#2a3a4a'} />
              HARDWARE
            </button>
            <button
              onClick={() => setBottomMode('sets')}
              className="font-pixel flex items-center gap-1"
              style={{
                padding: '7px 14px', fontSize: '6px', letterSpacing: '1px', border: 'none',
                background: bottomMode === 'sets' ? '#e8d48b0a' : 'none',
                borderBottom: bottomMode === 'sets' ? '2px solid #e8d48b' : '2px solid transparent',
                color: bottomMode === 'sets' ? '#e8d48b' : '#2a3a4a', cursor: 'pointer',
              }}
            >
              <Layers size={9} color={bottomMode === 'sets' ? '#e8d48b' : '#2a3a4a'} />
              SETS
              {setItems.length > 0 && (
                <span style={{
                  background: '#e8d48b', color: '#000',
                  padding: '0 3px', fontSize: '6px', lineHeight: '11px',
                  fontFamily: 'var(--font-mono)', minWidth: 11, textAlign: 'center',
                }}>
                  {setItems.length}
                </span>
              )}
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {bottomMode === 'slots' ? (
              <SlotPanel
                activeSlot={activeSlot}
                onSelectSlot={setActiveSlot}
                equipped={equipped}
                inventory={inventory}
                ramSlots={ramSlots}
                expansionSlots={expansionSlots}
                itemPlugin={itemPlugin}
              />
            ) : (
              <SetsPanel engine={engine} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
