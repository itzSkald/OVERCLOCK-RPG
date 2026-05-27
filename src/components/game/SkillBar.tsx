import React, { useEffect, useState } from 'react';
import { Zap, Cpu, Coins, Shield, Link, Wifi, Flame, Shuffle, Infinity } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { SkillPlugin } from '../../plugins/SkillPlugin';
import { BASE_SKILLS, BRANCH_SKILLS } from '../../plugins/SkillPlugin';
import { useGameState } from '../../hooks/useGameState';
import type { SkillDef, SkillId } from '../../engine/types';
import { Tooltip, TooltipLabel, TooltipText, TooltipStat } from './Tooltip';
import { isBranchSkillUnlocked, BRANCH_SKILL_UNLOCKS } from '../../plugins/OverclockPlugin';
import type { PerkBranch } from '../../plugins/OverclockPlugin';

interface SkillBarProps {
  engine: GameEngine;
}

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Cpu, Coins, Shield, Link, Wifi, Flame, Shuffle, Infinity,
};

const SKILL_ID_TO_BRANCH: Partial<Record<SkillId, PerkBranch>> = {
  static_discharge: 'VOLTAGE',
  signal_jam:       'SIGNAL',
  meltdown:         'THERMAL',
  entropy_burst:    'ENTROPY',
  quantum_echo:     'QUANTUM',
};

