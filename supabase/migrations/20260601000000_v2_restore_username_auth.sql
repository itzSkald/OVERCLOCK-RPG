/*
  # OVERCLOCK.EXE — V2: Restore schema + username-based auth

  Applies after the V1 drop migration. Re-creates all game tables with:
  - profiles.handle is UNIQUE (required for username-based login lookup)
  - profiles.email column added (stores recovery email, used to resolve
    handle → email for password sign-in without exposing auth.users)
  - RLS policy allowing anon SELECT on profiles (so handle→email lookup
    works before the user is authenticated)

  All other tables are identical to V1.
*/

-- ============================================
-- PROFILES (with unique handle + email column)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle       text        NOT NULL UNIQUE,
  email        text        NOT NULL DEFAULT '',
  avatar_index integer     NOT NULL DEFAULT 0,
  max_stage    integer     NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile"            ON profiles;
DROP POLICY IF EXISTS "Anyone can read handles for login"     ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"          ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"          ON profiles;

-- Authenticated users can read their own full profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Anon (pre-login) can read handle + email for the username→email lookup
CREATE POLICY "Anyone can read handles for login"
  ON profiles FOR SELECT TO anon
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PLAYER SAVES
-- ============================================
CREATE TABLE IF NOT EXISTS player_saves (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  save_data      jsonb   NOT NULL DEFAULT '{}',
  schema_version integer NOT NULL DEFAULT 1,
  updated_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS player_saves_user_id_idx ON player_saves(user_id);

ALTER TABLE player_saves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own save"   ON player_saves;
DROP POLICY IF EXISTS "Users can insert own save" ON player_saves;
DROP POLICY IF EXISTS "Users can update own save" ON player_saves;

CREATE POLICY "Users can read own save"
  ON player_saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own save"
  ON player_saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own save"
  ON player_saves FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LEADERBOARD
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle         text    NOT NULL,
  highest_stage  integer NOT NULL DEFAULT 1,
  total_damage   bigint  NOT NULL DEFAULT 0,
  overclock_count integer NOT NULL DEFAULT 0,
  updated_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_user_id       ON leaderboard(user_id);
CREATE INDEX        IF NOT EXISTS idx_leaderboard_highest_stage ON leaderboard(highest_stage DESC);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read leaderboard"             ON leaderboard;
DROP POLICY IF EXISTS "Users can insert own leaderboard entry"  ON leaderboard;
DROP POLICY IF EXISTS "Users can update own leaderboard entry"  ON leaderboard;

CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can insert own leaderboard entry"
  ON leaderboard FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leaderboard entry"
  ON leaderboard FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DAILY CHALLENGES
-- ============================================
CREATE TABLE IF NOT EXISTS daily_challenges (
  id             uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date date  NOT NULL DEFAULT CURRENT_DATE,
  completed      boolean NOT NULL DEFAULT false,
  progress       jsonb   NOT NULL DEFAULT '{}',
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own daily challenges"   ON daily_challenges;
DROP POLICY IF EXISTS "Users can insert own daily challenges" ON daily_challenges;
DROP POLICY IF EXISTS "Users can update own daily challenges" ON daily_challenges;

CREATE POLICY "Users can read own daily challenges"
  ON daily_challenges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily challenges"
  ON daily_challenges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily challenges"
  ON daily_challenges FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ACHIEVEMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  unlocked_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_user_achievement ON achievements(user_id, achievement_id);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own achievements"   ON achievements;
DROP POLICY IF EXISTS "Users can insert own achievements" ON achievements;

CREATE POLICY "Users can read own achievements"
  ON achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements"
  ON achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ACHIEVEMENT STATS
-- ============================================
CREATE TABLE IF NOT EXISTS achievement_stats (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stat_key   text    NOT NULL,
  stat_value numeric NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievement_stats_user_key ON achievement_stats(user_id, stat_key);

ALTER TABLE achievement_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own achievement stats"   ON achievement_stats;
DROP POLICY IF EXISTS "Users can insert own achievement stats" ON achievement_stats;
DROP POLICY IF EXISTS "Users can update own achievement stats" ON achievement_stats;

CREATE POLICY "Users can read own achievement stats"
  ON achievement_stats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievement stats"
  ON achievement_stats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own achievement stats"
  ON achievement_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SHOP PURCHASES
-- ============================================
CREATE TABLE IF NOT EXISTS shop_purchases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id      text NOT NULL,
  purchased_at timestamptz DEFAULT now()
);

ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own shop purchases"   ON shop_purchases;
DROP POLICY IF EXISTS "Users can insert own shop purchases" ON shop_purchases;

CREATE POLICY "Users can read own shop purchases"
  ON shop_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shop purchases"
  ON shop_purchases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- SET ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS set_items (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid  NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_data   jsonb NOT NULL DEFAULT '{}',
  acquired_at timestamptz DEFAULT now()
);

ALTER TABLE set_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own set items"   ON set_items;
DROP POLICY IF EXISTS "Users can insert own set items" ON set_items;

CREATE POLICY "Users can read own set items"
  ON set_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own set items"
  ON set_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TOURNAMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS tournaments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
  starts_at       timestamptz NOT NULL,
  ends_at         timestamptz NOT NULL,
  join_closes_at  timestamptz NOT NULL,
  max_stage       integer NOT NULL DEFAULT 999999,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status        ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at     ON tournaments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tournaments_join_closes_at ON tournaments(join_closes_at);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read tournaments" ON tournaments;

CREATE POLICY "Anyone can read tournaments"
  ON tournaments FOR SELECT TO authenticated, anon USING (true);

-- ============================================
-- TOURNAMENT ENTRIES
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_entries (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid    NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle        text    NOT NULL,
  score         integer NOT NULL DEFAULT 0,
  joined_at     timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_entries_tournament_user ON tournament_entries(tournament_id, user_id);
CREATE INDEX        IF NOT EXISTS idx_tournament_entries_tournament_id   ON tournament_entries(tournament_id);
CREATE INDEX        IF NOT EXISTS idx_tournament_entries_user_id         ON tournament_entries(user_id);

ALTER TABLE tournament_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read tournament entries"       ON tournament_entries;
DROP POLICY IF EXISTS "Users can insert own tournament entry"    ON tournament_entries;
DROP POLICY IF EXISTS "Users can update own tournament entry"    ON tournament_entries;

CREATE POLICY "Anyone can read tournament entries"
  ON tournament_entries FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can insert own tournament entry"
  ON tournament_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tournament entry"
  ON tournament_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CLANS
-- ============================================
CREATE TABLE IF NOT EXISTS clans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  tag          text NOT NULL UNIQUE,
  owner_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  text,
  member_count integer NOT NULL DEFAULT 1,
  total_stage  bigint  NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE clans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read clans"          ON clans;
DROP POLICY IF EXISTS "Users can insert clans"         ON clans;
DROP POLICY IF EXISTS "Clan owner can update clan"     ON clans;

CREATE POLICY "Anyone can read clans"
  ON clans FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can insert clans"
  ON clans FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Clan owner can update clan"
  ON clans FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- CLAN MEMBERS
-- ============================================
CREATE TABLE IF NOT EXISTS clan_members (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id       uuid    NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handle        text    NOT NULL,
  role          text    NOT NULL DEFAULT 'member',
  highest_stage integer NOT NULL DEFAULT 1,
  joined_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clan_members_clan_user ON clan_members(clan_id, user_id);

ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read clan members"           ON clan_members;
DROP POLICY IF EXISTS "Users can insert own clan membership"   ON clan_members;
DROP POLICY IF EXISTS "Users can update own clan membership"   ON clan_members;
DROP POLICY IF EXISTS "Users can delete own clan membership"   ON clan_members;

CREATE POLICY "Anyone can read clan members"
  ON clan_members FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can insert own clan membership"
  ON clan_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clan membership"
  ON clan_members FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own clan membership"
  ON clan_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================
-- CLAN INVITES
-- ============================================
CREATE TABLE IF NOT EXISTS clan_invites (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id          uuid NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
  invited_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status           text NOT NULL DEFAULT 'pending',
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE clan_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own invites"   ON clan_invites;
DROP POLICY IF EXISTS "Users can insert clan invites" ON clan_invites;
DROP POLICY IF EXISTS "Users can update own invites" ON clan_invites;

CREATE POLICY "Users can read own invites"
  ON clan_invites FOR SELECT TO authenticated
  USING (auth.uid() = invited_user_id OR auth.uid() = invited_by);
CREATE POLICY "Users can insert clan invites"
  ON clan_invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "Users can update own invites"
  ON clan_invites FOR UPDATE TO authenticated
  USING (auth.uid() = invited_user_id) WITH CHECK (auth.uid() = invited_user_id);

-- ============================================
-- USER PRESENCE
-- ============================================
CREATE TABLE IF NOT EXISTS user_presence (
  user_id   uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle    text    NOT NULL,
  last_seen timestamptz DEFAULT now(),
  stage     integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read presence"      ON user_presence;
DROP POLICY IF EXISTS "Users can upsert own presence" ON user_presence;

CREATE POLICY "Anyone can read presence"
  ON user_presence FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users can upsert own presence"
  ON user_presence FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
