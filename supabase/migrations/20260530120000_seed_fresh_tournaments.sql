-- Seed fresh tournaments with staggered start times
-- Tournaments are 4 hours long, with 10-minute join windows
-- Free to join (entry_fee_diamonds = 0)

-- Clear old ended tournaments to make room for fresh ones
DELETE FROM tournaments WHERE status = 'ended' OR ends_at < now();

-- Delete old seeded tournaments so we can reseed fresh ones
DELETE FROM tournaments WHERE template_name IN ('GENESIS CIRCUIT', 'FROSTBYTE GAUNTLET', 'NULL_VOID TRIALS');

-- Seed new active and upcoming tournaments with current timing
INSERT INTO tournaments (name, template_name, bracket_number, starts_at, ends_at, join_closes_at, prize_diamonds, status, entry_fee_diamonds, player_cap)
VALUES
  -- Active tournaments (started now or within last 5 minutes)
  ('GENESIS CIRCUIT #1', 'GENESIS CIRCUIT', 1, now() - interval '2 minutes', now() + interval '3 hours 58 minutes', now() + interval '8 minutes', 100, 'active', 0, 32),
  ('GENESIS CIRCUIT #2', 'GENESIS CIRCUIT', 2, now() - interval '1 minute', now() + interval '3 hours 59 minutes', now() + interval '9 minutes', 200, 'active', 0, 64),
  
  -- Upcoming tournaments (staggered starts over next 12 hours)
  ('GENESIS CIRCUIT #3', 'GENESIS CIRCUIT', 3, now() + interval '30 minutes', now() + interval '4 hours 30 minutes', now() + interval '40 minutes', 100, 'upcoming', 0, 32),
  ('GENESIS CIRCUIT #4', 'GENESIS CIRCUIT', 4, now() + interval '1 hour', now() + interval '5 hours', now() + interval '1 hour 10 minutes', 200, 'upcoming', 0, 64),
  ('GENESIS CIRCUIT #5', 'GENESIS CIRCUIT', 5, now() + interval '2 hours', now() + interval '6 hours', now() + interval '2 hours 10 minutes', 100, 'upcoming', 0, 32),
  
  ('FROSTBYTE GAUNTLET #1', 'FROSTBYTE GAUNTLET', 1, now() + interval '3 hours', now() + interval '7 hours', now() + interval '3 hours 10 minutes', 350, 'upcoming', 0, 32),
  ('FROSTBYTE GAUNTLET #2', 'FROSTBYTE GAUNTLET', 2, now() + interval '4 hours', now() + interval '8 hours', now() + interval '4 hours 10 minutes', 350, 'upcoming', 0, 32),
  
  ('NULL_VOID TRIALS #1', 'NULL_VOID TRIALS', 1, now() + interval '5 hours', now() + interval '9 hours', now() + interval '5 hours 10 minutes', 500, 'upcoming', 0, 16),
  ('NULL_VOID TRIALS #2', 'NULL_VOID TRIALS', 2, now() + interval '8 hours', now() + interval '12 hours', now() + interval '8 hours 10 minutes', 500, 'upcoming', 0, 16)
ON CONFLICT DO NOTHING;

-- Ensure index for join window queries
CREATE INDEX IF NOT EXISTS idx_tournaments_join_closes_at ON tournaments(join_closes_at);
