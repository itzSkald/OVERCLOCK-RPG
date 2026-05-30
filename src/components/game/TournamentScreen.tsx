import React, { useState, useEffect, useCallback } from 'react';
import { X, Trophy, Users, Clock, RefreshCw, Swords, Lock, ChevronRight, Diamond } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import type { TournamentPlugin, Tournament, TournamentEntry } from '../../plugins/TournamentPlugin';

interface TournamentScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

function formatTimeRemaining(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'ENDED';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTimeUntil(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now();
  if (diff <= 0) return 'NOW';
  return formatTimeRemaining(isoDate);
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  return '#5a6a7a';
}

function getRankSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

const STATUS_COLORS: Record<Tournament['status'], string> = {
  active: '#39ff14',
  upcoming: '#ffaa00',
  ended: '#3a4a5a',
};

const STATUS_LABELS: Record<Tournament['status'], string> = {
  active: 'LIVE',
  upcoming: 'UPCOMING',
  ended: 'ENDED',
};

function TournamentCard({
  tournament,
  participantCount,
  myEntry,
  myUserId,
  onSelect,
}: {
  tournament: Tournament;
  participantCount: number;
  myEntry: TournamentEntry | null;
  myUserId: string | null;
  onSelect: () => void;
}) {
  const statusColor = STATUS_COLORS[tournament.status];
  const isFull = participantCount >= tournament.player_cap;
  const isJoined = !!myEntry;

  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', background: '#080810', border: `1px solid #1a2a3a`,
        padding: '11px 13px', marginBottom: 6, cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'border-color 0.15s, background 0.15s',
        boxShadow: isJoined ? '0 0 8px rgba(0,245,255,0.08)' : 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = statusColor + '66'; e.currentTarget.style.background = '#0c0c18'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2a3a'; e.currentTarget.style.background = '#080810'; }}
    >
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: statusColor,
        boxShadow: tournament.status === 'active' ? `0 0 6px ${statusColor}` : 'none',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span className="font-pixel" style={{ color: '#e0e8f0', fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tournament.name}
          </span>
          {isJoined && (
            <span className="font-pixel" style={{ color: '#00f5ff', fontSize: '6px', background: '#001520', border: '1px solid #00f5ff33', padding: '1px 4px', flexShrink: 0 }}>IN</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: statusColor, fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            {STATUS_LABELS[tournament.status]}
            {tournament.status === 'active' && ` — ${formatTimeRemaining(tournament.ends_at)}`}
            {tournament.status === 'upcoming' && ` — starts in ${formatTimeUntil(tournament.starts_at)}`}
          </span>
          <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            <Users size={8} style={{ display: 'inline', marginRight: 2 }} />
            {participantCount}/{tournament.player_cap}
            {isFull && !isJoined && <span style={{ color: '#ff4444', marginLeft: 4 }}>FULL</span>}
          </span>
        </div>
      </div>

      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
          {tournament.prize_diamonds} ◈
        </span>
        <span style={{ color: '#39ff14', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
          {isJoined ? 'JOINED' : 'FREE'}
        </span>
        <ChevronRight size={10} color="#2a3a4a" />
      </div>
    </button>
  );
}

function LeaderRow({ entry, position, myUserId }: { entry: TournamentEntry; position: number; myUserId: string | null }) {
  const isMe = entry.user_id === myUserId;
  const color = getRankColor(position);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
      background: isMe ? '#001520' : 'transparent',
      border: isMe ? '1px solid #00f5ff22' : '1px solid transparent',
      marginBottom: 2,
    }}>
      <span className="font-pixel" style={{ color, fontSize: '7px', minWidth: 22 }}>
        #{position}
      </span>
      <span style={{
        flex: 1, fontFamily: 'var(--font-mono)', fontSize: '10px',
        color: isMe ? '#00f5ff' : '#7a8a9a',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {entry.handle}
        {isMe && <span style={{ color: '#00f5ff44', fontSize: '8px', marginLeft: 4 }}>(you)</span>}
      </span>
      <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '7px' }}>
        STG {entry.score}
      </span>
    </div>
  );
}

function TournamentDetail({
  tournament,
  participantCount,
  myEntry,
  leaderboard,
  myUserId,
  diamonds,
  highestStage,
  joinWindowOpen,
  joinWindowRemaining,
  onJoin,
  onBack,
  onRefresh,
}: {
  tournament: Tournament;
  participantCount: number;
  myEntry: TournamentEntry | null;
  leaderboard: TournamentEntry[];
  myUserId: string | null;
  diamonds: number;
  highestStage: number;
  joinWindowOpen: boolean;
  joinWindowRemaining: string | null;
  onJoin: () => Promise<void>;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isFull = participantCount >= tournament.player_cap;
  const isJoined = !!myEntry;
  const myPosition = myEntry ? leaderboard.findIndex(e => e.user_id === myUserId) + 1 : null;
  const statusColor = STATUS_COLORS[tournament.status];

  const prizeDistribution = [
    { rank: 1, diamonds: Math.floor(tournament.prize_diamonds * 0.5) },
    { rank: 2, diamonds: Math.floor(tournament.prize_diamonds * 0.3) },
    { rank: 3, diamonds: Math.floor(tournament.prize_diamonds * 0.2) },
  ];

  const handleJoin = async () => {
    setJoining(true);
    setJoinError(null);
    await onJoin();
    setJoining(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back + title */}
      <div style={{ flexShrink: 0, padding: '10px 13px', borderBottom: '1px solid #1a2a3a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: '1px solid #1a2a3a', color: '#3a4a5a', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00f5ff'; e.currentTarget.style.color = '#00f5ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2a3a'; e.currentTarget.style.color = '#3a4a5a'; }}
        >
          ‹
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="font-pixel" style={{ color: '#e0e8f0', fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tournament.name}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
            <span style={{ color: statusColor, fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
              {STATUS_LABELS[tournament.status]}
              {tournament.status === 'active' && ` — ends in ${formatTimeRemaining(tournament.ends_at)}`}
              {tournament.status === 'upcoming' && ` — starts in ${formatTimeUntil(tournament.starts_at)}`}
            </span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 13px' }}>
        {/* Stats row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          {[
            { label: 'Prize Pool', value: `${tournament.prize_diamonds} ◈`, color: '#00e5ff' },
            { label: 'Entry', value: 'FREE', color: '#39ff14' },
            { label: 'Players', value: `${participantCount}/${tournament.player_cap}`, color: isFull && !isJoined ? '#ff4444' : '#e0e8f0' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#06060e', border: '1px solid #1a1a2a', padding: '6px 10px', flex: 1, minWidth: 80 }}>
              <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '8px', marginBottom: 2 }}>{stat.label}</div>
              <div className="font-pixel" style={{ color: stat.color, fontSize: '9px' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Prizes */}
        <div className="font-pixel" style={{ color: '#3a4a5a', fontSize: '6px', letterSpacing: '2px', marginBottom: 5 }}>{'> PRIZE DISTRIBUTION'}</div>
        {prizeDistribution.map(p => (
          <div key={p.rank} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '4px 10px', marginBottom: 3,
            background: p.rank === 1 ? '#100d00' : '#08080e',
            border: `1px solid ${getRankColor(p.rank)}28`,
          }}>
            <span className="font-pixel" style={{ color: getRankColor(p.rank), fontSize: '7px' }}>
              #{p.rank}{getRankSuffix(p.rank)}
            </span>
            <span className="font-pixel" style={{ color: '#00e5ff', fontSize: '7px' }}>{p.diamonds} ◈</span>
          </div>
        ))}

        {/* My standing or join button */}
        {isJoined && myEntry ? (
          <div style={{ background: '#001520', border: '1px solid #00f5ff28', padding: '10px', margin: '10px 0' }}>
            <div className="font-pixel" style={{ color: '#00f5ff', fontSize: '6px', letterSpacing: '1px', marginBottom: 6 }}>YOUR STANDING</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <span style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Rank </span>
                <span className="font-pixel" style={{ color: myPosition && myPosition <= 3 ? getRankColor(myPosition) : '#00f5ff', fontSize: '9px' }}>
                  {myPosition ? `#${myPosition}` : '--'}
                </span>
              </div>
              <div>
                <span style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Score </span>
                <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '9px' }}>STG {myEntry.score}</span>
              </div>
              <div>
                <span style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>Best </span>
                <span className="font-pixel" style={{ color: '#39ff14', fontSize: '9px' }}>STG {highestStage}</span>
              </div>
            </div>
          </div>
        ) : tournament.status === 'active' && (
          <div style={{ margin: '10px 0' }}>
            {!joinWindowOpen ? (
              <div className="font-pixel" style={{ color: '#ff4444', fontSize: '8px', textAlign: 'center', padding: '10px', border: '1px solid #ff444422' }}>
                JOIN WINDOW CLOSED
              </div>
            ) : isFull ? (
              <div className="font-pixel" style={{ color: '#ff4444', fontSize: '8px', textAlign: 'center', padding: '10px', border: '1px solid #ff444422' }}>
                BRACKET FULL
              </div>
            ) : (
              <>
                {joinWindowRemaining && (
                  <div style={{ color: '#ffaa00', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'center', marginBottom: 6 }}>
                    Join window closes in {joinWindowRemaining}
                  </div>
                )}
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="font-pixel w-full"
                  style={{
                    background: '#130a00', border: '1px solid #ffaa00',
                    color: '#ffaa00', padding: '11px', fontSize: '8px', letterSpacing: '2px',
                    cursor: !joining ? 'pointer' : 'not-allowed',
                    boxShadow: '0 0 10px rgba(255,170,0,0.12)',
                  }}
                >
                  {joining ? 'JOINING...' : 'JOIN FREE'}
                </button>
                {joinError && (
                  <div style={{ color: '#ff4444', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'center', marginTop: 5 }}>
                    {joinError}
                  </div>
                )}
                <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '8px', textAlign: 'center', marginTop: 5 }}>
                  Starting score: STG {highestStage}
                </div>
              </>
            )}
          </div>
        )}

        {tournament.status === 'upcoming' && !isJoined && (
          <div style={{ margin: '10px 0', padding: '10px', background: '#0a0800', border: '1px solid #ffaa0022', textAlign: 'center' }}>
            <Clock size={14} color="#ffaa00" style={{ margin: '0 auto 6px' }} />
            <div className="font-pixel" style={{ color: '#ffaa00', fontSize: '8px', marginBottom: 4 }}>
              STARTS IN {formatTimeUntil(tournament.starts_at)}
            </div>
            <div style={{ color: '#3a3a2a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
              Registration opens when the tournament goes live.
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div className="font-pixel" style={{ color: '#3a4a5a', fontSize: '6px', letterSpacing: '2px' }}>{'> LEADERBOARD'}</div>
            <button
              onClick={handleRefresh}
              style={{ background: 'transparent', border: 'none', color: '#2a3a4a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
            >
              <RefreshCw size={9} color="#2a3a4a" style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px' }}>REFRESH</span>
            </button>
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', padding: '14px 0' }}>
              No entries yet.
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <LeaderRow key={entry.id} entry={entry} position={i + 1} myUserId={myUserId} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export const TournamentScreen: React.FC<TournamentScreenProps> = ({ engine, onClose }) => {
  const highestStage = useGameState(engine, s => s.highestStage);
  const diamonds = useGameState(engine, s => s.diamonds);
  const plugin = engine.getPlugin<TournamentPlugin>('tournament');

  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => { if (!plugin) return; return plugin.subscribe(refresh); }, [plugin, refresh]);

  // Countdown ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const authPlugin = engine.getPlugin<{ getPlayer: () => { id: string } | null }>('auth');
  const myUserId = authPlugin?.getPlayer()?.id ?? null;

  const allTournaments = plugin?.getAll() ?? [];
  const active = allTournaments.filter(t => t.status === 'active');
  const upcoming = allTournaments.filter(t => t.status === 'upcoming');

  const selectedTournament = selectedId ? allTournaments.find(t => t.id === selectedId) ?? null : null;

  const handleJoin = async (tournamentId: string) => {
    const result = await plugin?.joinTournament(tournamentId);
    if (result && !result.success && result.error) {
      // Error shown inline in detail view
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 480, maxHeight: '92vh', background: '#0a0a12',
        border: '1px solid #1a2a3a', display: 'flex', flexDirection: 'column',
        margin: '0 12px', boxShadow: '0 0 40px rgba(255,170,0,0.06)',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '11px 14px', borderBottom: '1px solid #1a2a3a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#07070e',
        }}>
          <div className="flex items-center gap-2">
            <Swords size={13} color="#ffaa00" />
            <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '10px', letterSpacing: '2px' }}>TOURNAMENTS</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span style={{ color: '#00e5ff', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>◈</span>
              <span className="font-pixel" style={{ color: '#00e5ff', fontSize: '10px' }}>{diamonds}</span>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: '1px solid #1a2a3a', color: '#3a4a5a', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.borderColor = '#ff4444'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3a4a5a'; e.currentTarget.style.borderColor = '#1a2a3a'; }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {selectedTournament ? (
            <TournamentDetail
              tournament={selectedTournament}
              participantCount={plugin?.getParticipantCount(selectedTournament.id) ?? 0}
              myEntry={plugin?.getMyEntry(selectedTournament.id) ?? null}
              leaderboard={plugin?.getLeaderboard(selectedTournament.id) ?? []}
              myUserId={myUserId}
              diamonds={diamonds}
              highestStage={highestStage}
              joinWindowOpen={plugin?.canJoin(selectedTournament.id).canJoin ?? false}
              joinWindowRemaining={(() => {
                const ms = plugin?.getJoinWindowRemaining(selectedTournament.id);
                if (ms == null || ms <= 0) return null;
                const m = Math.floor(ms / 60000);
                const s = Math.floor((ms % 60000) / 1000);
                return m > 0 ? `${m}m ${s}s` : `${s}s`;
              })()}
              onJoin={() => handleJoin(selectedTournament.id)}
              onBack={() => setSelectedId(null)}
              onRefresh={() => plugin?.refreshLeaderboard(selectedTournament.id)}
            />
          ) : (
            <div style={{ height: '100%', overflowY: 'auto', padding: '10px 12px' }}>
              {allTournaments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Trophy size={32} color="#2a3a4a" style={{ margin: '0 auto 12px' }} />
                  <div className="font-pixel" style={{ color: '#2a3a4a', fontSize: '8px', letterSpacing: '2px' }}>NO TOURNAMENTS AVAILABLE</div>
                  <div style={{ color: '#1a2a2a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 8 }}>Check back soon.</div>
                </div>
              ) : (
                <>
                  {active.length > 0 && (
                    <>
                      <div className="font-pixel" style={{ color: '#39ff14', fontSize: '6px', letterSpacing: '2px', marginBottom: 6 }}>
                        {'> LIVE NOW'}
                      </div>
                      {active.map(t => (
                        <TournamentCard
                          key={t.id}
                          tournament={t}
                          participantCount={plugin?.getParticipantCount(t.id) ?? 0}
                          myEntry={plugin?.getMyEntry(t.id) ?? null}
                          myUserId={myUserId}
                          onSelect={() => setSelectedId(t.id)}
                        />
                      ))}
                    </>
                  )}

                  {upcoming.length > 0 && (
                    <>
                      <div className="font-pixel" style={{ color: '#ffaa00', fontSize: '6px', letterSpacing: '2px', margin: '12px 0 6px' }}>
                        {'> UPCOMING'}
                      </div>
                      {upcoming.map(t => (
                        <TournamentCard
                          key={t.id}
                          tournament={t}
                          participantCount={plugin?.getParticipantCount(t.id) ?? 0}
                          myEntry={plugin?.getMyEntry(t.id) ?? null}
                          myUserId={myUserId}
                          onSelect={() => setSelectedId(t.id)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
