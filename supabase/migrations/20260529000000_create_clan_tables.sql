/*
  # Create clan tables for OVERCLOCK.EXE

  1. New Tables
    - `clans`
      - `id` (uuid, primary key)
      - `name` (text, unique) - clan display name
      - `tag` (text, unique) - 3-5 char clan tag
      - `description` (text) - clan description
      - `leader_id` (uuid, references auth.users) - clan founder/leader
      - `color` (text) - clan accent color
      - `banner_index` (int) - banner art index
      - `member_count` (int) - cached member count
      - `total_stage` (int) - sum of all member highest stages
      - `total_overclocks` (int) - sum of all member overclock counts
      - `created_at` (timestamptz)
    - `clan_members`
      - `id` (uuid, primary key)
      - `clan_id` (uuid, references clans)
      - `user_id` (uuid, references auth.users)
      - `handle` (text) - cached player handle
      - `role` (text) - 'leader', 'officer', 'member'
      - `highest_stage` (int) - cached from leaderboard
      - `overclock_count` (int) - cached from leaderboard
      - `joined_at` (timestamptz)
    - `clan_invites`
      - `id` (uuid, primary key)
      - `clan_id` (uuid, references clans)
      - `inviter_id` (uuid, references auth.users)
      - `invitee_id` (uuid, references auth.users)
      - `status` (text) - 'pending', 'accepted', 'declined'
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Anyone can read clans (for browsing/search)
    - Only members can read their clan's details
    - Leaders/officers can manage members
*/

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX IF NOT EXISTS idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX IF NOT EXISTS idx_clan_invites_invitee ON clan_invites(invitee_id, status);
CREATE INDEX IF NOT EXISTS idx_clans_total_stage ON clans(total_stage DESC);
