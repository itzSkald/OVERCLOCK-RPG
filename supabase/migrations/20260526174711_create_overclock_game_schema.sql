/*
  # OVERCLOCK.EXE - Game Schema

  ## Tables

  ### profiles
  - Linked to auth.users via id
  - Stores display handle and avatar choice

  ### player_saves
  - Per-user game state blob (versioned JSON)
  - Tracks component levels, gold, overclock count, stage progress

  ### leaderboard
  - Aggregated stats for competitive display
  - Highest stage, overclock count, total damage

  ## Security
  - RLS enabled on all tables
  - Players can only read/write their own rows
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle text NOT NULL DEFAULT 'HACKER_' || floor(random() * 9999)::text,
  avatar_index integer NOT NULL DEFAULT 0,
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
