import { schemaManager } from './SchemaManager';
import type { TableSchema } from './types';

/**
 * All database table schemas for OVERCLOCK.
 * These are registered with SchemaManager and auto-created if missing.
 */

// ============================================================================
// CORE GAME TABLES
// ============================================================================

const leaderboardSchema: TableSchema = {
  name: 'leaderboard',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'handle', type: 'text', nullable: false },
    { name: 'highest_stage', type: 'integer', nullable: false, default: '1' },
    { name: 'overclock_count', type: 'integer', nullable: false, default: '0' },
    { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_leaderboard_user_id', columns: ['user_id'], unique: true },
    { name: 'idx_leaderboard_highest_stage', columns: ['highest_stage'] },
  ],
  rls: [
    { name: 'leaderboard_select_all', operation: 'SELECT', using: 'true' },
    { name: 'leaderboard_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
    { name: 'leaderboard_update_own', operation: 'UPDATE', using: 'auth.uid() = user_id' },
  ],
};

const userPresenceSchema: TableSchema = {
  name: 'user_presence',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false, unique: true },
    { name: 'last_seen', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_user_presence_last_seen', columns: ['last_seen'] },
  ],
  rls: [
    { name: 'user_presence_select_all', operation: 'SELECT', using: 'true' },
    { name: 'user_presence_upsert_own', operation: 'ALL', using: 'auth.uid() = user_id', withCheck: 'auth.uid() = user_id' },
  ],
};

// ============================================================================
// DAILY OPS & ACHIEVEMENTS
// ============================================================================

const dailyChallengesSchema: TableSchema = {
  name: 'daily_challenges',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'challenge_date', type: 'date', nullable: false },
    { name: 'challenge_type', type: 'text', nullable: false },
    { name: 'target_value', type: 'integer', nullable: false },
    { name: 'current_value', type: 'integer', nullable: false, default: '0' },
    { name: 'reward_gold', type: 'integer', nullable: false, default: '0' },
    { name: 'completed', type: 'boolean', nullable: false, default: 'false' },
    { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_daily_challenges_user_date', columns: ['user_id', 'challenge_date'] },
  ],
  rls: [
    { name: 'daily_challenges_select_own', operation: 'SELECT', using: 'auth.uid() = user_id' },
    { name: 'daily_challenges_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
    { name: 'daily_challenges_update_own', operation: 'UPDATE', using: 'auth.uid() = user_id' },
  ],
};

const achievementsSchema: TableSchema = {
  name: 'achievements',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'achievement_id', type: 'text', nullable: false },
    { name: 'unlocked_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_achievements_user_achievement', columns: ['user_id', 'achievement_id'], unique: true },
  ],
  rls: [
    { name: 'achievements_select_own', operation: 'SELECT', using: 'auth.uid() = user_id' },
    { name: 'achievements_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
  ],
};

const achievementStatsSchema: TableSchema = {
  name: 'achievement_stats',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false, unique: true },
    { name: 'enemies_killed', type: 'bigint', nullable: false, default: '0' },
    { name: 'bosses_killed', type: 'bigint', nullable: false, default: '0' },
    { name: 'total_damage', type: 'bigint', nullable: false, default: '0' },
    { name: 'total_gold_earned', type: 'bigint', nullable: false, default: '0' },
    { name: 'items_equipped', type: 'integer', nullable: false, default: '0' },
    { name: 'components_upgraded', type: 'integer', nullable: false, default: '0' },
    { name: 'artifacts_collected', type: 'integer', nullable: false, default: '0' },
    { name: 'sets_completed', type: 'integer', nullable: false, default: '0' },
    { name: 'updated_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  rls: [
    { name: 'achievement_stats_select_own', operation: 'SELECT', using: 'auth.uid() = user_id' },
    { name: 'achievement_stats_upsert_own', operation: 'ALL', using: 'auth.uid() = user_id', withCheck: 'auth.uid() = user_id' },
  ],
};

// ============================================================================
// TOURNAMENTS
// ============================================================================

