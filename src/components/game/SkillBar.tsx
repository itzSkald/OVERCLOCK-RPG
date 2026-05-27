import React, { useEffect, useState } from 'react';
import { Zap, Cpu, Coins, Shield, Link } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { SkillPlugin } from '../../plugins/SkillPlugin';
import { SKILLS } from '../../plugins/SkillPlugin';
import { useGameState } from '../../hooks/useGameState';
import type { SkillDef, SkillId } from '../../engine/types';
import { Tooltip, TooltipLabel, TooltipText, TooltipStat } from './Tooltip';

interface SkillBarProps {
  engine: GameEngine;
}

const ICON_MAP: Record<string, typeof Zap> = {
  Zap, Cpu, Coins, Shield, Link,
};

function SkillButton({ skill, engine }: { skill: SkillDef; engine: GameEngine }) {
  const cooldowns = useGameState(engine, s => s.skillCooldowns);
  const highestStage = useGameState(engine, s => s.highestStage);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const cd = cooldowns[skill.id];
  const isLocked = highestStage < skill.unlockStage;
  const isActive = cd.activeUntil > now;
  const isOnCooldown = cd.readyAt > now && !isActive;
  const cooldownRemaining = isOnCooldown ? Math.ceil((cd.readyAt - now) / 1000) : 0;
  const cooldownPct = isOnCooldown
    ? (cd.readyAt - now) / (skill.cooldown * 1000)
    : 0;
  const activePct = isActive
    ? (cd.activeUntil - now) / (skill.duration * 1000)
    : 0;

  const Icon = ICON_MAP[skill.icon] ?? Zap;

  const handleClick = () => {
    if (isLocked || isOnCooldown) return;
    const plugin = engine.getPlugin<SkillPlugin>('skill');
    plugin?.activateSkill(skill.id as SkillId);
  };

  const borderColor = isActive ? skill.color : isOnCooldown ? '#1a1a2a' : isLocked ? '#0a0a12' : skill.color + '55';
  const bgColor = isActive ? skill.color + '18' : isLocked ? '#05050a' : '#0a0a12';

  const tooltipContent = (
    <>
      <TooltipLabel label={skill.name} color={skill.color} />
      <TooltipText>{skill.description}</TooltipText>
      <TooltipStat label="Duration" value={`${skill.duration}s`} color={skill.color} />
      <TooltipStat label="Cooldown" value={`${skill.cooldown}s`} color="#5a7a8a" />
      {isLocked && (
        <TooltipStat label="Unlock" value={`Stage ${skill.unlockStage}`} color="#ff4444" />
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
        width: 48,
        height: 48,
        background: bgColor,
        border: `1px solid ${borderColor}`,
        cursor: isLocked || isOnCooldown ? 'not-allowed' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: isActive ? `0 0 12px ${skill.color}44, inset 0 0 8px ${skill.color}22` : 'none',
        opacity: isLocked ? 0.3 : 1,
      }}
    >
      {/* Cooldown sweep overlay */}
      {isOnCooldown && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000000aa',
            clipPath: `inset(${(1 - cooldownPct) * 100}% 0 0 0)`,
            transition: 'clip-path 0.1s linear',
          }}
        />
      )}

      {/* Active pulse border */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: -1,
            border: `2px solid ${skill.color}`,
            boxShadow: `0 0 8px ${skill.color}`,
            animation: 'pulse 1s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Icon */}
      <Icon size={16} color={isLocked ? '#2a2a3a' : isOnCooldown ? '#3a4a5a' : skill.color} />

      {/* Label */}
      <div
        className="font-pixel"
        style={{
          fontSize: '5px',
          letterSpacing: '0.5px',
          color: isLocked ? '#1a1a2a' : isOnCooldown ? '#3a4a5a' : skill.color,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {isOnCooldown ? `${cooldownRemaining}s` : skill.name}
      </div>

      {/* Active timer bar */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            width: `${activePct * 100}%`,
            background: skill.color,
            boxShadow: `0 0 4px ${skill.color}`,
            transition: 'width 0.1s linear',
          }}
        />
      )}
    </button>
    </Tooltip>
  );
}

export const SkillBar: React.FC<SkillBarProps> = ({ engine }) => {
  const highestStage = useGameState(engine, s => s.highestStage);
  const visibleSkills = SKILLS.filter(s => highestStage >= s.unlockStage || highestStage >= s.unlockStage - 5);

  if (visibleSkills.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '6px 8px',
        background: '#05050a',
        borderTop: '1px solid #0a1a2a',
      }}
    >
      {visibleSkills.map(skill => (
        <SkillButton key={skill.id} skill={skill} engine={engine} />
      ))}
    </div>
  );
};
