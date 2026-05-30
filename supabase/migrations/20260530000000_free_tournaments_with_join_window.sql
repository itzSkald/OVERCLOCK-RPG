/*
  # Free tournaments with 4 hour duration and 10 minute join window

  1. Updates to existing tournaments:
    - Set entry_fee_diamonds to 0 (free to join)
    - Update duration to 4 hours total
    - First 10 minutes is join window, then entrance closes

  2. Add join_closes_at column:
    - New column to track when tournament stops accepting new players
*/

-- Add join_closes_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tournaments' AND column_name='join_closes_at') THEN
    ALTER TABLE tournaments ADD COLUMN join_closes_at timestamptz;
  END IF;
END $$;

-- Update all existing tournaments to be free and have proper timing
UPDATE tournaments
SET 
  entry_fee_diamonds = 0,
  ends_at = starts_at + interval '4 hours',
  join_closes_at = starts_at + interval '10 minutes'
WHERE entry_fee_diamonds > 0 OR join_closes_at IS NULL;

-- Delete old seeded tournaments and create fresh ones with correct timing
DELETE FROM tournaments WHERE template_name IN ('GENESIS CIRCUIT', 'FROSTBYTE GAUNTLET', 'NULL_VOID TRIALS');

-- Seed new free tournaments with 4-hour duration and 10-minute join window
INSERT INTO tournaments (name, template_name, bracket_number, starts_at, ends_at, join_closes_at, prize_diamonds, status, entry_fee_diamonds, player_cap)
VALUES
  -- Active tournaments (started now)
  ('GENESIS CIRCUIT #1', 'GENESIS CIRCUIT', 1, now(), now() + interval '4 hours', now() + interval '10 minutes', 100, 'active', 0, 32),
  ('GENESIS CIRCUIT #2', 'GENESIS CIRCUIT', 2, now(), now() + interval '4 hours', now() + interval '10 minutes', 200, 'active', 0, 64),
  
  -- Upcoming tournaments (staggered starts)
  ('GENESIS CIRCUIT #3', 'GENESIS CIRCUIT', 3, now() + interval '4 hours', now() + interval '8 hours', now() + interval '4 hours 10 minutes', 100, 'upcoming', 0, 32),
  ('GENESIS CIRCUIT #4', 'GENESIS CIRCUIT', 4, now() + interval '4 hours', now() + interval '8 hours', now() + interval '4 hours 10 minutes', 200, 'upcoming', 0, 64),
  ('GENESIS CIRCUIT #5', 'GENESIS CIRCUIT', 5, now() + interval '8 hours', now() + interval '12 hours', now() + interval '8 hours 10 minutes', 100, 'upcoming', 0, 32),
  
  -- Frostbyte tournaments
  ('FROSTBYTE GAUNTLET #1', 'FROSTBYTE GAUNTLET', 1, now() + interval '2 hours', now() + interval '6 hours', now() + interval '2 hours 10 minutes', 350, 'upcoming', 0, 32),
  ('FROSTBYTE GAUNTLET #2', 'FROSTBYTE GAUNTLET', 2, now() + interval '6 hours', now() + interval '10 hours', now() + interval '6 hours 10 minutes', 350, 'upcoming', 0, 32),
  
  -- Null Void tournaments (higher prize, smaller cap)
  ('NULL_VOID TRIALS #1', 'NULL_VOID TRIALS', 1, now() + interval '1 hour', now() + interval '5 hours', now() + interval '1 hour 10 minutes', 500, 'upcoming', 0, 16),
  ('NULL_VOID TRIALS #2', 'NULL_VOID TRIALS', 2, now() + interval '5 hours', now() + interval '9 hours', now() + interval '5 hours 10 minutes', 500, 'upcoming', 0, 16)
ON CONFLICT DO NOTHING;

-- Index for join window queries
CREATE INDEX IF NOT EXISTS idx_tournaments_join_closes_at ON tournaments(join_closes_at);
