import type { IPlugin, IEngine, GameState, GameEvent, Player } from '../engine/types';
import type { AuthPlugin } from './AuthPlugin';

export interface Clan {
  id: string;
  name: string;
  tag: string;
  description: string;
  leader_id: string;
  color: string;
  banner_index: number;
  member_count: number;
  total_stage: number;
  total_overclocks: number;
  created_at: string;
}

export interface ClanMember {
  id: string;
  clan_id: string;
  user_id: string;
  handle: string;
  role: 'leader' | 'officer' | 'member';
  highest_stage: number;
  overclock_count: number;
  joined_at: string;
}

export interface ClanInvite {
  id: string;
  clan_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  clan?: Clan;
}

export const CLAN_COLORS = [
  '#00f5ff', // cyan
  '#ff0080', // pink
  '#39ff14', // green
  '#ffaa00', // amber
  '#ff4444', // red
  '#aa44ff', // purple
  '#44aaff', // blue
  '#ff8844', // orange
] as const;

export class ClanPlugin implements IPlugin {
  id = 'clan';
  dependencies = ['auth'];
  stateKeys = [] as (keyof GameState)[];

  private engine!: IEngine;
  private userId: string | null = null;
  private handle: string = '';
  
  private myClan: Clan | null = null;
  private myMembership: ClanMember | null = null;
  private clanMembers: ClanMember[] = [];
  private allClans: Clan[] = [];
  private pendingInvites: ClanInvite[] = [];
  
  private listeners: Array<() => void> = [];
  private unsubs: Array<() => void> = [];

  async init(engine: IEngine): Promise<void> {
    this.engine = engine;

    engine.storage.registerTable(this.id + '_clans', { table: 'clans', userScoped: false });
    engine.storage.registerTable(this.id + '_members', { table: 'clan_members', userScoped: false });
    engine.storage.registerTable(this.id + '_invites', { table: 'clan_invites', userScoped: false });

    this.unsubs.push(
      engine.on('auth_success', (event: GameEvent<Player>) => {
        this.userId = event.payload.id;
        this.handle = event.payload.handle;
        void this.load();
      })
    );

    this.unsubs.push(
      engine.on('auth_signout', () => {
        this.userId = null;
        this.handle = '';
        this.myClan = null;
        this.myMembership = null;
        this.clanMembers = [];
        this.pendingInvites = [];
        this.notify();
      })
    );

    // Sync stats when stage changes
    this.unsubs.push(
      engine.on('stage_clear', () => {
        void this.syncMyStats();
      })
    );

    const existing = engine.getPlugin<AuthPlugin>('auth')?.getPlayer();
    if (existing) {
      this.userId = existing.id;
      this.handle = existing.handle;
      void this.load();
    }
  }

  private async load(): Promise<void> {
    await Promise.all([
      this.loadMyClan(),
      this.loadAllClans(),
      this.loadPendingInvites(),
    ]);
    this.notify();
  }

  private async loadMyClan(): Promise<void> {
    if (!this.userId) return;

    const { data: membership } = await this.engine.storage.load<ClanMember>(
      'clan_members',
      { user_id: this.userId },
      'id, clan_id, user_id, handle, role, highest_stage, overclock_count, joined_at'
    );

    if (!membership) {
      this.myMembership = null;
      this.myClan = null;
      this.clanMembers = [];
      return;
    }

    this.myMembership = membership;

    const { data: clan } = await this.engine.storage.load<Clan>(
      'clans',
      { id: membership.clan_id },
      'id, name, tag, description, leader_id, color, banner_index, member_count, total_stage, total_overclocks, created_at'
    );

    this.myClan = clan;

    if (clan) {
      await this.loadClanMembers(clan.id);
    }
  }

  private async loadClanMembers(clanId: string): Promise<void> {
    const { data } = await this.engine.storage.loadMany<ClanMember>(
      'clan_members',
      { clan_id: clanId },
      'id, clan_id, user_id, handle, role, highest_stage, overclock_count, joined_at'
    );
    this.clanMembers = data.sort((a, b) => {
      const roleOrder = { leader: 0, officer: 1, member: 2 };
      const roleDiff = roleOrder[a.role] - roleOrder[b.role];
      if (roleDiff !== 0) return roleDiff;
      return b.highest_stage - a.highest_stage;
    });
  }

  private async loadAllClans(): Promise<void> {
    const { data } = await this.engine.storage.loadMany<Clan>(
      'clans',
      {},
      'id, name, tag, description, leader_id, color, banner_index, member_count, total_stage, total_overclocks, created_at'
    );
    this.allClans = data.sort((a, b) => b.total_stage - a.total_stage);
  }

