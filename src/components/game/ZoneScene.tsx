import React, { useMemo } from 'react';

export type ZoneId = 0 | 1 | 2 | 3 | 4;

export interface ZoneConfig {
  id: ZoneId;
  name: string;
  label: string;
  bgColor: string;
  gridColor: string;
  particleColor: string;
  groundColor: string;
  accentColor: string;
  farLayerContent: 'hex' | 'bars' | 'traces' | 'racks' | 'void';
}

export const ZONES: ZoneConfig[] = [
  {
    id: 0,
    name: 'PERIMETER',
    label: 'ZONE 0: PERIMETER',
    bgColor: '#0a0a0f',
    gridColor: 'rgba(0,245,255,0.04)',
    particleColor: '#00f5ff',
    groundColor: '#00f5ff',
    accentColor: '#00f5ff',
    farLayerContent: 'hex',
  },
  {
    id: 1,
    name: 'FIREWALL',
    label: 'ZONE 1: FIREWALL',
    bgColor: '#0f0808',
    gridColor: 'rgba(255,34,34,0.05)',
    particleColor: '#ff2222',
    groundColor: '#ff0080',
    accentColor: '#ff2222',
    farLayerContent: 'bars',
  },
  {
    id: 2,
    name: 'KERNEL',
    label: 'ZONE 2: KERNEL',
    bgColor: '#080f08',
    gridColor: 'rgba(57,255,20,0.04)',
    particleColor: '#39ff14',
    groundColor: '#39ff14',
    accentColor: '#39ff14',
    farLayerContent: 'traces',
  },
  {
    id: 3,
    name: 'CORE',
    label: 'ZONE 3: CORE',
    bgColor: '#0f0c06',
    gridColor: 'rgba(255,170,0,0.04)',
    particleColor: '#ffaa00',
    groundColor: '#ffaa00',
    accentColor: '#ffaa00',
    farLayerContent: 'racks',
  },
  {
    id: 4,
    name: 'THE VOID',
    label: 'ZONE 4: THE VOID',
    bgColor: '#050508',
    gridColor: 'rgba(200,200,255,0.02)',
    particleColor: '#ffffff',
    groundColor: '#ffffff',
    accentColor: '#ffffff',
    farLayerContent: 'void',
  },
];

export function getZone(stage: number): ZoneConfig {
  const idx = Math.min(Math.floor((stage - 1) / 10), ZONES.length - 1);
  return ZONES[idx];
}

// Seeded random for stable particle positions per zone
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

interface ParticleProps {
  zone: ZoneConfig;
  count?: number;
}

