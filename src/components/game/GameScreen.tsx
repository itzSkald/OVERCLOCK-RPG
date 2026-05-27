import React, { useEffect, useState } from 'react';
import { CircuitBoard, Zap, ChevronDown, Trophy, Clock, Award } from 'lucide-react';
import type { GameEngine } from '../../engine/Engine';
import type { Player } from '../../engine/types';
import { CyberHUD } from './CyberHUD';
import { Battlefield } from './Battlefield';
import { ComponentPanel } from './ComponentPanel';
import { OverclockPanel } from './OverclockPanel';
import { MotherboardScreen } from './MotherboardScreen';
import { OverclockScreen } from './OverclockScreen';
import { LeaderboardScreen } from './LeaderboardScreen';
import { DailiesScreen } from './DailiesScreen';
import { AchievementsScreen } from './AchievementsScreen';
import { AchievementToast } from './AchievementToast';
import { useGameState } from '../../hooks/useGameState';
import { Tooltip, TooltipLabel, TooltipText } from './Tooltip';
import type { OverclockPlugin } from '../../plugins/OverclockPlugin';

interface GameScreenProps {
  engine: GameEngine;
  player: Player;
}

type MobileDrawer = 'components' | 'overclock' | null;

const MobileDrawerOverlay: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  accentColor: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, accentColor, children }) => (
  <>
    {/* Backdrop */}
    {open && (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.55)',
        }}
      />
    )}

    {/* Drawer */}
    <div
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50,
        height: '85dvh',
        background: '#0a0a0f',
        border: `1px solid ${accentColor}33`,
        borderBottom: 'none',
        borderRadius: '0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Drag handle + title */}
      <div
        style={{
          flexShrink: 0,
          background: '#050010',
          borderBottom: `1px solid ${accentColor}22`,
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div className="font-pixel" style={{ color: accentColor, fontSize: '8px', letterSpacing: '3px' }}>
          {title}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: `1px solid ${accentColor}33`,
            color: accentColor, width: 28, height: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  </>
);

export const GameScreen: React.FC<GameScreenProps> = ({ engine, player }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const [showMotherboard, setShowMotherboard] = useState(false);
  const [showOverclockPopup, setShowOverclockPopup] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showDailies, setShowDailies] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<MobileDrawer>(null);

  const inventoryCount = useGameState(engine, s => (s.inventory ?? []).length);
  const overclockCount = useGameState(engine, s => s.overclockCount);
  const availableOCT = engine.getPlugin<OverclockPlugin>('overclock')?.getAvailableOCT() ?? overclockCount;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    const unsub = engine.on<{ goldEarned: number }>('offline_progress', event => {
      const g = event.payload.goldEarned;
      const formatted = g >= 1000 ? `${(g / 1000).toFixed(1)}K` : g.toString();
      setOfflineMsg(`OFFLINE INCOME: +${formatted} GOLD`);
      setTimeout(() => setOfflineMsg(null), 5000);
    });
    return unsub;
  }, [engine]);

  const openDrawer = (d: MobileDrawer) => setMobileDrawer(prev => prev === d ? null : d);

  if (isMobile) {
    return (
      <div style={{ height: '100dvh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Modals */}
        {showMotherboard && <MotherboardScreen engine={engine} onClose={() => setShowMotherboard(false)} />}
        {showLeaderboard && <LeaderboardScreen engine={engine} onClose={() => setShowLeaderboard(false)} />}
        {showDailies && <DailiesScreen engine={engine} onClose={() => setShowDailies(false)} />}
        {showAchievements && <AchievementsScreen engine={engine} onClose={() => setShowAchievements(false)} />}
        <AchievementToast engine={engine} />

        <CyberHUD engine={engine} playerHandle={player.handle} />

        {offlineMsg && (
          <div
            className="font-pixel text-center py-2"
            style={{ background: '#0a1a02', color: '#39ff14', fontSize: '8px', borderBottom: '1px solid #27b00e', flexShrink: 0 }}
          >
            {offlineMsg}
          </div>
        )}

        {/* Battlefield fills all remaining space */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <Battlefield engine={engine} />
        </div>

        {/* Bottom tab bar */}
        <div
          style={{
            flexShrink: 0,
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr',
            background: '#050010',
            borderTop: '1px solid #1a1a2a',
          }}
        >
          {/* Components tab */}
          <button
            onClick={() => openDrawer('components')}
            style={{
              background: mobileDrawer === 'components' ? '#001520' : 'transparent',
              border: 'none',
              borderTop: mobileDrawer === 'components' ? '2px solid #00f5ff' : '2px solid transparent',
              color: mobileDrawer === 'components' ? '#00f5ff' : '#3a4a5a',
              padding: '8px 2px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'all 0.15s',
              minHeight: 52,
            }}
          >
            <CircuitBoard size={15} color={mobileDrawer === 'components' ? '#00f5ff' : '#3a4a5a'} />
            <span className="font-pixel" style={{ fontSize: '6px', letterSpacing: '0.5px' }}>MODULES</span>
            {inventoryCount > 0 && (
              <span style={{
                background: '#39ff14', color: '#000',
                padding: '0 3px', fontSize: '6px', lineHeight: '12px',
                fontFamily: 'var(--font-mono)', minWidth: 12, textAlign: 'center',
              }}>
                {inventoryCount}
              </span>
            )}
          </button>

          {/* Overclock tab */}
          <button
            onClick={() => openDrawer('overclock')}
            style={{
              background: mobileDrawer === 'overclock' ? '#130010' : 'transparent',
              border: 'none',
              borderTop: mobileDrawer === 'overclock' ? '2px solid #ff0080' : '2px solid transparent',
              color: mobileDrawer === 'overclock' ? '#ff0080' : '#3a4a5a',
              padding: '8px 2px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'all 0.15s',
              minHeight: 52,
            }}
          >
            <Zap size={15} color={mobileDrawer === 'overclock' ? '#ff0080' : '#3a4a5a'} />
            <span className="font-pixel" style={{ fontSize: '6px', letterSpacing: '0.5px' }}>OVERCLOCK</span>
            {availableOCT > 0 && (
              <span style={{
                background: '#ff0080', color: '#000',
                padding: '0 3px', fontSize: '6px', lineHeight: '12px',
                fontFamily: 'var(--font-mono)', minWidth: 12, textAlign: 'center',
              }}>
                {availableOCT}
              </span>
            )}
          </button>

          {/* Leaderboard tab */}
          <button
            onClick={() => setShowLeaderboard(true)}
            style={{
              background: 'transparent',
              border: 'none',
              borderTop: '2px solid transparent',
              color: '#3a4a5a',
              padding: '8px 2px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'all 0.15s',
              minHeight: 52,
            }}
          >
            <Trophy size={15} color="#3a4a5a" />
            <span className="font-pixel" style={{ fontSize: '6px', letterSpacing: '0.5px' }}>RANKS</span>
          </button>

          {/* Dailies tab */}
          <button
            onClick={() => setShowDailies(true)}
            style={{
              background: 'transparent',
              border: 'none',
              borderTop: '2px solid transparent',
              color: '#3a4a5a',
              padding: '8px 2px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'all 0.15s',
              minHeight: 52,
            }}
          >
            <Clock size={15} color="#3a4a5a" />
            <span className="font-pixel" style={{ fontSize: '6px', letterSpacing: '0.5px' }}>DAILY</span>
          </button>

          {/* Achievements tab */}
          <button
            onClick={() => setShowAchievements(true)}
            style={{
              background: 'transparent',
              border: 'none',
              borderTop: '2px solid transparent',
              color: '#3a4a5a',
              padding: '8px 2px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              transition: 'all 0.15s',
              minHeight: 52,
            }}
          >
            <Award size={15} color="#3a4a5a" />
            <span className="font-pixel" style={{ fontSize: '6px', letterSpacing: '0.5px' }}>FEATS</span>
          </button>
        </div>

        {/* Components drawer */}
        <MobileDrawerOverlay
          open={mobileDrawer === 'components'}
          onClose={() => setMobileDrawer(null)}
          title="HARDWARE MODULES"
          accentColor="#00f5ff"
        >
          <ComponentPanel
            engine={engine}
            onOpenMotherboard={() => { setMobileDrawer(null); setTimeout(() => setShowMotherboard(true), 100); }}
            onOpenOverclock={() => { setMobileDrawer(null); setTimeout(() => openDrawer('overclock'), 100); }}
          />
        </MobileDrawerOverlay>

        {/* Overclock drawer */}
        <MobileDrawerOverlay
          open={mobileDrawer === 'overclock'}
          onClose={() => setMobileDrawer(null)}
          title="OVERCLOCK TREE"
          accentColor="#ff0080"
        >
          <div style={{ height: '100%', overflowY: 'auto', padding: 12 }}>
            <OverclockPanel engine={engine} />
          </div>
        </MobileDrawerOverlay>
      </div>
    );
  }

  // Desktop layout: left components | center battlefield | right overclock
  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: '#0a0a0f' }}>
      {showMotherboard && <MotherboardScreen engine={engine} onClose={() => setShowMotherboard(false)} />}
      {showOverclockPopup && <OverclockScreen engine={engine} onClose={() => setShowOverclockPopup(false)} />}
      {showLeaderboard && <LeaderboardScreen engine={engine} onClose={() => setShowLeaderboard(false)} />}
      {showDailies && <DailiesScreen engine={engine} onClose={() => setShowDailies(false)} />}
      {showAchievements && <AchievementsScreen engine={engine} onClose={() => setShowAchievements(false)} />}
      <AchievementToast engine={engine} />

      <CyberHUD engine={engine} playerHandle={player.handle} />

      {offlineMsg && (
        <div
          className="font-pixel text-center py-2"
          style={{ background: '#0a1a02', color: '#39ff14', fontSize: '8px', borderBottom: '1px solid #27b00e' }}
        >
          {offlineMsg}
        </div>
      )}

      <div className="flex" style={{ flex: 1, minHeight: 0 }}>
        {/* Left sidebar: Components */}
        <div
          style={{
            width: 260, flexShrink: 0,
            background: '#0a0a0f',
            borderRight: '1px solid #1a2a3a',
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <ComponentPanel
            engine={engine}
            onOpenMotherboard={() => setShowMotherboard(true)}
            onOpenOverclock={() => setShowOverclockPopup(true)}
          />
        </div>

        {/* Center: Battlefield */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Battlefield engine={engine} />
        </div>

        {/* Right sidebar: Launcher buttons */}
        <div
          style={{
            width: 200, flexShrink: 0,
            background: '#0a0a0f',
            borderLeft: '1px solid #1a1a2a',
            display: 'flex', flexDirection: 'column',
            padding: 12, gap: 10,
          }}
        >
          <div className="font-pixel" style={{ color: '#2a3a4a', fontSize: '6px', letterSpacing: '3px', marginBottom: 2 }}>
            SYSTEMS
          </div>

          {/* Motherboard / Hardware */}
          <Tooltip content={<><TooltipLabel label="HARDWARE" color="#39ff14" /><TooltipText>Equip dropped items to boost stats. Manage your motherboard slots.</TooltipText></>} position="left">
          <button
            onClick={() => setShowMotherboard(true)}
            style={{
              width: '100%',
              background: inventoryCount > 0 ? '#031a10' : '#080810',
              border: `1px solid ${inventoryCount > 0 ? '#39ff1455' : '#1a2a2a'}`,
              color: inventoryCount > 0 ? '#39ff14' : '#2a3a4a',
              padding: '14px 10px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: inventoryCount > 0 ? '0 0 10px rgba(57,255,20,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#39ff14';
              e.currentTarget.style.color = '#39ff14';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(57,255,20,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = inventoryCount > 0 ? '#39ff1455' : '#1a2a2a';
              e.currentTarget.style.color = inventoryCount > 0 ? '#39ff14' : '#2a3a4a';
              e.currentTarget.style.boxShadow = inventoryCount > 0 ? '0 0 10px rgba(57,255,20,0.12)' : 'none';
            }}
          >
            <CircuitBoard size={22} />
            <div className="font-pixel" style={{ fontSize: '7px', letterSpacing: '2px' }}>HARDWARE</div>
            {inventoryCount > 0 && (
              <div style={{
                background: '#39ff14', color: '#000',
                padding: '1px 6px', fontSize: '7px', lineHeight: '14px',
                fontFamily: 'var(--font-mono)', minWidth: 20, textAlign: 'center',
              }}>
                {inventoryCount} IN STORAGE
              </div>
            )}
          </button>
          </Tooltip>

          {/* Overclock */}
          <Tooltip content={<><TooltipLabel label="OVERCLOCK" color="#ff0080" /><TooltipText>Spend OCT on permanent upgrades. Resets progress but you come back stronger.</TooltipText></>} position="left">
          <button
            onClick={() => setShowOverclockPopup(true)}
            style={{
              width: '100%',
              background: availableOCT > 0 ? '#130010' : '#080808',
              border: `1px solid ${availableOCT > 0 ? '#ff008055' : '#1a1a2a'}`,
              color: availableOCT > 0 ? '#ff0080' : '#2a2a3a',
              padding: '14px 10px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: availableOCT > 0 ? '0 0 10px rgba(255,0,128,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#ff0080';
              e.currentTarget.style.color = '#ff0080';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(255,0,128,0.25)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = availableOCT > 0 ? '#ff008055' : '#1a1a2a';
              e.currentTarget.style.color = availableOCT > 0 ? '#ff0080' : '#2a2a3a';
              e.currentTarget.style.boxShadow = availableOCT > 0 ? '0 0 10px rgba(255,0,128,0.12)' : 'none';
            }}
          >
            <Zap size={22} />
            <div className="font-pixel" style={{ fontSize: '7px', letterSpacing: '2px' }}>OVERCLOCK</div>
            {availableOCT > 0 && (
              <div style={{
                background: '#ff0080', color: '#000',
                padding: '1px 6px', fontSize: '7px', lineHeight: '14px',
                fontFamily: 'var(--font-mono)', minWidth: 20, textAlign: 'center',
              }}>
                {availableOCT} OCT FREE
              </div>
            )}
          </button>
          </Tooltip>

          {/* Leaderboard */}
          <Tooltip content={<><TooltipLabel label="LEADERBOARD" /><TooltipText>Global rankings. Compete with other players by stage and overclock count.</TooltipText></>} position="left">
          <button
            onClick={() => setShowLeaderboard(true)}
            style={{
              width: '100%',
              background: '#080810',
              border: '1px solid #0a2838',
              color: '#2a4a5a',
              padding: '14px 10px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#00f5ff';
              e.currentTarget.style.color = '#00f5ff';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(0,245,255,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#0a2838';
              e.currentTarget.style.color = '#2a4a5a';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Trophy size={22} />
            <div className="font-pixel" style={{ fontSize: '7px', letterSpacing: '2px' }}>RANKS</div>
          </button>
          </Tooltip>

          {/* Daily Challenges */}
          <Tooltip content={<><TooltipLabel label="DAILY OPS" color="#00f5ff" /><TooltipText>Complete rotating challenges for gold rewards. Resets every 24h.</TooltipText></>} position="left">
          <button
            onClick={() => setShowDailies(true)}
            style={{
              width: '100%',
              background: '#080810',
              border: '1px solid #0a2838',
              color: '#2a4a5a',
              padding: '14px 10px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#00f5ff';
              e.currentTarget.style.color = '#00f5ff';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(0,245,255,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#0a2838';
              e.currentTarget.style.color = '#2a4a5a';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Clock size={22} />
            <div className="font-pixel" style={{ fontSize: '7px', letterSpacing: '2px' }}>DAILY OPS</div>
          </button>
          </Tooltip>

          {/* Achievements */}
          <Tooltip content={<><TooltipLabel label="ACHIEVEMENTS" color="#ffaa00" /><TooltipText>Permanent milestones. Track your progress across all runs.</TooltipText></>} position="left">
          <button
            onClick={() => setShowAchievements(true)}
            style={{
              width: '100%',
              background: '#080810',
              border: '1px solid #1a1a0a',
              color: '#2a3a2a',
              padding: '14px 10px',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#ffaa00';
              e.currentTarget.style.color = '#ffaa00';
              e.currentTarget.style.boxShadow = '0 0 14px rgba(255,170,0,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1a1a0a';
              e.currentTarget.style.color = '#2a3a2a';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <Award size={22} />
            <div className="font-pixel" style={{ fontSize: '7px', letterSpacing: '2px' }}>FEATS</div>
          </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
