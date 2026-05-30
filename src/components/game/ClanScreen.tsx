import React, { useState, useEffect, useCallback } from 'react';
import { X, Users, Crown, Shield, UserMinus, UserPlus, ChevronRight, ChevronLeft, Settings, LogOut, RefreshCw, Check, XIcon } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import type { ClanPlugin, Clan, ClanMember, ClanInvite } from '../../plugins/ClanPlugin';

interface ClanScreenProps {
  engine: GameEngine;
  onClose: () => void;
}

const COLORS = [
  '#00f5ff',
  '#ff0080',
  '#39ff14',
  '#ffaa00',
  '#ff4444',
  '#aa44ff',
  '#44aaff',
  '#ff8844',
] as const;

/** Derive a consistent color from clan ID (since color column was removed from DB) */
function getClanColor(clan: Clan): string {
  // Use first chars of ID to generate a consistent index
  const hash = clan.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

function getRoleIcon(role: ClanMember['role'], color: string) {
  if (role === 'leader') return <Crown size={10} color="#ffd700" />;
  if (role === 'officer') return <Shield size={10} color={color} />;
  return null;
}

function getRoleLabel(role: ClanMember['role']): string {
  if (role === 'leader') return 'LEADER';
  if (role === 'officer') return 'OFFICER';
  return 'MEMBER';
}

// Create Clan Form
function CreateClanForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, tag: string, description: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(name, tag, description);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create clan');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '14px' }}>
      <div className="font-pixel" style={{ color: '#e0e8f0', fontSize: '9px', marginBottom: 14 }}>CREATE CLAN</div>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px', display: 'block', marginBottom: 4 }}>
          CLAN NAME (3-24 chars)
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={24}
          placeholder="Enter clan name..."
          style={{
            width: '100%', background: '#06060e', border: '1px solid #1a2a3a',
            color: '#e0e8f0', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px', display: 'block', marginBottom: 4 }}>
          TAG (2-5 chars, shown as [TAG])
        </label>
        <input
          type="text"
          value={tag}
          onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          maxLength={5}
          placeholder="ABC"
          style={{
            width: '100%', background: '#06060e', border: '1px solid #1a2a3a',
            color: '#e0e8f0', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px',
            outline: 'none', textTransform: 'uppercase',
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px', display: 'block', marginBottom: 4 }}>
          DESCRIPTION (optional)
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={200}
          placeholder="Describe your clan..."
          rows={3}
          style={{
            width: '100%', background: '#06060e', border: '1px solid #1a2a3a',
            color: '#e0e8f0', padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '10px',
            outline: 'none', resize: 'none',
          }}
        />
      </div>

      {error && (
        <div style={{ color: '#ff4444', fontFamily: 'var(--font-mono)', fontSize: '9px', marginBottom: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, background: '#0a0a10', border: '1px solid #2a3a4a',
            color: '#5a6a7a', padding: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '9px',
          }}
        >
          CANCEL
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || name.length < 3 || tag.length < 2}
          style={{
            flex: 1, background: '#001510', border: `1px solid ${color}66`,
            color: color, padding: '10px', cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '9px',
            opacity: (name.length < 3 || tag.length < 2) ? 0.5 : 1,
          }}
        >
          {loading ? 'CREATING...' : 'CREATE CLAN'}
        </button>
      </div>
    </div>
  );
}

// Clan Card for browsing
function ClanCard({
  clan,
  onSelect,
}: {
  clan: Clan;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        width: '100%', background: '#080810', border: '1px solid #1a2a3a',
        padding: '10px 12px', marginBottom: 6, cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 10,
        transition: 'border-color 0.15s, background 0.15s',
      }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = getClanColor(clan) + '66'; e.currentTarget.style.background = '#0c0c18'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2a3a'; e.currentTarget.style.background = '#080810'; }}
    >
      <div style={{
        width: 32, height: 32, background: getClanColor(clan) + '22',
        border: `1px solid ${getClanColor(clan)}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span className="font-pixel" style={{ color: getClanColor(clan), fontSize: '8px' }}>{clan.tag}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span className="font-pixel" style={{ color: '#e0e8f0', fontSize: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clan.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            <Users size={8} style={{ display: 'inline', marginRight: 2 }} />
            {clan.member_count}
          </span>
          <span style={{ color: '#ffaa00', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            STG {clan.total_stage}
          </span>
        </div>
      </div>

      <ChevronRight size={12} color="#2a3a4a" />
    </button>
  );
}

// Member Row
function MemberRow({
  member,
  isMe,
  canManage,
  isLeader,
  clanColor,
  onPromote,
  onDemote,
  onKick,
  onTransfer,
}: {
  member: ClanMember;
  isMe: boolean;
  canManage: boolean;
  isLeader: boolean;
  clanColor: string;
  onPromote: () => void;
  onDemote: () => void;
  onKick: () => void;
  onTransfer: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: isMe ? '#001520' : 'transparent',
        border: isMe ? '1px solid #00f5ff22' : '1px solid transparent',
        marginBottom: 2,
        position: 'relative',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div style={{ width: 14, display: 'flex', justifyContent: 'center' }}>
        {getRoleIcon(member.role, clanColor)}
      </div>
      <span style={{
        flex: 1, fontFamily: 'var(--font-mono)', fontSize: '10px',
        color: isMe ? '#00f5ff' : '#7a8a9a',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {member.handle}
        {isMe && <span style={{ color: '#00f5ff44', fontSize: '8px', marginLeft: 4 }}>(you)</span>}
      </span>
      <span className="font-pixel" style={{ color: '#ffaa00', fontSize: '7px', marginRight: 4 }}>
        MAX {member.max_stage}
      </span>
      <span style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '7px', minWidth: 50, textAlign: 'right' }}>
        {getRoleLabel(member.role)}
      </span>

      {/* Action buttons */}
      {canManage && !isMe && showActions && member.role !== 'leader' && (
        <div style={{
          position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 2, background: '#0a0a12', padding: '2px 4px',
          border: '1px solid #1a2a3a',
        }}>
          {isLeader && member.role === 'member' && (
            <button
              onClick={e => { e.stopPropagation(); onPromote(); }}
              title="Promote to Officer"
              style={{ background: 'none', border: 'none', color: '#39ff14', cursor: 'pointer', padding: 2 }}
            >
              <Shield size={10} />
            </button>
          )}
          {isLeader && member.role === 'officer' && (
            <button
              onClick={e => { e.stopPropagation(); onDemote(); }}
              title="Demote to Member"
              style={{ background: 'none', border: 'none', color: '#ffaa00', cursor: 'pointer', padding: 2 }}
            >
              <UserMinus size={10} />
            </button>
          )}
          {isLeader && (
            <button
              onClick={e => { e.stopPropagation(); onTransfer(); }}
              title="Transfer Leadership"
              style={{ background: 'none', border: 'none', color: '#ffd700', cursor: 'pointer', padding: 2 }}
            >
              <Crown size={10} />
            </button>
          )}
          {isLeader && (
            <button
              onClick={e => { e.stopPropagation(); onKick(); }}
              title="Kick Member"
              style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', padding: 2 }}
            >
              <XIcon size={10} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Invite Card
function InviteCard({
  invite,
  onAccept,
  onDecline,
}: {
  invite: ClanInvite;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const clan = invite.clan;
  if (!clan) return null;

  return (
    <div style={{
      background: '#080810', border: '1px solid #1a2a3a',
      padding: '10px 12px', marginBottom: 6,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, background: getClanColor(clan) + '22',
        border: `1px solid ${getClanColor(clan)}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span className="font-pixel" style={{ color: getClanColor(clan), fontSize: '7px' }}>{clan.tag}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-pixel" style={{ color: '#e0e8f0', fontSize: '8px', marginBottom: 2 }}>
          {clan.name}
        </div>
        <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
          Invited you to join
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onAccept}
          style={{
            background: '#001510', border: '1px solid #39ff1444',
            color: '#39ff14', padding: '4px 8px', cursor: 'pointer',
          }}
        >
          <Check size={10} />
        </button>
        <button
          onClick={onDecline}
          style={{
            background: '#100808', border: '1px solid #ff444444',
            color: '#ff4444', padding: '4px 8px', cursor: 'pointer',
          }}
        >
          <XIcon size={10} />
        </button>
      </div>
    </div>
  );
}

// My Clan View
function MyClanView({
  clan,
  membership,
  members,
  plugin,
  onRefresh,
}: {
  clan: Clan;
  membership: ClanMember;
  members: ClanMember[];
  plugin: ClanPlugin;
  onRefresh: () => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isLeader = membership.role === 'leader';
  const canManage = membership.role === 'leader' || membership.role === 'officer';

  const handleLeave = async () => {
    if (!confirm(isLeader && members.length === 1 ? 'This will delete the clan. Continue?' : 'Leave this clan?')) return;
    setLeaving(true);
    const result = await plugin.leaveClan();
    if (!result.success) {
      setError(result.error ?? 'Failed to leave');
    }
    setLeaving(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Clan Header */}
      <div style={{
        flexShrink: 0, padding: '12px 14px', borderBottom: '1px solid #1a2a3a',
        background: '#07070e',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, background: getClanColor(clan) + '22',
            border: `1px solid ${getClanColor(clan)}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span className="font-pixel" style={{ color: getClanColor(clan), fontSize: '10px' }}>{clan.tag}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div className="font-pixel" style={{ color: '#e0e8f0', fontSize: '9px', marginBottom: 2 }}>
              {clan.name}
            </div>
            <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
              [{clan.tag}] • {clan.member_count} members
            </div>
          </div>
        </div>
        {clan.description && (
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '9px', marginTop: 8, lineHeight: 1.4 }}>
            {clan.description}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid #1a1a2a' }}>
        {[
          { label: 'Total Stages', value: clan.total_stage, color: '#ffaa00' },
          { label: 'Total OC', value: clan.total_overclocks, color: '#ff0080' },
          { label: 'Your Role', value: getRoleLabel(membership.role), color: getClanColor(clan) },
        ].map(stat => (
          <div key={stat.label} style={{ flex: 1, background: '#06060e', border: '1px solid #1a1a2a', padding: '6px 8px' }}>
            <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '7px', marginBottom: 2 }}>{stat.label}</div>
            <div className="font-pixel" style={{ color: stat.color, fontSize: '8px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Members List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div className="font-pixel" style={{ color: '#3a4a5a', fontSize: '6px', letterSpacing: '2px' }}>{'> MEMBERS'}</div>
          <button
            onClick={handleRefresh}
            style={{ background: 'transparent', border: 'none', color: '#2a3a4a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
          >
            <RefreshCw size={9} color="#2a3a4a" style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px' }}>REFRESH</span>
          </button>
        </div>

        {members.map(member => (
          <MemberRow
            key={member.id}
            member={member}
            isMe={member.user_id === membership.user_id}
            canManage={canManage}
            isLeader={isLeader}
            clanColor={getClanColor(clan)}
            onPromote={() => plugin.promoteMember(member.id)}
            onDemote={() => plugin.demoteMember(member.id)}
            onKick={() => plugin.kickMember(member.id)}
            onTransfer={() => {
              if (confirm(`Transfer leadership to ${member.handle}?`)) {
                plugin.transferLeadership(member.id);
              }
            }}
          />
        ))}
      </div>

      {/* Leave Button */}
      <div style={{ flexShrink: 0, padding: '10px 14px', borderTop: '1px solid #1a1a2a' }}>
        {error && (
          <div style={{ color: '#ff4444', fontFamily: 'var(--font-mono)', fontSize: '8px', marginBottom: 6 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleLeave}
          disabled={leaving}
          style={{
            width: '100%', background: '#100808', border: '1px solid #ff444433',
            color: '#ff4444', padding: '10px', cursor: leaving ? 'wait' : 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <LogOut size={12} />
          {leaving ? 'LEAVING...' : isLeader && members.length === 1 ? 'DISBAND CLAN' : 'LEAVE CLAN'}
        </button>
      </div>
    </div>
  );
}

// Clan Detail View (for joining)
function ClanDetailView({
  clan,
  plugin,
  onBack,
}: {
  clan: Clan;
  plugin: ClanPlugin;
  onBack: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    const result = await plugin.joinClan(clan.id);
    if (!result.success) {
      setError(result.error ?? 'Failed to join');
    }
    setJoining(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back + Header */}
      <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid #1a2a3a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onBack}
          style={{ background: 'transparent', border: '1px solid #1a2a3a', color: '#3a4a5a', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#00f5ff'; e.currentTarget.style.color = '#00f5ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2a3a'; e.currentTarget.style.color = '#3a4a5a'; }}
        >
          <ChevronLeft size={12} />
        </button>
        <div style={{ flex: 1 }}>
          <div className="font-pixel" style={{ color: '#e0e8f0', fontSize: '9px' }}>
            {clan.name}
          </div>
          <div style={{ color: getClanColor(clan), fontFamily: 'var(--font-mono)', fontSize: '8px' }}>
            [{clan.tag}]
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {/* Clan Info */}
        <div style={{
          width: 60, height: 60, background: getClanColor(clan) + '22',
          border: `1px solid ${getClanColor(clan)}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <span className="font-pixel" style={{ color: getClanColor(clan), fontSize: '14px' }}>{clan.tag}</span>
        </div>

        {clan.description && (
          <div style={{
            color: '#7a8a9a', fontFamily: 'var(--font-mono)', fontSize: '10px',
            textAlign: 'center', marginBottom: 14, lineHeight: 1.5,
          }}>
            {clan.description}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Members', value: clan.member_count, color: '#e0e8f0' },
            { label: 'Total Stages', value: clan.total_stage, color: '#ffaa00' },
            { label: 'Total OC', value: clan.total_overclocks, color: '#ff0080' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: 1, background: '#06060e', border: '1px solid #1a1a2a', padding: '8px', textAlign: 'center' }}>
              <div style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '7px', marginBottom: 3 }}>{stat.label}</div>
              <div className="font-pixel" style={{ color: stat.color, fontSize: '10px' }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Join Button */}
        {error && (
          <div style={{ color: '#ff4444', fontFamily: 'var(--font-mono)', fontSize: '9px', textAlign: 'center', marginBottom: 8 }}>
            {error}
          </div>
        )}
        <button
          onClick={handleJoin}
          disabled={joining}
          className="font-pixel w-full"
          style={{
            background: '#001510', border: `1px solid ${getClanColor(clan)}66`,
            color: getClanColor(clan), padding: '12px', fontSize: '9px', letterSpacing: '2px',
            cursor: joining ? 'wait' : 'pointer',
            boxShadow: `0 0 10px ${getClanColor(clan)}22`,
          }}
        >
          {joining ? 'JOINING...' : 'JOIN CLAN'}
        </button>
      </div>
    </div>
  );
}

// Main Screen
export const ClanScreen: React.FC<ClanScreenProps> = ({ engine, onClose }) => {
  const plugin = engine.getPlugin<ClanPlugin>('clan');

  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick(t => t + 1), []);
  useEffect(() => { if (!plugin) return; return plugin.subscribe(refresh); }, [plugin, refresh]);

  const [view, setView] = useState<'main' | 'create' | 'detail'>('main');
  const [selectedClanId, setSelectedClanId] = useState<string | null>(null);

  const myClan = plugin?.getMyClan();
  const myMembership = plugin?.getMyMembership();
  const clanMembers = plugin?.getClanMembers() ?? [];
  const allClans = plugin?.getAllClans() ?? [];
  const pendingInvites = plugin?.getPendingInvites() ?? [];

  const selectedClan = selectedClanId ? allClans.find(c => c.id === selectedClanId) : null;

  const handleCreateClan = async (name: string, tag: string, description: string) => {
    const result = await plugin?.createClan(name, tag, description);
    if (result?.success) {
      setView('main');
    } else {
      throw new Error(result?.error ?? 'Failed to create clan');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 440, maxHeight: '92vh', background: '#0a0a12',
        border: '1px solid #1a2a3a', display: 'flex', flexDirection: 'column',
        margin: '0 12px', boxShadow: '0 0 40px rgba(0,245,255,0.06)',
      }}>
        {/* Header */}
        <div style={{
          flexShrink: 0, padding: '11px 14px', borderBottom: '1px solid #1a2a3a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#07070e',
        }}>
          <div className="flex items-center gap-2">
            <Users size={13} color="#00f5ff" />
            <span className="font-pixel" style={{ color: '#00f5ff', fontSize: '10px', letterSpacing: '2px' }}>
              {myClan ? 'MY CLAN' : 'CLANS'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pendingInvites.length > 0 && !myClan && (
              <span style={{
                background: '#ff0080', color: '#000', padding: '1px 5px',
                fontFamily: 'var(--font-mono)', fontSize: '8px',
              }}>
                {pendingInvites.length} INVITE{pendingInvites.length > 1 ? 'S' : ''}
              </span>
            )}
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
          {/* Already in a clan - show clan view */}
          {myClan && myMembership ? (
            <MyClanView
              clan={myClan}
              membership={myMembership}
              members={clanMembers}
              plugin={plugin!}
              onRefresh={() => plugin?.refresh()}
            />
          ) : view === 'create' ? (
            <CreateClanForm
              onSubmit={handleCreateClan}
              onCancel={() => setView('main')}
            />
          ) : view === 'detail' && selectedClan ? (
            <ClanDetailView
              clan={selectedClan}
              plugin={plugin!}
              onBack={() => { setView('main'); setSelectedClanId(null); }}
            />
          ) : (
            /* Browse clans */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid #1a1a2a', maxHeight: 140, overflowY: 'auto' }}>
                  <div className="font-pixel" style={{ color: '#ff0080', fontSize: '6px', letterSpacing: '2px', marginBottom: 6 }}>{'> PENDING INVITES'}</div>
                  {pendingInvites.map(invite => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      onAccept={() => plugin?.acceptInvite(invite.id)}
                      onDecline={() => plugin?.declineInvite(invite.id)}
                    />
                  ))}
                </div>
              )}

              {/* Create Button */}
              <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid #1a1a2a' }}>
                <button
                  onClick={() => setView('create')}
                  className="font-pixel w-full"
                  style={{
                    background: '#001015', border: '1px solid #00f5ff44',
                    color: '#00f5ff', padding: '10px', fontSize: '8px', letterSpacing: '2px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <UserPlus size={12} />
                  CREATE CLAN
                </button>
              </div>

              {/* Clan List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
                <div className="font-pixel" style={{ color: '#3a4a5a', fontSize: '6px', letterSpacing: '2px', marginBottom: 8 }}>
                  {'> BROWSE CLANS'} ({allClans.length})
                </div>
                {allClans.length === 0 ? (
                  <div style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '10px', textAlign: 'center', padding: '20px 0' }}>
                    No clans yet. Be the first to create one!
                  </div>
                ) : (
                  allClans.map(clan => (
                    <ClanCard
                      key={clan.id}
                      clan={clan}
                      onSelect={() => { setSelectedClanId(clan.id); setView('detail'); }}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