const tournamentsSchema: TableSchema = {
  name: 'tournaments',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'name', type: 'text', nullable: false },
    { name: 'template_name', type: 'text', nullable: false },
    { name: 'bracket_number', type: 'integer', nullable: false, default: '1' },
    { name: 'starts_at', type: 'timestamptz', nullable: false },
    { name: 'ends_at', type: 'timestamptz', nullable: false },
    { name: 'join_closes_at', type: 'timestamptz', nullable: true },
    { name: 'prize_diamonds', type: 'integer', nullable: false, default: '0' },
    { name: 'entry_fee_diamonds', type: 'integer', nullable: false, default: '0' },
    { name: 'player_cap', type: 'integer', nullable: false, default: '32' },
    { name: 'status', type: 'text', nullable: false, default: "'upcoming'", check: "status IN ('upcoming', 'active', 'ended')" },
    { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_tournaments_status', columns: ['status'] },
    { name: 'idx_tournaments_starts_at', columns: ['starts_at'] },
    { name: 'idx_tournaments_join_closes_at', columns: ['join_closes_at'] },
  ],
  rls: [
    { name: 'tournaments_select_all', operation: 'SELECT', using: 'true' },
  ],
};

const tournamentEntriesSchema: TableSchema = {
  name: 'tournament_entries',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'tournament_id', type: 'uuid', nullable: false, references: { table: 'tournaments', column: 'id', onDelete: 'CASCADE' } },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'handle', type: 'text', nullable: false },
    { name: 'score', type: 'integer', nullable: false, default: '0' },
    { name: 'rank', type: 'integer', nullable: true },
    { name: 'start_max_stage', type: 'integer', nullable: false, default: '1' },
    { name: 'joined_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_tournament_entries_tournament_id', columns: ['tournament_id'] },
    { name: 'idx_tournament_entries_user_id', columns: ['user_id'] },
    { name: 'idx_tournament_entries_unique', columns: ['tournament_id', 'user_id'], unique: true },
  ],
  rls: [
    { name: 'tournament_entries_select_all', operation: 'SELECT', using: 'true' },
    { name: 'tournament_entries_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
    { name: 'tournament_entries_update_own', operation: 'UPDATE', using: 'auth.uid() = user_id' },
  ],
};

// ============================================================================
// SHOP
// ============================================================================

const shopPurchasesSchema: TableSchema = {
  name: 'shop_purchases',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'item_id', type: 'text', nullable: false },
    { name: 'purchase_date', type: 'date', nullable: false },
    { name: 'price_gold', type: 'integer', nullable: false, default: '0' },
    { name: 'price_diamonds', type: 'integer', nullable: false, default: '0' },
    { name: 'purchased_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_shop_purchases_user_date', columns: ['user_id', 'purchase_date'] },
  ],
  rls: [
    { name: 'shop_purchases_select_own', operation: 'SELECT', using: 'auth.uid() = user_id' },
    { name: 'shop_purchases_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
  ],
};

// ============================================================================
// CLANS
// ============================================================================

const clansSchema: TableSchema = {
  name: 'clans',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'name', type: 'text', nullable: false, unique: true },
    { name: 'tag', type: 'text', nullable: false, unique: true },
    { name: 'description', type: 'text', nullable: true },
    { name: 'leader_id', type: 'uuid', nullable: false },
    { name: 'color', type: 'text', nullable: false, default: "'#00f5ff'" },
    { name: 'banner_index', type: 'integer', nullable: false, default: '0' },
    { name: 'member_count', type: 'integer', nullable: false, default: '1' },
    { name: 'total_stage', type: 'bigint', nullable: false, default: '0' },
    { name: 'total_overclocks', type: 'bigint', nullable: false, default: '0' },
    { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_clans_leader_id', columns: ['leader_id'] },
    { name: 'idx_clans_total_stage', columns: ['total_stage'] },
  ],
  rls: [
    { name: 'clans_select_all', operation: 'SELECT', using: 'true' },
    { name: 'clans_insert_auth', operation: 'INSERT', withCheck: 'auth.uid() = leader_id' },
    { name: 'clans_update_leader', operation: 'UPDATE', using: 'auth.uid() = leader_id' },
    { name: 'clans_delete_leader', operation: 'DELETE', using: 'auth.uid() = leader_id' },
  ],
};

