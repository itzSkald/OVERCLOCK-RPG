# Overclock — Multiplayer RPG Implementation Plan

## Current State Summary

**Implemented:** Tap damage, idle DPS (5 components), enemy HP/bosses, stage progression, zones (cosmetic), overclock prestige (3-branch perk tree, 5 tiers), hardware items (procedural loot + 4 equipment slots), motherboard tier upgrades, auth (email/password), cloud save, offline progress, leaderboard table (writes data but no UI).

---

## Checkpoints

Each phase has a "done when" gate. The build must pass (`npm run build`) after every checkpoint.

| Phase | Checkpoint | Done When |
|-------|-----------|-----------|
| 1 | Leaderboard + Presence | Leaderboard modal opens, shows ranked players, online count in HUD |
| 2 | Skills + Enemy Variety | Skill bar renders, skills fire with cooldowns, bosses have phases |
| 3 | Dailies + Achievements | 3 daily challenges generate, progress tracks, achievements unlock |
| 4 | Guilds + Raids | Guild CRUD works, chat sends, raid boss HP syncs across clients |
| 5 | Crafting + Shop | Fuse/Upgrade/Socket operations succeed, shop displays rotating items |
| 6 | PvP + Seasons | Challenge flow works end-to-end, season rankings persist |
| 7 | Polish + QoL | Settings modal works, tutorial fires on first login, toasts display |

---

## Phase 1 — Leaderboard + Real-Time Presence

### Leaderboard UI
- Create `LeaderboardPlugin` subscribing to Supabase Realtime on `leaderboard` table for live updates
- Create `LeaderboardScreen` component (modal overlay) with scrollable ranked table:
  - Columns: rank, handle, highest stage, overclock count, total damage, online indicator
  - Highlight current player's row; show rank delta arrows
- Add launcher button in right sidebar (desktop) and bottom tab bar (mobile)

### Real-Time Presence
- Supabase Realtime presence channel (`online_players`)
- Track connected users, show count in CyberHUD (e.g., "12 ONLINE")
- Online dot indicator next to players in leaderboard

---

## Phase 2 — Active Skills + Enemy Variety

### Skills / Abilities System
- Add `skills` field to GameState: `Record<string, SkillDef>` with cooldown, duration, effect
- Create `SkillPlugin` with 5 active abilities unlocked by overclock tier:
  - **SURGE**: 10x tap damage for 5s, 60s cooldown (tier 1)
  - **OVERCLOCK_PULSE**: 2x idle DPS for 30s, 120s cooldown (tier 2)
  - **GOLD_RUSH**: 3x gold for 15s, 90s cooldown (tier 3)
  - **FIREWALL**: freeze boss timer 10s, 180s cooldown (tier 4)
  - **CHAIN_HACK**: each tap hits 3x for 8s, 150s cooldown (tier 5)
- Skill bar UI: row of icon buttons above tap area with cooldown sweep animation

### Enemy Variety + Boss Phases
- Expand `Enemy` type with: `resistances`, `abilities`, `enemyType` (normal, elite, boss, raid_boss)
- Create `EnemyAbilityPlugin` assigning random abilities to bosses:
  - **SHIELD**: blocks 50% damage for 5s, drops for 5s (visual cue)
  - **ENRAGE**: at 25% HP, boss timer speeds 2x
  - **REGEN**: heals 5% HP every 3s unless combo > 10
  - **REFLECT**: 20% chance tap does zero (need skill to bypass)
- Elite enemies: 10% spawn chance on non-boss stages, 3x HP, guaranteed item drop
- Visual indicators: shield aura, enrage glow, regen pulses

---

## Phase 3 — Dailies + Achievements + Second Currency

### Daily Challenges
- DB table: `daily_challenges` (id, user_id, challenge_type, target, progress, completed, reward_claimed, expires_at)
- Create `ChallengePlugin` generating 3 daily challenges on login:
  - "Deal 100K damage", "Clear 20 stages", "Earn 50K gold", "Equip 3 items", "Defeat 5 bosses"
- Rewards: data shards (premium currency), bonus OCT, rare item drops

### Achievement System
- DB table: `achievements` (user_id, achievement_id, unlocked_at)
- Create `AchievementPlugin` tracking ~30 milestones:
  - First boss kill, reach stage 50, first overclock, equip full loadout, join guild, max a perk branch, etc.
- Rewards: titles (displayed on leaderboard), cosmetic borders, one-time currency grants

### Second Currency (Data Shards)
- Add `dataShards` to GameState
- Earned from: dailies, raids, achievements, milestones, PvP wins
- Cannot be purchased with real money — earned only through play

### Challenge Screen
- Modal with daily challenge cards (progress bars, claim buttons) + achievement gallery grid

---

## Phase 4 — Guilds + Raid System

### Guild System
- DB tables:
  - `guilds` (id, name, tag, leader_id, created_at, member_count, level, xp)
  - `guild_members` (guild_id, user_id, role, joined_at, contribution)
  - `guild_messages` (guild_id, user_id, content, created_at)
- Create `GuildPlugin`:
  - Methods: `createGuild()`, `joinGuild()`, `leaveGuild()`, `listGuilds()`
  - Auto-contribution: percentage of gold earned and damage dealt adds to guild XP
  - Guild levels unlock shared passive bonuses (gold rate, DPS) applied as modifiers