  private async loadPendingInvites(): Promise<void> {
    if (!this.userId) return;

    const { data } = await this.engine.storage.loadMany<ClanInvite>(
      'clan_invites',
      { invitee_id: this.userId, status: 'pending' },
      'id, clan_id, inviter_id, invitee_id, status, created_at'
    );

    // Enrich with clan info
    const enriched: ClanInvite[] = [];
    for (const invite of data) {
      const clan = this.allClans.find(c => c.id === invite.clan_id);
      enriched.push({ ...invite, clan: clan ?? undefined });
    }
    this.pendingInvites = enriched;
  }

  private async syncMyStats(): Promise<void> {
    if (!this.myMembership || !this.userId) return;

    const newStage = this.engine.state.highestStage;
    const newOC = this.engine.state.totalOverclocks;

    if (newStage <= this.myMembership.highest_stage && newOC <= this.myMembership.overclock_count) {
      return;
    }

    await this.engine.storage.save(
      'clan_members',
      {
        id: this.myMembership.id,
        highest_stage: Math.max(newStage, this.myMembership.highest_stage),
        overclock_count: Math.max(newOC, this.myMembership.overclock_count),
      },
      'id'
    );

    // Recalculate clan totals
    if (this.myClan) {
      await this.recalculateClanStats(this.myClan.id);
    }

    await this.loadMyClan();
    this.notify();
  }

  private async recalculateClanStats(clanId: string): Promise<void> {
    const { data: members } = await this.engine.storage.loadMany<ClanMember>(
      'clan_members',
      { clan_id: clanId },
      'highest_stage, overclock_count'
    );

    const totalStage = members.reduce((sum, m) => sum + m.highest_stage, 0);
    const totalOC = members.reduce((sum, m) => sum + m.overclock_count, 0);

    await this.engine.storage.save(
      'clans',
      {
        id: clanId,
        member_count: members.length,
        total_stage: totalStage,
        total_overclocks: totalOC,
      },
      'id'
    );
  }

  // Public API
  async createClan(name: string, tag: string, description: string, color: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) return { success: false, error: 'Not logged in' };
    if (this.myClan) return { success: false, error: 'Already in a clan' };

    const trimmedName = name.trim();
    const trimmedTag = tag.trim().toUpperCase();

    if (trimmedName.length < 3 || trimmedName.length > 24) {
      return { success: false, error: 'Name must be 3-24 characters' };
    }
    if (trimmedTag.length < 2 || trimmedTag.length > 5) {
      return { success: false, error: 'Tag must be 2-5 characters' };
    }
    if (!/^[A-Z0-9]+$/.test(trimmedTag)) {
      return { success: false, error: 'Tag must be alphanumeric' };
    }

    const { data: clan, error: clanError } = await this.engine.storage.insert<Clan>(
      'clans',
      {
        name: trimmedName,
        tag: trimmedTag,
        description: description.trim().slice(0, 200),
        leader_id: this.userId,
        color,
        banner_index: 0,
        member_count: 1,
        total_stage: this.engine.state.highestStage,
        total_overclocks: this.engine.state.totalOverclocks,
      },
      'id, name, tag, description, leader_id, color, banner_index, member_count, total_stage, total_overclocks, created_at'
    );

    if (clanError || !clan) {
      if (clanError?.includes('unique') || clanError?.includes('duplicate')) {
        return { success: false, error: 'Name or tag already taken' };
      }
      return { success: false, error: clanError ?? 'Failed to create clan' };
    }

    const { error: memberError } = await this.engine.storage.insert(
      'clan_members',
      {
        clan_id: clan.id,
        user_id: this.userId,
        handle: this.handle,
        role: 'leader',
        highest_stage: this.engine.state.highestStage,
        overclock_count: this.engine.state.totalOverclocks,
      }
    );

    if (memberError) {
      await this.engine.storage.remove('clans', { id: clan.id });
      return { success: false, error: 'Failed to join clan' };
    }

