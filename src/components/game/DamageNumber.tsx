import React, { useEffect, useState } from 'react';
import { DAMAGE_COLORS } from '../../theme';
import type { DamageNumberEvent } from '../../engine/types';

interface DamageNumberProps {
  event: DamageNumberEvent;
  onDone: (id: string) => void;
}

function formatDamage(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export const DamageNumber: React.FC<DamageNumberProps> = ({ event, onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone(event.id);
    }, 900);
    return () => clearTimeout(t);
  }, [event.id, onDone]);

  if (!visible) return null;

  const color = DAMAGE_COLORS[event.type];
  const isCrit = event.type === 'crit';

  return (
    <div
      className="pointer-events-none absolute animate-float-up font-pixel select-none"
      style={{
        left: event.x ?? '50%',
        top: event.y ?? '50%',
        color,
        fontSize: isCrit ? '12px' : '8px',
        transform: 'translateX(-50%)',
        zIndex: 50,
        textShadow: `0 0 8px ${color}`,
        whiteSpace: 'nowrap',
      }}
    >
      {isCrit && <span style={{ fontSize: '7px', display: 'block', color: '#ffaa00' }}>CRIT!</span>}
      {event.type === 'idle' ? '' : ''}{formatDamage(event.value)}
    </div>
  );
};