function SkillButton({ skill, engine, isBranch }: { skill: SkillDef; engine: GameEngine; isBranch?: boolean }) {
  const cooldowns    = useGameState(engine, s => s.skillCooldowns);
  const highestStage = useGameState(engine, s => s.highestStage);
  const upgrades     = useGameState(engine, s => s.overclockUpgrades ?? {});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const branch = SKILL_ID_TO_BRANCH[skill.id as SkillId];
  const cd = cooldowns[skill.id] ?? { readyAt: 0, activeUntil: 0 };

  // Determine lock state
  let isLocked: boolean;
  if (isBranch && branch) {
    isLocked = !isBranchSkillUnlocked(upgrades, branch);
  } else {
    isLocked = highestStage < skill.unlockStage;
  }

  const isActive       = cd.activeUntil > now;
  const isOnCooldown   = cd.readyAt > now && !isActive;
  const cdRemaining    = isOnCooldown ? Math.ceil((cd.readyAt - now) / 1000) : 0;
  const cdPct          = isOnCooldown ? (cd.readyAt - now) / (skill.cooldown * 1000) : 0;
  const activePct      = isActive && skill.duration > 0 ? (cd.activeUntil - now) / (skill.duration * 1000) : 0;

  const Icon = ICON_MAP[skill.icon] ?? Zap;

  const handleClick = () => {
    if (isLocked || isOnCooldown) return;
    engine.getPlugin<SkillPlugin>('skill')?.activateSkill(skill.id as SkillId);
  };

  const branchUnlockInfo = branch ? BRANCH_SKILL_UNLOCKS[branch] : null;
  const unlockLabel = isBranch && branch
    ? `${branch} rank ${branchUnlockInfo?.requiresRank}`
    : `Stage ${skill.unlockStage}`;

  const borderColor = isActive
    ? skill.color
    : isOnCooldown
      ? '#1a1a2a'
      : isLocked
        ? '#0a0a12'
        : isBranch
          ? skill.color + '88'
          : skill.color + '55';

  const tooltipContent = (
    <>
      <TooltipLabel label={skill.name} color={skill.color} />
      <TooltipText>{skill.description}</TooltipText>
      {skill.duration > 0 && <TooltipStat label="Duration" value={`${skill.duration}s`} color={skill.color} />}
      <TooltipStat label="Cooldown" value={`${skill.cooldown}s`} color="#5a7a8a" />
      {isBranch && (
        <TooltipStat label="Type" value="BRANCH SKILL" color={skill.color} />
      )}
      {isLocked && (
        <TooltipStat label="Unlock" value={unlockLabel} color="#ff4444" />
      )}
    </>
  );

  return (
    <Tooltip content={tooltipContent} position="top" delay={200}>
      <button
        onClick={handleClick}
        disabled={isLocked || isOnCooldown}
        style={{
          position: 'relative',
          width: 48, height: 48,
          background: isActive ? skill.color + '18' : isLocked ? '#05050a' : '#0a0a12',
          border: `1px solid ${borderColor}`,
          cursor: isLocked || isOnCooldown ? 'not-allowed' : 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: isActive
            ? `0 0 12px ${skill.color}44, inset 0 0 8px ${skill.color}22`
            : isBranch && !isLocked
              ? `0 0 6px ${skill.color}28`
              : 'none',
          opacity: isLocked ? 0.25 : 1,
          outline: isBranch && !isLocked ? `1px solid ${skill.color}22` : 'none',
          outlineOffset: 2,
        }}
      >
        {/* Cooldown sweep */}
        {isOnCooldown && (
          <div style={{
            position: 'absolute', inset: 0, background: '#000000aa',
            clipPath: `inset(${(1 - cdPct) * 100}% 0 0 0)`,
            transition: 'clip-path 0.1s linear',
          }} />
        )}

        {/* Active pulse border */}
        {isActive && (
          <div style={{
            position: 'absolute', inset: -1,
            border: `2px solid ${skill.color}`,
            boxShadow: `0 0 8px ${skill.color}`,
            animation: 'pulse 1s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        {/* Branch corner glow */}
        {isBranch && !isLocked && !isActive && (
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: 5, height: 5,
            background: skill.color,
            boxShadow: `0 0 4px ${skill.color}`,
          }} />
        )}

        <Icon size={16} color={isLocked ? '#2a2a3a' : isOnCooldown ? '#3a4a5a' : skill.color} />

        <div className="font-pixel" style={{
          fontSize: '5px', letterSpacing: '0.5px',
          color: isLocked ? '#1a1a2a' : isOnCooldown ? '#3a4a5a' : skill.color,
          position: 'relative', zIndex: 1, textAlign: 'center',
          maxWidth: 44, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>
          {isOnCooldown ? `${cdRemaining}s` : skill.name}
        </div>

        {/* Active timer bar */}
        {isActive && skill.duration > 0 && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0,
            height: 2, width: `${activePct * 100}%`,
            background: skill.color, boxShadow: `0 0 4px ${skill.color}`,
            transition: 'width 0.1s linear',
          }} />
        )}
      </button>
    </Tooltip>
  );
}

export const SkillBar: React.FC<SkillBarProps> = ({ engine }) => {
  const highestStage = useGameState(engine, s => s.highestStage);
  const upgrades     = useGameState(engine, s => s.overclockUpgrades ?? {});

  // Base skills: show when within 5 stages of unlock
  const visibleBase = BASE_SKILLS.filter(s =>
    highestStage >= s.unlockStage || highestStage >= s.unlockStage - 5
  );

  // Branch skills: show when the branch has at least 1 perk purchased (indicating player is on that path)
  const visibleBranch = BRANCH_SKILLS.filter(s => {
    const branch = SKILL_ID_TO_BRANCH[s.id as SkillId];
    if (!branch) return false;
    const unlock = BRANCH_SKILL_UNLOCKS[branch];
    // Show if player bought rank 1 perk in this branch OR skill is already unlocked
    return isBranchSkillUnlocked(upgrades, branch) || Object.keys(upgrades).some(id => {
      const { OverclockPerk } = { OverclockPerk: null };
      void OverclockPerk;
      return id.startsWith(branchPerkPrefix(branch));
    });
  });

  const allVisible = [...visibleBase, ...visibleBranch];
  if (allVisible.length === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      padding: '6px 8px', background: '#05050a', borderTop: '1px solid #0a1a2a',
      overflowX: 'auto', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
      scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
    }}>
      {visibleBase.map(skill => (
        <SkillButton key={skill.id} skill={skill} engine={engine} isBranch={false} />
      ))}

      {visibleBranch.length > 0 && (
        <div style={{ width: 1, height: 32, background: '#1a1a2a', flexShrink: 0, marginInline: 2 }} />
      )}

      {visibleBranch.map(skill => (
        <SkillButton key={skill.id} skill={skill} engine={engine} isBranch={true} />
      ))}
    </div>
  );
};

// Returns a prefix string unique to each branch so we can detect investment
function branchPerkPrefix(branch: PerkBranch): string {
  const map: Record<PerkBranch, string> = {
    VOLTAGE: 'voltage_',
    SIGNAL:  'ghost_protocol',
    THERMAL: 'phantom_thread',
    ENTROPY: 'exploit_entropy',
    QUANTUM: 'superposition',
  };
  return map[branch];
}