    await this.load();
    return { success: true };
  }

  async joinClan(clanId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) return { success: false, error: 'Not logged in' };
    if (this.myClan) return { success: false, error: 'Already in a clan' };

    const clan = this.allClans.find(c => c.id === clanId);
    if (!clan) return { success: false, error: 'Clan not found' };

    const { error } = await this.engine.storage.insert(
      'clan_members',
      {
        clan_id: clanId,
        user_id: this.userId,
        handle: this.handle,
        role: 'member',
        highest_stage: this.engine.state.highestStage,
        overclock_count: this.engine.state.totalOverclocks,
      }
    );

    if (error) {
      if (error.includes('unique') || error.includes('duplicate')) {
        return { success: false, error: 'Already a member' };
      }
      return { success: false, error: 'Failed to join clan' };
    }

    await this.recalculateClanStats(clanId);
    await this.load();
    return { success: true };
  }

  async leaveClan(): Promise<{ success: boolean; error?: string }> {
    if (!this.userId || !this.myClan || !this.myMembership) {
      return { success: false, error: 'Not in a clan' };
    }

    if (this.myMembership.role === 'leader') {
      if (this.clanMembers.length > 1) {
        return { success: false, error: 'Transfer leadership before leaving' };
      }
      // Last member (leader) leaving - delete clan
      await this.engine.storage.remove('clan_members', { id: this.myMembership.id });
      await this.engine.storage.remove('clans', { id: this.myClan.id });
    } else {
      await this.engine.storage.remove('clan_members', { id: this.myMembership.id });
      await this.recalculateClanStats(this.myClan.id);
    }

    await this.load();
    return { success: true };
  }

  async promoteMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.myMembership || this.myMembership.role !== 'leader') {
      return { success: false, error: 'Only leaders can promote' };
    }

    const member = this.clanMembers.find(m => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found' };
    if (member.role === 'leader') return { success: false, error: 'Cannot promote leader' };
    if (member.role === 'officer') return { success: false, error: 'Already an officer' };

    await this.engine.storage.save('clan_members', { id: memberId, role: 'officer' }, 'id');
    await this.loadMyClan();
    this.notify();
    return { success: true };
  }

  async demoteMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.myMembership || this.myMembership.role !== 'leader') {
      return { success: false, error: 'Only leaders can demote' };
    }

    const member = this.clanMembers.find(m => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found' };
    if (member.role !== 'officer') return { success: false, error: 'Can only demote officers' };

    await this.engine.storage.save('clan_members', { id: memberId, role: 'member' }, 'id');
    await this.loadMyClan();
    this.notify();
    return { success: true };
  }

  async kickMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.myMembership || !this.myClan) {
      return { success: false, error: 'Not in a clan' };
    }
    if (this.myMembership.role !== 'leader') {
      return { success: false, error: 'Only leaders can kick members' };
    }

    const member = this.clanMembers.find(m => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found' };
    if (member.role === 'leader') return { success: false, error: 'Cannot kick the leader' };

    await this.engine.storage.remove('clan_members', { id: memberId });
    await this.recalculateClanStats(this.myClan.id);
    await this.loadMyClan();
    this.notify();
    return { success: true };
  }

  async transferLeadership(memberId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.myMembership || this.myMembership.role !== 'leader') {
      return { success: false, error: 'Only leaders can transfer' };
    }

    const member = this.clanMembers.find(m => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found' };
    if (member.user_id === this.userId) return { success: false, error: 'Already the leader' };

    // Demote self to officer, promote target to leader
    await this.engine.storage.save('clan_members', { id: this.myMembership.id, role: 'officer' }, 'id');
    await this.engine.storage.save('clan_members', { id: memberId, role: 'leader' }, 'id');
    
    if (this.myClan) {
      await this.engine.storage.save('clans', { id: this.myClan.id, leader_id: member.user_id }, 'id');
    }

    await this.loadMyClan();
    this.notify();
    return { success: true };
  }

  async acceptInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.userId) return { success: false, error: 'Not logged in' };
    if (this.myClan) return { success: false, error: 'Already in a clan' };

    const invite = this.pendingInvites.find(i => i.id === inviteId);
    if (!invite) return { success: false, error: 'Invite not found' };

    await this.engine.storage.save('clan_invites', { id: inviteId, status: 'accepted' }, 'id');
    
    const result = await this.joinClan(invite.clan_id);
    if (!result.success) {
      return result;
    }

    await this.loadPendingInvites();
    this.notify();
    return { success: true };
  }

  async declineInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    await this.engine.storage.save('clan_invites', { id: inviteId, status: 'declined' }, 'id');
    await this.loadPendingInvites();
    this.notify();
    return { success: true };
  }

  async updateClanDescription(description: string): Promise<{ success: boolean; error?: string }> {
    if (!this.myClan || !this.myMembership) {
      return { success: false, error: 'Not in a clan' };
    }
    if (this.myMembership.role !== 'leader') {
      return { success: false, error: 'Only leaders can update description' };
    }

    await this.engine.storage.save('clans', { id: this.myClan.id, description: description.trim().slice(0, 200) }, 'id');
    await this.loadMyClan();
    this.notify();
    return { success: true };
  }

  // Getters
  getMyClan(): Clan | null { return this.myClan; }
  getMyMembership(): ClanMember | null { return this.myMembership; }
  getClanMembers(): ClanMember[] { return this.clanMembers; }
  getAllClans(): Clan[] { return this.allClans; }
  getPendingInvites(): ClanInvite[] { return this.pendingInvites; }
  isInClan(): boolean { return !!this.myClan; }
  isLeader(): boolean { return this.myMembership?.role === 'leader'; }
  isOfficer(): boolean { return this.myMembership?.role === 'officer'; }

  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  refresh(): void {
    void this.load();
  }

  cleanup(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.listeners = [];
  }
}