- Create `GuildScreen` modal with tabs: MEMBERS, CHAT, BOSS, SETTINGS
- Guild chat via Supabase Realtime broadcast channel (guild-scoped)

### Guild Boss / Raid System
- DB tables:
  - `guild_raids` (guild_id, boss_id, boss_hp, boss_max_hp, status, started_at, expires_at, rewards_claimed)
  - `raid_contributions` (raid_id, user_id, damage_dealt, last_hit_at)
- Create `RaidPlugin`:
  - Shared guild boss: 200x normal HP, 24-hour timer
  - All guild members tap against same HP pool (Supabase Realtime for live HP sync)
  - Contribution tracking per player; rewards proportional (OCT, data shards, rare items)
- Raid Boss UI: special full-screen battle mode with shared HP bar, live damage feed, countdown

---

## Phase 5 — Economy Depth (Crafting + Shop)

### Item Crafting / Upgrade
- Create `CraftingPlugin` with three operations:
  - **FUSE**: combine 3 same-rarity items into 1 higher-rarity (3 Common = 1 Rare)
  - **UPGRADE**: spend gold + 1 duplicate-slot item to add +1 tier to equipped item
  - **SOCKET**: spend data shards to add bonus modifier to any Legendary item
- Add crafting bench section to MotherboardScreen (new tab)
- Visual: items consumed dissolve with particle effect; new item materializes with glow

### Shop / Vendor
- Create `ShopPlugin` with rotating inventory:
  - **Consumables**: XP boosters (2x 30 min), gold doublers, instant boss skips
  - **Rerolls**: reroll item stats for data shards
  - **Cosmetics**: enemy skins, damage number colors, zone themes
- Create `ShopScreen` modal with tabs: CONSUMABLES, REROLLS, COSMETICS
- Shop refreshes every 4 hours with random selection

---

## Phase 6 — PvP + Seasons

### PvP Challenge System
- DB table: `pvp_challenges` (id, challenger_id, defender_id, status, challenger_score, defender_score, created_at, expires_at)
- Create `PvPPlugin`:
  - Challenge another player to "speed clear" — race from stage 1 to stage N
  - Asynchronous: challenger sets time, defender has 24 hours to attempt
  - Rewards: OCT bonus, rank points, exclusive PvP cosmetics
- PvP UI: challenge button on leaderboard rows, active challenges list, result screen

### Seasons + Ranked Resets
- DB tables:
  - `seasons` (id, name, start_date, end_date, rewards)
  - `season_rankings` (season_id, user_id, rank_points, tier)
- Create `SeasonPlugin`:
  - Reset competitive rankings every 2 weeks
  - Season tiers: Bronze / Silver / Gold / Diamond / Overclock
  - End-of-season rewards: exclusive items, data shards, cosmetic titles
- Season pass: track objectives for incremental rewards (free track only)

---

## Phase 7 — Polish + QoL (Parallel with any phase)

### Settings Screen
- Create `SettingsScreen` modal:
  - Audio toggle (for future SFX)
  - Damage number toggle
  - Auto-progress toggle
  - Theme selection
  - Account management (change handle, sign out)
  - Statistics tab: lifetime gold, total taps, bosses defeated, items found, time played

### Tutorial / Onboarding
- Create `TutorialPlugin` triggered on first login:
  - Guided overlay highlighting: tap zone, gold display, components, overclock at stage 10
  - Progressive disclosure — each tip triggers at the right moment

### Inventory QoL
- Sort/filter by slot, rarity, tier
- Bulk-sell (convert items to gold)
- Item comparison tooltip (vs currently equipped)

### Notification / Event Feed
- Create `NotificationPlugin` with toast queue:
  - Events: guild boss spawned, friend passed your stage, daily reset, season ending, PvP challenge
  - Toast UI: slides from top-right (desktop) / top-center (mobile), auto-dismiss 4s
- Event feed in guild screen showing recent member activity

---

## Architecture Notes

- Every feature is a self-contained plugin (no core engine changes needed beyond GameState fields + event types)
- All persistence through Supabase via `engine.storage`
- Multiplayer sync uses Supabase Realtime channels for: presence, guild chat, raid HP
- No new npm dependencies required (Supabase client already handles Realtime)
- Follow existing patterns: `stateKeys`, `defaultState`, fire-and-forget network in `init()`

## Estimated Effort

| Phase | Scope | Estimate |
|-------|-------|----------|
| 1. Leaderboard + Presence | 1 plugin, 1 screen, HUD update | 1-2 days |
| 2. Skills + Enemy Variety | 2 plugins, skill bar UI, enemy visuals | 3-4 days |
| 3. Dailies + Achievements | 2 plugins, 1 screen, 2 DB tables | 2-3 days |
| 4. Guilds + Raids | 2 plugins, 1 screen, 5 DB tables, Realtime | 5-7 days |
| 5. Crafting + Shop | 2 plugins, 2 screens/tabs | 3-4 days |
| 6. PvP + Seasons | 2 plugins, 2 screens, 3 DB tables | 4-5 days |
| 7. Polish + QoL | 2 plugins, 1 screen, UI enhancements | 2-3 days |
| **Total** | | **20-28 days** |
