import React, { useCallback, useEffect, useState } from 'react';
import { X, Trophy, RefreshCw, Wifi } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { LeaderboardPlugin, LeaderboardEntry } from '../../plugins/LeaderboardPlugin';

interface LeaderboardScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

function formatDamage(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toString();
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#ffaa00';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  return '#3a5a6a';
}

function getRankGlow(rank: number): string {
  if (rank === 1) return '0 0 8px rgba(255,170,0,0.3)';
  if (rank === 2) return '0 0 6px rgba(192,192,192,0.2)';
  if (rank === 3) return '0 0 6px rgba(205,127,50,0.2)';
  return 'none';
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ engine, onClose }) => {
  const plugin = engine.getPlugin<LeaderboardPlugin>('leaderboard');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(plugin?.getEntries() ?? []);
  const [onlineCount, setOnlineCount] = useState(plugin?.getOnlineCount() ?? 0);
  const [refreshing, setRefreshing] = useState(false);

  const currentUserId = plugin?.getCurrentUserId() ?? null;

  const sync = useCallback(() => {
    if (!plugin) return;
    setEntries(plugin.getEntries());
    setOnlineCount(plugin.getOnlineCount());
  }, [plugin]);

  useEffect(() => {
    if (!plugin) return;
    sync();
    return plugin.subscribe(sync);
  }, [plugin, sync]);

  const handleRefresh = async () => {
    if (!plugin || refreshing) return;
    setRefreshing(true);
    await plugin.fetchLeaderboard();
    setRefreshing(false);
  };

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
      <div
        style={{
          width: '100%', maxWidth: 520,
          height: 'min(92vh, 680px)',
          background: '#030812', border: '1px solid #0a2838',
          boxShadow: '0 0 80px rgba(0,0,0,0.95), 0 0 40px rgba(0,245,255,0.04)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {/* Corner chrome */}
        {['tl', 'tr', 'bl', 'br'].map(c => (
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
          style={{ background: '#020810', borderBottom: '1px solid #0a2838', flexShrink: 0 }}
        >
          <div className="flex items-center gap-2">
            <Trophy size={12} color="#00f5ff" />
            <div>
              <div className="font-pixel" style={{ color: '#00f5ff', fontSize: '8px', letterSpacing: '3px' }}>
                LEADERBOARD
              </div>
              <div style={{ color: '#1a3a4a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                {entries.length} PLAYERS RANKED
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Online count */}
            <div className="flex items-center gap-1" style={{ marginRight: 8 }}>
              <Wifi size={9} color="#39ff14" />
              <span className="font-pixel" style={{ color: '#39ff14', fontSize: '7px' }}>
                {onlineCount}
              </span>
            </div>
            {/* Refresh */}
            <button
              onClick={handleRefresh}
              style={{
                background: 'none', border: '1px solid #0a2838', color: '#3a5a6a',
                width: 24, height: 24, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#00f5ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#3a5a6a'; }}
            >
              <RefreshCw size={10} style={{ animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />
            </button>
            {/* Close */}
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
        </div>

        {/* Table header */}
        <div
          className="flex items-center px-4 py-2"
          style={{ borderBottom: '1px solid #0a1828', flexShrink: 0, gap: 8 }}
        >
          <div style={{ width: 32, color: '#2a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>#</div>
          <div style={{ flex: 1, color: '#2a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>HANDLE</div>
          <div style={{ width: 56, color: '#2a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'right' }}>STAGE</div>
          <div style={{ width: 44, color: '#2a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'right' }}>OC</div>
          <div style={{ width: 64, color: '#2a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'right' }}>DMG</div>
        </div>

        {/* Entries list */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {entries.length === 0 && (
            <div className="font-pixel" style={{ color: '#1a3a4a', fontSize: '8px', textAlign: 'center', padding: 40 }}>
              NO DATA AVAILABLE
            </div>
          )}
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isMe = entry.user_id === currentUserId;
            const rankColor = getRankColor(rank);

            return (
              <div
                key={entry.user_id}
                className="flex items-center px-4 py-2"
                style={{
                  gap: 8,
                  background: isMe ? '#001520' : 'transparent',
                  borderLeft: isMe ? '2px solid #00f5ff' : '2px solid transparent',
                  borderBottom: '1px solid #0a1218',
                  boxShadow: isMe ? 'inset 0 0 20px rgba(0,245,255,0.03)' : undefined,
                  transition: 'background 0.1s',
                }}
              >
                {/* Rank */}
                <div style={{
                  width: 32, fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700,
                  color: rankColor,
                  textShadow: getRankGlow(rank),
                }}>
                  {rank}
                </div>

                {/* Handle + online dot */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {entry.isOnline && (
                    <div style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: '#39ff14',
                      boxShadow: '0 0 4px #39ff14',
                    }} />
                  )}
                  <div
                    className="font-pixel"
                    style={{
                      fontSize: '8px',
                      color: isMe ? '#00f5ff' : '#7a9aaa',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.handle || 'UNKNOWN'}
                  </div>
                </div>

                {/* Stage */}
                <div style={{
                  width: 56, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: '#00f5ff',
                }}>
                  {entry.highest_stage}
                </div>

                {/* OC */}
                <div style={{
                  width: 44, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: '#ff0080',
                }}>
                  {entry.overclock_count}
                </div>

                {/* Damage */}
                <div style={{
                  width: 64, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: '#5a7a8a',
                }}>
                  {formatDamage(Number(entry.total_damage))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ borderTop: '1px solid #0a1828', flexShrink: 0, background: '#020810' }}
        >
          <div style={{ color: '#1a3a4a', fontFamily: 'var(--font-mono)', fontSize: '7px' }}>
            RANKED BY HIGHEST STAGE
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', boxShadow: '0 0 4px #39ff14' }} />
            <span style={{ color: '#2a4a5a', fontFamily: 'var(--font-mono)', fontSize: '7px' }}>
              = ONLINE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
