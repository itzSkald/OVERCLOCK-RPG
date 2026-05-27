/*
  # Create shop purchases and tournament tables

  1. New Tables
    - `shop_purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `item_id` (text) — catalog item id
      - `currency` (text) — 'oct' or 'diamond'
      - `price` (int) — amount spent
      - `purchased_at` (timestamptz)
    - `tournaments`
      - `id` (uuid, primary key)
      - `name` (text)
      - `starts_at` (timestamptz)
      - `ends_at` (timestamptz)
      - `prize_diamonds` (int) — total diamond pool
      - `status` (text) — 'upcoming', 'active', 'ended'
      - `created_at` (timestamptz)
    - `tournament_entries`
      - `id` (uuid, primary key)
      - `tournament_id` (uuid, references tournaments)
      - `user_id` (uuid, references auth.users)
      - `handle` (text)
      - `score` (int) — highest stage reached during tournament
      - `rank` (int, nullable) — set when tournament ends
      - `joined_at` (timestamptz)

  2. Security
    - RLS enabled on all three tables
    - shop_purchases: users can read/insert their own rows
    - tournaments: all authenticated users can read; no user writes
    - tournament_entries: users can read all entries (leaderboard), insert/update their own
*/

-- Shop purchases
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

-- Tournaments (managed server-side / manually seeded)
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  prize_diamonds int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tournaments"
  ON tournaments FOR SELECT
  TO authenticated
  USING (true);

-- Tournament entries
CREATE TABLE IF NOT EXISTS tournament_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  handle text NOT NULL DEFAULT '',
  score int NOT NULL DEFAULT 0,
  rank int,
  joined_at timestamptz DEFAULT now(),
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

-- Index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_tournament_entries_tournament_score
  ON tournament_entries(tournament_id, score DESC);

-- Seed the first tournament (starts now, lasts 7 days)
INSERT INTO tournaments (name, starts_at, ends_at, prize_diamonds, status)
VALUES (
  'GENESIS CIRCUIT — Week 1',
  now(),
  now() + interval '7 days',
  500,
  'active'
)
ON CONFLICT DO NOTHING;
