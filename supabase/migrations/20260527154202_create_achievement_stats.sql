/*
  # Create Achievement Stats Table

  1. New Tables
    - `achievement_stats`
      - `user_id` (uuid, primary key, references auth.users) - one row per user
      - `total_kills` (integer) - cumulative enemy kills across all sessions
      - `total_boss_kills` (integer) - cumulative boss kills across all sessions
      - `total_skills_used` (integer) - cumulative skill activations across all sessions
      - `updated_at` (timestamptz) - last time stats were updated

  2. Security
    - Enable RLS on achievement_stats
    - Authenticated users can only read/write their own stats row

  3. Notes
    - One row per user, upserted on conflict with user_id
    - Counters are additive — we always write current_session_total + db_value
    - This table exists purely to persist context counters for achievement checks
      that can't be derived from GameState alone (kill counts, skill uses)
*/

CREATE TABLE IF NOT EXISTS achievement_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) NOT NULL,
  total_kills integer NOT NULL DEFAULT 0,
  total_boss_kills integer NOT NULL DEFAULT 0,
  total_skills_used integer NOT NULL DEFAULT 0,
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