const Particles: React.FC<ParticleProps> = ({ zone, count = 12 }) => {
  const particles = useMemo(() => {
    const rand = seededRand(zone.id * 777 + 13);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      size: rand() * 2 + 1,
      duration: rand() * 6 + 4,
      delay: rand() * 5,
      opacity: rand() * 0.5 + 0.3,
    }));
  }, [zone.id, count]);

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: 0,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: zone.particleColor,
            boxShadow: `0 0 4px ${zone.particleColor}`,
            opacity: p.opacity,
            animation: `particle-rise ${p.duration}s linear ${p.delay}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};

const HexLayer: React.FC<{ zone: ZoneConfig }> = ({ zone }) => {
  const nodes = useMemo(() => {
    const rand = seededRand(42);
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      top: rand() * 80 + 5,
      label: `0x${Math.floor(rand() * 0xffff).toString(16).toUpperCase().padStart(4, '0')}`,
      delay: rand() * 8,
    }));
  }, []);
  return (
    <>
      {nodes.map(n => (
        <div
          key={n.id}
          style={{
            position: 'absolute',
            top: `${n.top}%`,
            right: 0,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: zone.accentColor,
            opacity: 0.12,
            animation: `scroll-left 18s linear ${n.delay}s infinite`,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {n.label}
        </div>
      ))}
    </>
  );
};

interface FarLayerProps {
  zone: ZoneConfig;
}

const FarLayer: React.FC<FarLayerProps> = ({ zone }) => {
  const content = zone.farLayerContent;

  if (content === 'hex') {
    return <HexLayer zone={zone} />;
  }

  if (content === 'bars') {
    // Firewall: vertical red barrier columns
    return (
      <>
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${(i / 7) * 100 + 2}%`,
              width: 3,
              height: `${30 + i * 8}%`,
              background: `linear-gradient(to top, ${zone.accentColor}, transparent)`,
              opacity: 0.08,
              animation: `bar-flicker 1.5s steps(3) ${i * 0.2}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  if (content === 'traces') {
    // Kernel: horizontal circuit trace lines
    return (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${15 + i * 13}%`,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(to right, transparent, ${zone.accentColor}, transparent)`,
              opacity: 0.1,
              animation: `trace-scan 4s linear ${i * 0.6}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  if (content === 'racks') {
    // Core: server rack silhouettes
    return (
      <>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 16,
              left: `${10 + i * 24}%`,
              width: 18,
              height: `${40 + i * 10}%`,
              background: `repeating-linear-gradient(
                to bottom,
                transparent,
                transparent 6px,
                ${zone.accentColor} 6px,
                ${zone.accentColor} 7px
              )`,
              opacity: 0.07,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  // Void: static noise bursts
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${20 + i * 20}%`,
            left: `${15 + i * 18}%`,
            width: 24,
            height: 24,
            opacity: 0.05,
            animation: `void-glitch 3s steps(2) ${i * 0.7}s infinite`,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: '#ffffff',
            pointerEvents: 'none',
          }}
        >
          {'█░▓▒'}
        </div>
      ))}
    </>
  );
};

interface ZoneSceneProps {
  zone: ZoneConfig;
  showTransition?: boolean;
  transitionLabel?: string;
  showStageClear?: boolean;
  stageClearText?: string;
  showBossWarning?: boolean;
}

export const ZoneScene: React.FC<ZoneSceneProps> = ({
  zone,
  showTransition,
  transitionLabel,
  showStageClear,
  stageClearText,
  showBossWarning,
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: zone.bgColor,
        backgroundImage: `
          linear-gradient(${zone.gridColor} 1px, transparent 1px),
          linear-gradient(90deg, ${zone.gridColor} 1px, transparent 1px),
          linear-gradient(${zone.gridColor.replace('0.04', '0.02').replace('0.05', '0.025').replace('0.02', '0.01')} 1px, transparent 1px),
          linear-gradient(90deg, ${zone.gridColor.replace('0.04', '0.02').replace('0.05', '0.025').replace('0.02', '0.01')} 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px, 64px 64px, 16px 16px, 16px 16px',
        backgroundPosition: '-2px -2px, -2px -2px, -1px -1px, -1px -1px',
        pointerEvents: 'none',
      }}
    >
      {/* Far layer background elements */}
      <FarLayer zone={zone} />

      {/* Particles */}
      <Particles zone={zone} count={14} />

      {/* Ground line */}
      <div
        style={{
          position: 'absolute',
          bottom: 52,
          left: '5%',
          right: '5%',
          height: 1,
          background: zone.groundColor,
          opacity: 0.2,
          boxShadow: `0 0 6px ${zone.groundColor}`,
        }}
      />

      {/* Zone transition banner */}
      {showTransition && transitionLabel && (
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 9,
            color: zone.accentColor,
            letterSpacing: 4,
            textShadow: `0 0 12px ${zone.accentColor}`,
            animation: 'zone-banner 2s steps(4) forwards',
            pointerEvents: 'none',
          }}
        >
          {'[ '}{transitionLabel}{' ]'}
        </div>
      )}

      {/* Stage clear flash */}
      {showStageClear && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.04)',
            animation: 'stage-clear-flash 0.4s steps(4) forwards',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Stage clear text */}
      {showStageClear && stageClearText && (
        <div
          style={{
            position: 'absolute',
            top: '42%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 8,
            color: zone.accentColor,
            letterSpacing: 3,
            textShadow: `0 0 10px ${zone.accentColor}`,
            animation: 'stage-clear-text 1.5s steps(4) forwards',
            pointerEvents: 'none',
          }}
        >
          {stageClearText}
        </div>
      )}

      {/* Boss warning banner */}
      {showBossWarning && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 7,
            color: '#ff2222',
            letterSpacing: 2,
            textShadow: '0 0 10px #ff2222',
            animation: 'boss-warning 2s steps(4) infinite',
            pointerEvents: 'none',
          }}
        >
          {'[!] BOSS DETECTED [!]'}
        </div>
      )}
    </div>
  );
};