const clanMembersSchema: TableSchema = {
  name: 'clan_members',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'clan_id', type: 'uuid', nullable: false, references: { table: 'clans', column: 'id', onDelete: 'CASCADE' } },
    { name: 'user_id', type: 'uuid', nullable: false, unique: true },
    { name: 'handle', type: 'text', nullable: false },
    { name: 'role', type: 'text', nullable: false, default: "'member'", check: "role IN ('leader', 'officer', 'member')" },
    { name: 'highest_stage', type: 'integer', nullable: false, default: '1' },
    { name: 'max_stage', type: 'integer', nullable: false, default: '1' },
    { name: 'overclock_count', type: 'integer', nullable: false, default: '0' },
    { name: 'joined_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_clan_members_clan_id', columns: ['clan_id'] },
    { name: 'idx_clan_members_user_id', columns: ['user_id'] },
  ],
  rls: [
    { name: 'clan_members_select_all', operation: 'SELECT', using: 'true' },
    { name: 'clan_members_insert_own', operation: 'INSERT', withCheck: 'auth.uid() = user_id' },
    { name: 'clan_members_update_own', operation: 'UPDATE', using: 'auth.uid() = user_id' },
    { name: 'clan_members_delete_own', operation: 'DELETE', using: 'auth.uid() = user_id' },
  ],
};

const clanInvitesSchema: TableSchema = {
  name: 'clan_invites',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'clan_id', type: 'uuid', nullable: false, references: { table: 'clans', column: 'id', onDelete: 'CASCADE' } },
    { name: 'inviter_id', type: 'uuid', nullable: false },
    { name: 'invitee_id', type: 'uuid', nullable: false },
    { name: 'status', type: 'text', nullable: false, default: "'pending'", check: "status IN ('pending', 'accepted', 'declined')" },
    { name: 'created_at', type: 'timestamptz', nullable: false, default: 'now()' },
  ],
  indexes: [
    { name: 'idx_clan_invites_invitee', columns: ['invitee_id', 'status'] },
  ],
  rls: [
    { name: 'clan_invites_select_involved', operation: 'SELECT', using: 'auth.uid() = inviter_id OR auth.uid() = invitee_id' },
    { name: 'clan_invites_insert_auth', operation: 'INSERT', withCheck: 'auth.uid() = inviter_id' },
    { name: 'clan_invites_update_invitee', operation: 'UPDATE', using: 'auth.uid() = invitee_id' },
  ],
};

// ============================================================================
// REGISTER ALL SCHEMAS
// ============================================================================

export function registerAllSchemas(): void {
  // Core game
  schemaManager.register(leaderboardSchema);
  schemaManager.register(userPresenceSchema);
  
  // Daily ops & achievements
  schemaManager.register(dailyChallengesSchema);
  schemaManager.register(achievementsSchema);
  schemaManager.register(achievementStatsSchema);
  
  // Tournaments
  schemaManager.register(tournamentsSchema);
  schemaManager.register(tournamentEntriesSchema);
  
  // Shop
  schemaManager.register(shopPurchasesSchema);
  
  // Clans
  schemaManager.register(clansSchema);
  schemaManager.register(clanMembersSchema);
  schemaManager.register(clanInvitesSchema);
}

// Export schemas for reference
export const SCHEMAS = {
  leaderboard: leaderboardSchema,
  userPresence: userPresenceSchema,
  dailyChallenges: dailyChallengesSchema,
  achievements: achievementsSchema,
  achievementStats: achievementStatsSchema,
  tournaments: tournamentsSchema,
  tournamentEntries: tournamentEntriesSchema,
  shopPurchases: shopPurchasesSchema,
  clans: clansSchema,
  clanMembers: clanMembersSchema,
  clanInvites: clanInvitesSchema,
};
