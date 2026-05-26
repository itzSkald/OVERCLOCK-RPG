import React, { useState } from 'react';
import { X, Cpu, MemoryStick, Zap, PlusSquare, ChevronRight } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import type { HardwareItem, ItemSlot, ItemRarity, ModifierDef } from '../../engine/types';
import type { ItemPlugin } from '../../plugins/ItemPlugin';

interface MotherboardScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

const RARITY_COLOR: Record<ItemRarity, string> = {
  Common: '#6b7a8d',
  Rare: '#00f5ff',
  Epic: '#ffaa00',
  Legendary: '#ff0080',
};

const RARITY_GLOW: Record<ItemRarity, string> = {
  Common: 'none',
  Rare: '0 0 8px rgba(0,245,255,0.5)',
  Epic: '0 0 10px rgba(255,170,0,0.5)',
  Legendary: '0 0 14px rgba(255,0,128,0.7)',
};

const SLOT_ICON: Record<ItemSlot, React.FC<{ size?: number; color?: string }>> = {
  RAM: ({ size = 14, color }) => <MemoryStick size={size} color={color} />,
  GPU: ({ size = 14, color }) => <Zap size={size} color={color} />,
  CPU: ({ size = 14, color }) => <Cpu size={size} color={color} />,
  EXPANSION: ({ size = 14, color }) => <PlusSquare size={size} color={color} />,
};

const SLOT_COLOR: Record<ItemSlot, string> = {
  RAM: '#39ff14',
  GPU: '#00f5ff',
  CPU: '#ffaa00',
  EXPANSION: '#ff6600',
};

const SLOT_LABEL: Record<ItemSlot, string> = {
  RAM: 'RAM BANK',
  GPU: 'GPU SLOT',
  CPU: 'CPU SOCKET',
  EXPANSION: 'EXPANSION',
};

function formatStatValue(stat: ModifierDef): string {
  if (stat.isMultiplier) {
    const pct = ((stat.value - 1) * 100).toFixed(0);
    return `+${pct}%`;
  }
  return `+${(stat.value * 100).toFixed(1)}%`;
}

function getStatLabel(type: ModifierDef['type']): string {
  const labels: Record<ModifierDef['type'], string> = {
    tap_damage: 'TAP DMG',
    idle_dps: 'IDLE DPS',
    gold_rate: 'GOLD RATE',
    crit_chance: 'CRIT CHANCE',
    crit_multiplier: 'CRIT MULT',
  };
  return labels[type];
}

interface ItemCardProps {
  item: HardwareItem;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, compact, selected, onClick }) => {
  const Icon = SLOT_ICON[item.slot];
  const rarityColor = RARITY_COLOR[item.rarity];
  const glow = RARITY_GLOW[item.rarity];

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `${rarityColor}18` : '#0a0010',
        border: `1px solid ${selected ? rarityColor : `${rarityColor}55`}`,
        padding: compact ? '6px 8px' : '10px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: selected ? glow : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Rarity stripe */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
        background: rarityColor, boxShadow: `0 0 4px ${rarityColor}`,
      }} />

      <div className="flex items-start gap-2" style={{ paddingLeft: 6 }}>
        <div style={{ flexShrink: 0, marginTop: 1 }}>
          <Icon size={12} color={rarityColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-pixel" style={{ color: rarityColor, fontSize: '7px', letterSpacing: '1px' }}>
            {item.name}
          </div>
          <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            {item.rarity} · {item.slot}
          </div>
          {!compact && (
            <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '8px', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 }}>
              {item.flavorText}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-1">
            {item.stats.map((stat, i) => (
              <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                <span style={{ color: '#5a6a5a' }}>{getStatLabel(stat.type)}: </span>
                <span style={{ color: rarityColor }}>{formatStatValue(stat)}</span>
              </div>
            ))}
          </div>
        </div>
        {onClick && (
          <ChevronRight size={10} color={rarityColor} style={{ flexShrink: 0, marginTop: 2 }} />
        )}
      </div>
    </div>
  );
};

interface SlotPickerProps {
  slot: ItemSlot;
  inventory: HardwareItem[];
  onEquip: (itemId: string) => void;
  onClose: () => void;
}

