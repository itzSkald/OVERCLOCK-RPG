import React, { useState, useEffect, useCallback } from 'react';
import { X, Trophy, Users, Clock, RefreshCw, Swords } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import type { TournamentPlugin, TournamentEntry } from '../../plugins/TournamentPlugin';

interface TournamentScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

function formatTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 'ENDED';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getRankSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  return '#5a6a7a';
}

function PrizeRow({ rank, diamonds }: { rank: number; diamonds: number }) {
  const color = getRankColor(rank);
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 10px',
        background: rank === 1 ? '#1a1200' : rank === 2 ? '#0f0f0f' : '#0a0a0a',
        border: `1px solid ${color}33`,
        marginBottom: 3,
      }}
    >
      <span className="font-pixel" style={{ color, fontSize: '8px' }}>
        #{rank}{getRankSuffix(rank)}
      </span>
      <span className="font-pixel" style={{ color: '#00e5ff', fontSize: '8px' }}>
        {diamonds} ◈
      </span>
    </div>
  );
}

function LeaderRow({ entry, position, myUserId }: { entry: TournamentEntry; position: number; myUserId: string | null }) {
  const isMe = entry.user_id === myUserId;
  const color = getRankColor(position);
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px',
        background: isMe ? '#001520' : 'transparent',
        border: isMe ? '1px solid #00f5ff33' : '1px solid transparent',
        marginBottom: 2,
      }}
    >
      <span className="font-pixel" style={{ color, fontSize: '8px', minWidth: 22 }}>
        #{position}
      </span>
      <span
        style={{
          flex: 1,
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: isMe ? '#00f5ff' : '#8a9aaa',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.handle}
        {isMe && <span style={{ color: '#00f5ff55', fontSize: '8px', marginLeft: 4 }}>(you)</span>}
      </span>
      <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '8px' }}>
        STG {entry.score}
      </span>
    </div>
  );
}

