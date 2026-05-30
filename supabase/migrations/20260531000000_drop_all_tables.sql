/*
  # OVERCLOCK.EXE — Drop All Tables Script
  
  This script safely drops all game tables in the correct dependency order.
  Use this to reset the database to a clean state.
  
  WARNING: This will delete all game data. Use with caution.
*/

-- Drop all tables in dependency order (foreign keys first, then referenced tables)
DROP TABLE IF EXISTS tournament_entries CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS clan_invites CASCADE;
DROP TABLE IF EXISTS clan_members CASCADE;
DROP TABLE IF EXISTS clans CASCADE;
DROP TABLE IF EXISTS daily_challenges CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS achievement_stats CASCADE;
DROP TABLE IF EXISTS shop_purchases CASCADE;
DROP TABLE IF EXISTS set_items CASCADE;
DROP TABLE IF EXISTS player_saves CASCADE;
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS user_presence CASCADE;

-- Drop any indexes that might still exist
DROP INDEX IF EXISTS idx_leaderboard_user_id CASCADE;
DROP INDEX IF EXISTS idx_leaderboard_highest_stage CASCADE;
DROP INDEX IF EXISTS idx_user_presence_last_seen CASCADE;
DROP INDEX IF EXISTS player_saves_user_id_idx CASCADE;
DROP INDEX IF EXISTS idx_daily_challenges_user_date CASCADE;
DROP INDEX IF EXISTS idx_tournament_entries_tournament_id CASCADE;
DROP INDEX IF EXISTS idx_tournament_entries_user_id CASCADE;
DROP INDEX IF EXISTS idx_tournaments_status CASCADE;
DROP INDEX IF EXISTS idx_tournaments_starts_at CASCADE;
DROP INDEX IF EXISTS idx_tournaments_join_closes_at CASCADE;

-- Done
SELECT 'All OVERCLOCK tables dropped successfully' as status;
