import React, { useCallback, useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import { useGameState } from '../../hooks/useGameState';
import { getTotalIdleDps } from '../../plugins/ComponentPlugin';
import type { AuthPlugin } from '../../plugins/AuthPlugin';
import type { LeaderboardPlugin } from '../../plugins/LeaderboardPlugin';
import { Tooltip, TooltipLabel, TooltipText } from './Tooltip';

interface CyberHUDProps {
  engine: GameEngine;
  playerHandle: string;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toString();
}

export const CyberHUD: React.FC<CyberHUDProps> = ({ engine, playerHandle }) => {
  const stage = useGameState(engine, s => s.stage);
  const gold = useGameState(engine, s => s.gold);
  const overclocks = useGameState(engine, s => s.overclockCount);
  const components = useGameState(engine, s => s.components);
  const idleDps = getTotalIdleDps(components) * engine.getModifier('idle_dps');
  const [confirming, setConfirming] = useState(false);

  const lbPlugin = engine.getPlugin<LeaderboardPlugin>('leaderboard');
  const [onlineCount, setOnlineCount] = useState(lbPlugin?.getOnlineCount() ?? 0);
  const syncOnline = useCallback(() => {
    setOnlineCount(lbPlugin?.getOnlineCount() ?? 0);
  }, [lbPlugin]);
  useEffect(() => {
    if (!lbPlugin) return;
    syncOnline();
    return lbPlugin.subscribe(syncOnline);
  }, [lbPlugin, syncOnline]);

  const handleLogout = () => {
    const authPlugin = engine.getPlugin<AuthPlugin>('auth');
    authPlugin?.signOut();
    setConfirming(false);
  };

  return (
    <div
      className="flex items-center justify-between px-3 py-2 pixel-border"
      style={{ background: '#0d0d1a', borderColor: '#1a2a3a', borderTop: 'none', borderLeft: 'none', borderRight: 'none', minHeight: 48, gap: 8 }}
    >
      {/* Stage */}
      <Tooltip content={<><TooltipLabel label="STAGE" /><TooltipText>Current enemy stage. Every 10th is a boss.</TooltipText></>} position="bottom">
        <div className="flex items-center gap-2">
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>STG</div>
          <div className="font-pixel glow-cyan" style={{ color: '#00f5ff', fontSize: '12px' }}>
            {stage}
          </div>
        </div>
      </Tooltip>

      {/* DPS */}
      <Tooltip content={<><TooltipLabel label="IDLE DPS" color="#39ff14" /><TooltipText>Damage per second from hardware modules. Attacks automatically.</TooltipText></>} position="bottom">
        <div className="flex items-center gap-2">
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>DPS</div>
          <div className="font-pixel glow-green" style={{ color: '#39ff14', fontSize: '10px' }}>
            {formatNumber(idleDps)}
          </div>
        </div>
      </Tooltip>

      {/* Gold */}
      <Tooltip content={<><TooltipLabel label="GOLD" color="#ffaa00" /><TooltipText>Currency earned from defeating enemies. Spend on hardware modules.</TooltipText></>} position="bottom">
        <div className="flex items-center gap-2">
          <div style={{ color: '#ffaa00', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>◆</div>
          <div className="font-pixel glow-amber" style={{ color: '#ffaa00', fontSize: '10px' }}>
            {formatNumber(gold)}
          </div>
        </div>
      </Tooltip>

      {/* Overclocks */}
      <Tooltip content={<><TooltipLabel label="OVERCLOCK TOKENS" color="#ff0080" /><TooltipText>Prestige currency. Reset progress for permanent upgrades.</TooltipText></>} position="bottom">
        <div className="flex items-center gap-2">
          <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>OC</div>
          <div className="font-pixel glow-pink" style={{ color: '#ff0080', fontSize: '10px' }}>
            {overclocks}
          </div>
        </div>
      </Tooltip>

      {/* Online */}
      {onlineCount > 0 && (
        <div className="flex items-center gap-1">
          <Wifi size={9} color="#39ff14" />
          <div className="font-pixel" style={{ color: '#39ff14', fontSize: '8px' }}>
            {onlineCount}
          </div>
        </div>
      )}

      {/* Player + Logout */}
      <div className="flex items-center gap-2">
        <div
          style={{
            color: '#5a6a7a',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {playerHandle}
        </div>

        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleLogout}
              className="font-pixel"
              style={{
                background: '#3d0505',
                border: '1px solid #ff2222',
                color: '#ff2222',
                padding: '2px 6px',
                fontSize: '7px',
                cursor: 'pointer',
              }}
            >
              OK?
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="font-pixel"
              style={{
                background: 'transparent',
                border: '1px solid #1a2a3a',
                color: '#3a4a5a',
                padding: '2px 6px',
                fontSize: '7px',
                cursor: 'pointer',
              }}
            >
              NO
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="font-pixel"
            style={{
              background: 'transparent',
              border: '1px solid #1a2a3a',
              color: '#3a4a5a',
              padding: '2px 6px',
              fontSize: '7px',
              cursor: 'pointer',
              transition: 'color 0.1s steps(2), border-color 0.1s steps(2)',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.color = '#ff2222';
              (e.target as HTMLButtonElement).style.borderColor = '#ff2222';
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.color = '#3a4a5a';
              (e.target as HTMLButtonElement).style.borderColor = '#1a2a3a';
            }}
          >
            EXIT
          </button>
        )}
      </div>
    </div>
  );
};
