import React, { useEffect, useState } from 'react';
import { Award } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { AchievementDef } from '../../plugins/AchievementPlugin';

interface AchievementToastProps {
  engine: GameEngine;
}

interface ToastEntry {
  id: string;
  achievement: AchievementDef;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ engine }) => {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  useEffect(() => {
    const unsub = engine.on<{ achievement: AchievementDef }>('achievement_unlocked', event => {
      const entry: ToastEntry = {
        id: `toast_${Date.now()}_${Math.random()}`,
        achievement: event.payload.achievement,
      };
      setToasts(prev => [...prev, entry]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== entry.id));
      }, 4000);
    });
    return unsub;
  }, [engine]);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', top: 60, right: 16, zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            background: '#0a0e14',
            border: `1px solid ${toast.achievement.color}55`,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${toast.achievement.color}22`,
            animation: 'tooltipFadeIn 0.3s ease-out',
            minWidth: 200,
          }}
        >
          <Award size={18} color={toast.achievement.color} />
          <div>
            <div className="font-pixel" style={{ fontSize: '6px', letterSpacing: '1px', color: toast.achievement.color, marginBottom: 2 }}>
              ACHIEVEMENT UNLOCKED
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#c0d0e0' }}>
              {toast.achievement.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
