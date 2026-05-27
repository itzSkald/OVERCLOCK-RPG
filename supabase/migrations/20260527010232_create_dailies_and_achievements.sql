/*
  # Create Daily Challenges and Achievements Tables

  1. New Tables
    - `daily_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `challenge_date` (date) - the day this challenge is for
      - `challenge_type` (text) - type of challenge (kill_enemies, earn_gold, reach_stage, use_skills, defeat_bosses)
      - `target_value` (integer) - target amount to complete
      - `current_value` (integer, default 0) - current progress
      - `completed` (boolean, default false)
      - `reward_gold` (integer) - gold reward on completion
      - `created_at` (timestamptz)
    - `achievements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `achievement_id` (text) - unique achievement identifier
      - `unlocked_at` (timestamptz) - when the achievement was earned
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data

  3. Notes
    - Daily challenges are generated per-user per-day (up to 3 per day)
    - Achievements are permanent one-time unlocks
    - challenge_date uses UTC date for consistency across timezones
*/

-- Daily Challenges table
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

-- Index for fast lookup by user and date
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user_date
  ON daily_challenges(user_id, challenge_date);

-- Achievements table
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

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_achievements_user
  ON achievements(user_id);
