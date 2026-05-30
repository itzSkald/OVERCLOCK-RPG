/*
  # OVERCLOCK.EXE — V1 Complete Database Schema

  This is the consolidated initial migration for OVERCLOCK.EXE game.
  
  ## Tables
  1. Core Game: profiles, player_saves, leaderboard
  2. Daily Ops: daily_challenges, achievements
  3. Achievement Stats: achievement_stats
  4. Shop & Items: shop_purchases, set_items
  5. Tournaments: tournaments, tournament_entries
  6. Clans: clans, clan_members, clan_invites

  All tables have RLS enabled with appropriate policies for secure multi-tenant gameplay.
*/

-- ============================================
-- CORE GAME SCHEMA
-- ============================================

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL DEFAULT 'HACKER_' || floor(random() * 9999)::text,
  avatar_index integer NOT NULL DEFAULT 0,
  max_stage integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Player saves table (versioned game state)
CREATE TABLE IF NOT EXISTS player_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  save_data jsonb NOT NULL DEFAULT '{}',
  schema_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_saves_user_id_idx ON player_saves(user_id);

ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own save"
  ON player_saves FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own save"
  ON player_saves FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own save"
  ON player_saves FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard table (competitive display)
CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL DEFAULT '',
  highest_stage integer NOT NULL DEFAULT 1,
  overclock_count integer NOT NULL DEFAULT 0,
  total_damage numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_user_id_idx ON leaderboard(user_id);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own leaderboard entry"
  ON leaderboard FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard entry"
  ON leaderboard FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DAILY OPS & ACHIEVEMENTS
-- ============================================

-- Daily challenges table (resets once per day at midnight London time)
CREATE TABLE IF NOT EXISTS daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  challenge_date date NOT NULL DEFAULT CURRENT_DATE,
  challenge_type text NOT NULL,
  challenge_label text NOT NULL DEFAULT '',
  target_value integer NOT NULL DEFAULT 1,
  current_value integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  reward_gold integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily challenges"
  ON daily_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily challenges"
  ON daily_challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily challenges"
  ON daily_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily challenges"
  ON daily_challenges FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date
  ON daily_challenges(user_id, challenge_date);

-- Achievements table (one-time unlocks)
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  achievement_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements"
  ON achievements FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own achievements"
  ON achievements FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_achievements_user
  ON achievements(user_id);

-- Achievement stats table (persistent counters for achievements)
CREATE TABLE IF NOT EXISTS achievement_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) NOT NULL,
  total_kills integer NOT NULL DEFAULT 0,
  total_boss_kills integer NOT NULL DEFAULT 0,
  total_skills_used integer NOT NULL DEFAULT 0,
  total_gold_earned bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE achievement_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own achievement stats"
  ON achievement_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievement stats"
  ON achievement_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievement stats"
  ON achievement_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SHOP & ITEMS
-- ============================================

-- Shop purchases table
CREATE TABLE IF NOT EXISTS shop_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  item_id text NOT NULL,
  currency text NOT NULL DEFAULT 'oct',
  price int NOT NULL DEFAULT 0,
  purchased_at timestamptz DEFAULT now()
);

ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own purchases"
  ON shop_purchases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own purchases"
  ON shop_purchases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Set items table (Mythic set pieces)
CREATE TABLE IF NOT EXISTS set_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  set_id text NOT NULL,
  item_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  obtained_at timestamptz DEFAULT now()
);

ALTER TABLE set_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own set items"
  ON set_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own set items"
  ON set_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own set items"
  ON set_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- TOURNAMENTS (Free to join, 4 hours duration, 10 min join window)
-- ============================================

-- Tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  template_name text NOT NULL DEFAULT '',
  bracket_number integer NOT NULL DEFAULT 1,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  join_closes_at timestamptz,
  prize_diamonds integer NOT NULL DEFAULT 100,
  entry_fee_diamonds integer NOT NULL DEFAULT 0,
  player_cap integer NOT NULL DEFAULT 32,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_join_closes_at ON tournaments(join_closes_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_template_status ON tournaments(template_name, status);

-- Tournament entries table (leaderboard + tracking)
CREATE TABLE IF NOT EXISTS tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  handle text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  rank integer,
  start_max_stage integer NOT NULL DEFAULT 1,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tournament entries"
  ON tournament_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own tournament entries"
  ON tournament_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tournament entries"
  ON tournament_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament_score
  ON tournament_entries(tournament_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament_id ON tournament_entries(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_entries_user_id ON tournament_entries(user_id);

-- ============================================
-- CLANS
-- ============================================

-- Clans table
CREATE TABLE IF NOT EXISTS clans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tag text NOT NULL UNIQUE,
  description text DEFAULT '',
  leader_id uuid REFERENCES auth.users(id) NOT NULL,
  color text DEFAULT '#00f5ff',
  banner_index int DEFAULT 0,
  member_count int DEFAULT 1,
  total_stage int DEFAULT 0,
  total_overclocks int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT tag_length CHECK (char_length(tag) >= 2 AND char_length(tag) <= 5),
  CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 24)
);

ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clans"
  ON clans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leader can update own clan"
  ON clans FOR UPDATE
  TO authenticated
  USING (auth.uid() = leader_id)
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Authenticated users can create clans"
  ON clans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "Leader can delete own clan"
  ON clans FOR DELETE
  TO authenticated
  USING (auth.uid() = leader_id);

-- Clan members table
CREATE TABLE IF NOT EXISTS clan_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid REFERENCES clans(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  handle text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'member',
  highest_stage int DEFAULT 1,
  max_stage int DEFAULT 1,
  overclock_count int DEFAULT 0,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(clan_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('leader', 'officer', 'member'))
);

ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read clan members"
  ON clan_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert self as member"
  ON clan_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Leaders and officers can update members"
  ON clan_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_members.clan_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('leader', 'officer')
    )
    OR auth.uid() = user_id
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_members.clan_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('leader', 'officer')
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Members can delete self or leaders can remove"
  ON clan_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_members.clan_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'leader'
    )
  );

CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON clan_members(user_id);

-- Clan invites table
CREATE TABLE IF NOT EXISTS clan_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id uuid REFERENCES clans(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES auth.users(id) NOT NULL,
  invitee_id uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(clan_id, invitee_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'declined'))
);

ALTER TABLE clan_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invitees and clan members can read invites"
  ON clan_invites FOR SELECT
  TO authenticated
  USING (
    auth.uid() = invitee_id
    OR EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_invites.clan_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Officers and leaders can create invites"
  ON clan_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (
      SELECT 1 FROM clan_members cm
      WHERE cm.clan_id = clan_invites.clan_id
      AND cm.user_id = auth.uid()
      AND cm.role IN ('leader', 'officer')
    )
  );

CREATE POLICY "Invitees can update invite status"
  ON clan_invites FOR UPDATE
  TO authenticated
  USING (auth.uid() = invitee_id)
  WITH CHECK (auth.uid() = invitee_id);

CREATE POLICY "Inviters can delete pending invites"
  ON clan_invites FOR DELETE
  TO authenticated
  USING (
    auth.uid() = inviter_id
    OR auth.uid() = invitee_id
  );

CREATE INDEX IF NOT EXISTS idx_clan_invites_invitee ON clan_invites(invitee_id, status);

-- ============================================
-- SEED FRESH TOURNAMENTS
-- ============================================

-- Seed active and upcoming tournaments with current timing
INSERT INTO tournaments (name, template_name, bracket_number, starts_at, ends_at, join_closes_at, prize_diamonds, status, entry_fee_diamonds, player_cap)
VALUES
  -- Active tournaments (started now)
  ('GENESIS CIRCUIT #1', 'GENESIS CIRCUIT', 1, now(), now() + interval '4 hours', now() + interval '10 minutes', 100, 'active', 0, 32),
  ('GENESIS CIRCUIT #2', 'GENESIS CIRCUIT', 2, now(), now() + interval '4 hours', now() + interval '10 minutes', 200, 'active', 0, 64),
  
  -- Upcoming tournaments (staggered starts)
  ('GENESIS CIRCUIT #3', 'GENESIS CIRCUIT', 3, now() + interval '30 minutes', now() + interval '4 hours 30 minutes', now() + interval '40 minutes', 100, 'upcoming', 0, 32),
  ('GENESIS CIRCUIT #4', 'GENESIS CIRCUIT', 4, now() + interval '1 hour', now() + interval '5 hours', now() + interval '1 hour 10 minutes', 200, 'upcoming', 0, 64),
  ('GENESIS CIRCUIT #5', 'GENESIS CIRCUIT', 5, now() + interval '2 hours', now() + interval '6 hours', now() + interval '2 hours 10 minutes', 100, 'upcoming', 0, 32),
  
  ('FROSTBYTE GAUNTLET #1', 'FROSTBYTE GAUNTLET', 1, now() + interval '3 hours', now() + interval '7 hours', now() + interval '3 hours 10 minutes', 350, 'upcoming', 0, 32),
  ('FROSTBYTE GAUNTLET #2', 'FROSTBYTE GAUNTLET', 2, now() + interval '4 hours', now() + interval '8 hours', now() + interval '4 hours 10 minutes', 350, 'upcoming', 0, 32),
  
  ('NULL_VOID TRIALS #1', 'NULL_VOID TRIALS', 1, now() + interval '5 hours', now() + interval '9 hours', now() + interval '5 hours 10 minutes', 500, 'upcoming', 0, 16),
  ('NULL_VOID TRIALS #2', 'NULL_VOID TRIALS', 2, now() + interval '8 hours', now() + interval '12 hours', now() + interval '8 hours 10 minutes', 500, 'upcoming', 0, 16)
ON CONFLICT DO NOTHING;
