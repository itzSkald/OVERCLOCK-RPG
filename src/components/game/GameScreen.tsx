import React, { useEffect, useState } from 'react';
import type { GameEngine } from '../../engine/Engine';
import type { Player } from '../../engine/types';
import { CyberHUD } from './CyberHUD';
import { Battlefield } from './Battlefield';
import { ComponentPanel } from './ComponentPanel';
import { OverclockPanel } from './OverclockPanel';
import { MotherboardScreen } from './MotherboardScreen';

interface GameScreenProps {
  engine: GameEngine;
  player: Player;
}

type MobileTab = 'components' | 'overclock';

export const GameScreen: React.FC<GameScreenProps> = ({ engine, player }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileTab, setMobileTab] = useState<MobileTab>('components');
  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const [showMotherboard, setShowMotherboard] = useState(false);

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

  if (isMobile) {
    return (
      <div className="flex flex-col" style={{ height: '100dvh', background: '#0a0a0f' }}>
        {showMotherboard && <MotherboardScreen engine={engine} onClose={() => setShowMotherboard(false)} />}
        <CyberHUD engine={engine} playerHandle={player.handle} onOpenMotherboard={() => setShowMotherboard(true)} />

        {/* Offline message */}
        {offlineMsg && (
          <div
            className="font-pixel text-center py-2 glow-green"
            style={{ background: '#0a1a02', color: '#39ff14', fontSize: '8px', borderBottom: '1px solid #27b00e' }}
          >
            {offlineMsg}
          </div>
        )}

        {/* Battlefield */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <Battlefield engine={engine} />
        </div>

        {/* Mobile tabs */}
        <div
          className="pixel-border"
          style={{ background: '#0d0d1a', borderColor: '#1a2a3a', borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}
        >
          <div className="flex">
            {(['components', 'overclock'] as MobileTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className="flex-1 font-pixel py-2"
                style={{
                  background: mobileTab === tab ? '#111122' : 'transparent',
                  color: mobileTab === tab ? '#00f5ff' : '#3a4a5a',
                  fontSize: '7px',
                  letterSpacing: '1px',
                  borderBottom: mobileTab === tab ? '2px solid #00f5ff' : '2px solid transparent',
                }}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ height: '35vh', overflowY: 'auto' }}>
            {mobileTab === 'components' && <ComponentPanel engine={engine} />}
            {mobileTab === 'overclock' && (
              <div style={{ padding: 12 }}>
                <OverclockPanel engine={engine} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col" style={{ height: '100dvh', background: '#0a0a0f' }}>
      {showMotherboard && <MotherboardScreen engine={engine} onClose={() => setShowMotherboard(false)} />}
      <CyberHUD engine={engine} playerHandle={player.handle} onOpenMotherboard={() => setShowMotherboard(true)} />

      {offlineMsg && (
        <div
          className="font-pixel text-center py-2 glow-green"
          style={{ background: '#0a1a02', color: '#39ff14', fontSize: '8px', borderBottom: '1px solid #27b00e' }}
        >
          {offlineMsg}
        </div>
      )}

      <div className="flex" style={{ flex: 1, minHeight: 0 }}>
        {/* Left sidebar: Components */}
        <div
          className="pixel-border"
          style={{
            width: 260,
            background: '#0a0a0f',
            borderColor: '#1a2a3a',
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            overflowY: 'auto',
          }}
        >
          <ComponentPanel engine={engine} />
        </div>

        {/* Center: Battlefield */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Battlefield engine={engine} />
        </div>

        {/* Right sidebar: Overclock + Stats */}
        <div
          className="pixel-border"
          style={{
            width: 220,
            background: '#0a0a0f',
            borderColor: '#1a2a3a',
            borderTop: 'none',
            borderBottom: 'none',
            borderRight: 'none',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
          }}
        >
          <OverclockPanel engine={engine} />

          {/* Stats */}
          <div
            className="pixel-border"
            style={{ background: '#0d0d1a', borderColor: '#1a2a3a', padding: '10px' }}
          >
            <div className="font-pixel mb-2" style={{ color: '#5a6a7a', fontSize: '7px' }}>{'> SYSTEM STATS'}</div>
            <StatRow engine={engine} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ engine: GameEngine }> = ({ engine }) => {
  const total = engine.state.totalDamageDealt;
  const fmt = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : Math.floor(n).toString();

  const [displayTotal, setDisplayTotal] = React.useState(total);

  React.useEffect(() => {
    return engine.subscribeState(s => setDisplayTotal(s.totalDamageDealt));
  }, [engine]);

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#5a6a7a', lineHeight: 1.8 }}>
      <div>Total DMG: <span style={{ color: '#00f5ff' }}>{fmt(displayTotal)}</span></div>
    </div>
  );
};