const SlotPicker: React.FC<SlotPickerProps> = ({ slot, inventory, onEquip, onClose }) => {
  const available = inventory.filter(i => i.slot === slot);
  const color = SLOT_COLOR[slot];

  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#060010',
      border: `1px solid ${color}44`,
      zIndex: 10,
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${color}22` }}>
        <div className="font-pixel" style={{ color, fontSize: '8px', letterSpacing: '2px' }}>
          SELECT {slot}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6a7a' }}>
          <X size={14} />
        </button>
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto p-2" style={{ flex: 1 }}>
        {available.length === 0 ? (
          <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', marginTop: 20 }}>
            NO {slot} ITEMS IN INVENTORY<br />
            <span style={{ color: '#1a2a3a' }}>DEFEAT ENEMIES TO FIND HARDWARE</span>
          </div>
        ) : (
          available.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={() => { onEquip(item.id); onClose(); }}
            />
          ))
        )}
      </div>
    </div>
  );
};

// PCB trace SVG lines between slots
const PCBTraces: React.FC = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} overflow="visible">
    <defs>
      <filter id="glow-trace">
        <feGaussianBlur stdDeviation="1" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    {/* Horizontal trace lines */}
    <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#00f5ff11" strokeWidth="1" strokeDasharray="4 6" />
    <line x1="0" y1="65%" x2="100%" y2="65%" stroke="#39ff1411" strokeWidth="1" strokeDasharray="4 6" />
    {/* Vertical trace lines */}
    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#ff008011" strokeWidth="1" strokeDasharray="3 8" />
    {/* Corner accents */}
    <rect x="4" y="4" width="12" height="12" fill="none" stroke="#00f5ff22" strokeWidth="1" />
    <rect x="4" y="4" width="6" height="6" fill="#00f5ff11" />
    {/* Capacitor dots */}
    {[20, 40, 60, 80].map(x => (
      <circle key={x} cx={`${x}%`} cy="50%" r="2" fill="#1a2a1a" stroke="#39ff1433" strokeWidth="1" />
    ))}
  </svg>
);

const BOARD_LAYOUT: { slot: ItemSlot; label: string; x: string; y: string }[] = [
  { slot: 'CPU', label: 'CPU SOCKET', x: '50%', y: '30%' },
  { slot: 'RAM', label: 'RAM BANK A', x: '20%', y: '50%' },
  { slot: 'GPU', label: 'GPU SLOT', x: '50%', y: '65%' },
  { slot: 'EXPANSION', label: 'EXPANSION', x: '80%', y: '50%' },
];

export const MotherboardScreen: React.FC<MotherboardScreenProps> = ({ engine, onClose }) => {
  const inventory = useGameState(engine, s => s.inventory ?? []);
  const equipped = useGameState(engine, s => s.equippedItems ?? { RAM: null, GPU: null, CPU: null, EXPANSION: null });
  const [pickerSlot, setPickerSlot] = useState<ItemSlot | null>(null);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'board' | 'inventory'>('board');

  const plugin = engine.getPlugin<ItemPlugin>('items');

  const handleEquip = (itemId: string) => {
    plugin?.equip(itemId);
    setSelectedInventoryId(null);
  };

  const handleUnequip = (slot: ItemSlot) => {
    plugin?.unequip(slot);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 100,
        display: 'flex', flexDirection: 'column',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: '#080010',
          borderBottom: '1px solid #1a0a2a',
          flexShrink: 0,
        }}
      >
        <div>
          <div className="font-pixel glow-cyan" style={{ color: '#00f5ff', fontSize: '10px', letterSpacing: '3px' }}>
            SYSTEM BOARD
          </div>
          <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 2 }}>
            {inventory.length} ITEMS IN STORAGE · {Object.values(equipped).filter(Boolean).length}/4 SLOTS FILLED
          </div>
        </div>
        <button
          onClick={onClose}
          className="font-pixel"
          style={{
            background: '#0a0010',
            border: '1px solid #2a1a3a',
            color: '#5a6a7a',
            padding: '6px 10px',
            fontSize: '7px',
            cursor: 'pointer',
            letterSpacing: '1px',
          }}
        >
          CLOSE
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid #1a0a2a', background: '#060010', flexShrink: 0 }}>
        {(['board', 'inventory'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="font-pixel"
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '7px',
              letterSpacing: '2px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #00f5ff' : '2px solid transparent',
              color: activeTab === tab ? '#00f5ff' : '#3a4a5a',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {tab === 'board' ? 'MOTHERBOARD' : `INVENTORY (${inventory.length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'board' ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 0 }}>
            {/* Motherboard visual */}
            <div
              style={{
                flex: '0 0 auto',
                position: 'relative',
                background: 'radial-gradient(ellipse at center, #050d05 0%, #030808 60%, #020508 100%)',
                minHeight: 280,
                borderBottom: '1px solid #0a1a0a',
              }}
            >
              <PCBTraces />

              {/* Board label */}
              <div
                className="font-pixel"
                style={{
                  position: 'absolute', top: 8, left: 12,
                  color: '#0a2a0a', fontSize: '6px', letterSpacing: '3px',
                }}
              >
                OVERCLOCK-MOBO-REV.2
              </div>

              {/* Chipset label */}
              <div
                style={{
                  position: 'absolute', top: '48%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 28, height: 28,
                  background: '#050f05',
                  border: '1px solid #0a2a0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div className="font-pixel" style={{ color: '#0a3a0a', fontSize: '5px', textAlign: 'center', lineHeight: 1.2 }}>
                  PCH<br />X99
                </div>
              </div>

              {/* Slot buttons on the board */}
              {BOARD_LAYOUT.map(({ slot, label, x, y }) => {
                const item = equipped[slot];
                const Icon = SLOT_ICON[slot];
                const color = SLOT_COLOR[slot];

                return (
                  <div
                    key={slot}
                    style={{
                      position: 'absolute',
                      left: x, top: y,
                      transform: 'translate(-50%, -50%)',
                      width: 110,
                    }}
                  >
                    <div
                      style={{
                        background: item ? `${color}0d` : '#030a03',
                        border: `1px solid ${item ? color : `${color}33`}`,
                        padding: '6px 8px',
                        cursor: 'pointer',
                        boxShadow: item ? `0 0 10px ${color}44, inset 0 0 8px ${color}11` : 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onClick={() => item ? handleUnequip(slot) : setPickerSlot(slot)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Icon size={10} color={color} />
                        <div className="font-pixel" style={{ color: `${color}88`, fontSize: '6px', letterSpacing: '1px' }}>
                          {label}
                        </div>
                      </div>
                      {item ? (
                        <>
                          <div className="font-pixel" style={{ color: RARITY_COLOR[item.rarity], fontSize: '7px', letterSpacing: '0.5px' }}>
                            {item.name}
                          </div>
                          <div style={{ color: '#3a4a3a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                            {item.rarity}
                          </div>
                          <div style={{ color: '#2a3a2a', fontFamily: 'var(--font-mono)', fontSize: '7px', marginTop: 2 }}>
                            TAP TO REMOVE
                          </div>
                        </>
                      ) : (
                        <div style={{ color: `${color}44`, fontFamily: 'var(--font-mono)', fontSize: '8px', lineHeight: 1.4 }}>
                          EMPTY SLOT<br />
                          <span style={{ fontSize: '7px' }}>TAP TO INSTALL</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Slot picker overlay */}
              {pickerSlot && (
                <SlotPicker
                  slot={pickerSlot}
                  inventory={inventory}
                  onEquip={handleEquip}
                  onClose={() => setPickerSlot(null)}
                />
              )}
            </div>

            {/* Equipped stats summary */}
            <div
              style={{
                padding: '10px 16px',
                background: '#050010',
                borderTop: '1px solid #0a0020',
                overflowY: 'auto',
              }}
            >
              <div className="font-pixel mb-2" style={{ color: '#3a3a5a', fontSize: '7px', letterSpacing: '2px' }}>
                ACTIVE BONUSES
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.values(equipped).filter(Boolean).length === 0 ? (
                  <div style={{ color: '#1a2a1a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                    NO HARDWARE INSTALLED — INSTALL ITEMS FOR BONUSES
                  </div>
                ) : (
                  Object.values(equipped)
                    .filter((item): item is HardwareItem => item !== null)
                    .flatMap(item =>
                      item.stats.map((stat, i) => (
                        <div key={`${item.id}-${i}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                          <span style={{ color: '#3a4a3a' }}>{getStatLabel(stat.type)}: </span>
                          <span style={{ color: RARITY_COLOR[item.rarity] }}>{formatStatValue(stat)}</span>
                          <span style={{ color: '#2a2a3a' }}> [{item.name}]</span>
                        </div>
                      ))
                    )
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Inventory list */
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {inventory.length === 0 ? (
              <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', marginTop: 40, lineHeight: 2 }}>
                INVENTORY EMPTY<br />
                DEFEAT ENEMIES TO DROP HARDWARE<br />
                <span style={{ color: '#1a2a3a' }}>BOSS KILLS INCREASE DROP QUALITY</span>
              </div>
            ) : (
              inventory.map(item => {
                const isEquipped = Object.values(equipped).some(e => e?.id === item.id);
                return (
                  <div key={item.id}>
                    <ItemCard
                      item={item}
                      selected={selectedInventoryId === item.id}
                      onClick={() => setSelectedInventoryId(prev => prev === item.id ? null : item.id)}
                    />
                    {selectedInventoryId === item.id && !isEquipped && (
                      <button
                        onClick={() => handleEquip(item.id)}
                        className="w-full font-pixel"
                        style={{
                          background: `${SLOT_COLOR[item.slot]}22`,
                          border: `1px solid ${SLOT_COLOR[item.slot]}`,
                          borderTop: 'none',
                          color: SLOT_COLOR[item.slot],
                          padding: '6px',
                          fontSize: '7px',
                          cursor: 'pointer',
                          letterSpacing: '1px',
                        }}
                      >
                        INSTALL INTO {item.slot} SLOT
                      </button>
                    )}
                    {isEquipped && (
                      <div
                        className="w-full font-pixel"
                        style={{
                          background: '#0a1a0a',
                          border: `1px solid #1a3a1a`,
                          borderTop: 'none',
                          color: '#3a6a3a',
                          padding: '4px 6px',
                          fontSize: '7px',
                          textAlign: 'center',
                        }}
                      >
                        INSTALLED
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