export const TournamentScreen: React.FC<TournamentScreenProps> = ({ engine, onClose }) => {
  const highestStage = useGameState(engine, s => s.highestStage);
  const plugin = engine.getPlugin<TournamentPlugin>('tournament');

  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => {
    if (!plugin) return;
    return plugin.subscribe(refresh);
  }, [plugin, refresh]);

  // Timer for countdown
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimerTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tournament = plugin?.getActiveTournament() ?? null;
  const myEntry = plugin?.getMyEntry() ?? null;
  const leaderboard = plugin?.getLeaderboard() ?? [];
  const isJoined = plugin?.isJoined() ?? false;

  // Get user id from auth plugin
  const authPlugin = engine.getPlugin<{ getPlayer: () => { id: string } | null }>('auth');
  const myUserId = authPlugin?.getPlayer()?.id ?? null;

  const handleJoin = async () => {
    if (!plugin || joining) return;
    setJoining(true);
    await plugin.joinTournament();
    setJoining(false);
  };

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    plugin?.refreshLeaderboard();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const myPosition = myEntry
    ? leaderboard.findIndex(e => e.user_id === myUserId) + 1
    : null;

  const prizeDistribution = tournament
    ? [
        { rank: 1, diamonds: Math.floor(tournament.prize_diamonds * 0.5) },
        { rank: 2, diamonds: Math.floor(tournament.prize_diamonds * 0.3) },
        { rank: 3, diamonds: Math.floor(tournament.prize_diamonds * 0.2) },
      ]
    : [];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          background: '#0a0a12',
          border: '1px solid #1a2a3a',
          display: 'flex',
          flexDirection: 'column',
          margin: '0 12px',
          boxShadow: '0 0 40px rgba(255,170,0,0.06)',
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
            background: '#07070e',
          }}
        >
          <div className="flex items-center gap-2">
            <Swords size={14} color="#ffaa00" />
            <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '10px', letterSpacing: '2px' }}>
              TOURNAMENT
            </span>
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

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {!tournament ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <Trophy size={32} color="#2a3a4a" style={{ margin: '0 auto 12px' }} />
              <div className="font-pixel" style={{ color: '#3a4a5a', fontSize: '9px', letterSpacing: '2px' }}>
                NO ACTIVE TOURNAMENT
              </div>
              <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 8 }}>
                Check back soon for the next event.
              </div>
            </div>
          ) : (
            <>
              {/* Tournament info card */}
              <div
                style={{
                  margin: '12px 12px 0',
                  padding: '12px',
                  background: '#07070e',
                  border: '1px solid #2a1a00',
                  boxShadow: '0 0 16px rgba(255,170,0,0.05)',
                }}
              >
                <div className="font-pixel" style={{ color: '#ffaa00', fontSize: '9px', marginBottom: 8, letterSpacing: '1px' }}>
                  {tournament.name}
                </div>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div className="flex items-center gap-2">
                    <Clock size={10} color="#5a6a7a" />
                    <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                      {tournament.status === 'active' ? 'Ends in' : 'Status'}:
                    </span>
                    <span className="font-pixel" style={{ color: '#00f5ff', fontSize: '8px' }}>
                      {formatTimeRemaining(tournament.ends_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy size={10} color="#ffd700" />
                    <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Prize pool:</span>
                    <span className="font-pixel" style={{ color: '#00e5ff', fontSize: '8px' }}>
                      {tournament.prize_diamonds} ◈
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={10} color="#5a6a7a" />
                    <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>
                      Competitors:
                    </span>
                    <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '8px' }}>
                      {leaderboard.length}
                    </span>
                  </div>
                </div>

                {/* Scoring note */}
                <div style={{ marginTop: 8, color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
                  Score = highest stage reached during the tournament window.
                </div>
              </div>

              {/* Prize distribution */}
              <div style={{ padding: '12px 12px 0' }}>
                <div className="font-pixel" style={{ color: '#5a6a7a', fontSize: '7px', letterSpacing: '2px', marginBottom: 6 }}>
                  {'> PRIZE DISTRIBUTION'}
                </div>
                {prizeDistribution.map(p => (
                  <PrizeRow key={p.rank} rank={p.rank} diamonds={p.diamonds} />
                ))}
              </div>

              {/* My status */}
              {isJoined && myEntry ? (
                <div
                  style={{
                    margin: '12px 12px 0',
                    padding: '10px',
                    background: '#001520',
                    border: '1px solid #00f5ff33',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="font-pixel" style={{ color: '#00f5ff', fontSize: '7px', letterSpacing: '1px', marginBottom: 3 }}>
                        YOUR STANDING
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                          <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Rank: </span>
                          <span className="font-pixel" style={{ color: myPosition && myPosition <= 3 ? getRankColor(myPosition) : '#00f5ff', fontSize: '9px' }}>
                            {myPosition ? `#${myPosition}` : '--'}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Score: </span>
                          <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '9px' }}>
                            STG {myEntry.score}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Best: </span>
                          <span className="font-pixel" style={{ color: '#39ff14', fontSize: '9px' }}>
                            STG {highestStage}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px 12px 0' }}>
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="font-pixel w-full"
                    style={{
                      background: joining ? '#080808' : '#1a0d00',
                      border: `1px solid ${joining ? '#2a2a2a' : '#ffaa00'}`,
                      color: joining ? '#3a3a3a' : '#ffaa00',
                      padding: '12px',
                      fontSize: '9px',
                      letterSpacing: '2px',
                      cursor: joining ? 'not-allowed' : 'pointer',
                      boxShadow: joining ? 'none' : '0 0 12px rgba(255,170,0,0.15)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {joining ? 'JOINING...' : 'JOIN TOURNAMENT'}
                  </button>
                  <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'center', marginTop: 6 }}>
                    Your current best (STG {highestStage}) will be your starting score.
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div style={{ padding: '12px 12px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div className="font-pixel" style={{ color: '#5a6a7a', fontSize: '7px', letterSpacing: '2px' }}>
                    {'> LEADERBOARD'}
                  </div>
                  <button
                    onClick={handleRefresh}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#3a4a5a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <RefreshCw
                      size={10}
                      color="#3a4a5a"
                      style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
                    />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px' }}>REFRESH</span>
                  </button>
                </div>

                {leaderboard.length === 0 ? (
                  <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', padding: '16px 0' }}>
                    No entries yet. Be the first to join!
                  </div>
                ) : (
                  leaderboard.map((entry, i) => (
                    <LeaderRow
                      key={entry.id}
                      entry={entry}
                      position={i + 1}
                      myUserId={myUserId}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
