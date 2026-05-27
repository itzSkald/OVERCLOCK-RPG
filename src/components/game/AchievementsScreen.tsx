import React, { useCallback, useEffect, useState } from 'react';
import { X, Award, Lock } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { AchievementPlugin } from '../../plugins/AchievementPlugin';
import { ACHIEVEMENT_DEFS } from '../../plugins/AchievementPlugin';

interface AchievementsScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({ engine, onClose }) => {
  const plugin = engine.getPlugin<AchievementPlugin>('achievement');
  const [unlocked, setUnlocked] = useState<Set<string>>(plugin?.getUnlocked() ?? new Set());

  const refresh = useCallback(() => {
    setUnlocked(new Set(plugin?.getUnlocked() ?? new Set()));
  }, [plugin]);

  useEffect(() => {
    if (!plugin) return;
    refresh();
    return plugin.subscribe(refresh);
  }, [plugin, refresh]);

  const progress = plugin?.getProgress() ?? { total: ACHIEVEMENT_DEFS.length, unlocked: 0 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />

      <div
        style={{
          position: 'relative', zIndex: 1,
          background: '#0a0a0f',
          border: '1px solid #1a3a4a',
          width: '90%', maxWidth: 440, maxHeight: '80dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 0 40px rgba(255,170,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1a2a3a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-2">
            <Award size={14} color="#ffaa00" />
            <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '9px', letterSpacing: '2px' }}>ACHIEVEMENTS</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ color: '#5a7a8a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
              {progress.unlocked}/{progress.total}
            </span>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #1a2a3a', color: '#5a6a7a', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '10px 16px 6px' }}>
          <div style={{ background: '#0a0a0f', height: 6, border: '1px solid #1a2a3a', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${(progress.unlocked / progress.total) * 100}%`,
              background: '#ffaa00',
              boxShadow: '0 0 6px rgba(255,170,0,0.4)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Achievement grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {ACHIEVEMENT_DEFS.map(def => {
            const isUnlocked = unlocked.has(def.id);
            return (
              <div
                key={def.id}
                style={{
                  background: isUnlocked ? `${def.color}08` : '#050508',
                  border: `1px solid ${isUnlocked ? def.color + '44' : '#1a1a2a'}`,
                  padding: '12px 10px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 6, textAlign: 'center',
                  opacity: isUnlocked ? 1 : 0.5,
                  transition: 'opacity 0.2s, border-color 0.2s',
                }}
              >
                {isUnlocked ? (
                  <Award size={18} color={def.color} />
                ) : (
                  <Lock size={16} color="#2a2a3a" />
                )}

                <div className="font-pixel" style={{
                  fontSize: '6px', letterSpacing: '1px',
                  color: isUnlocked ? def.color : '#3a3a4a',
                }}>
                  {def.name}
                </div>

                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: isUnlocked ? '#6a7a8a' : '#2a2a3a',
                  lineHeight: '12px',
                }}>
                  {def.description}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
