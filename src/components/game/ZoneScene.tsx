import React, { useMemo } from 'react';
import { ZONE_CONFIG, type ZoneDef } from '../../config/game.config';

export type ZoneId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Re-export ZoneDef as ZoneConfig for compatibility
export type ZoneConfig = ZoneDef;

// Get zones from config
const ZONES: ZoneConfig[] = ZONE_CONFIG.zones as ZoneConfig[];

// Zones span stagesPerZone stages each: zone 0 = stages 1-500, zone 1 = 501-1000, etc.
export function getZone(stage: number): ZoneConfig {
  const idx = Math.min(Math.floor((stage - 1) / ZONE_CONFIG.stagesPerZone), ZONES.length - 1);
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

  if (content === 'void') {
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
  }

  if (content === 'glitch') {
    // Abyss: horizontal glitch slices
    return (
      <>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${10 + i * 18}%`,
              left: 0,
              right: 0,
              height: 2,
              background: zone.accentColor,
              opacity: 0.06,
              animation: `bar-flicker ${0.8 + i * 0.3}s steps(2) ${i * 0.15}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={`b${i}`}
            style={{
              position: 'absolute',
              top: `${25 + i * 25}%`,
              left: `${20 + i * 20}%`,
              width: `${60 - i * 15}%`,
              height: 1,
              background: `linear-gradient(to right, transparent, ${zone.accentColor}, transparent)`,
              opacity: 0.09,
              animation: `trace-scan ${3 + i}s linear ${i * 0.5}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  if (content === 'fractal') {
    // Fractal: nested diamond grid overlays
    return (
      <>
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${5 + i * 15}%`,
              left: `${5 + i * 12}%`,
              width: `${20 - i * 2}%`,
              height: `${20 - i * 2}%`,
              border: `1px solid ${zone.accentColor}`,
              opacity: 0.04 + i * 0.01,
              transform: `rotate(${45 + i * 15}deg)`,
              pointerEvents: 'none',
            }}
          />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={`h${i}`}
            style={{
              position: 'absolute',
              top: `${20 + i * 20}%`,
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(to right, transparent, ${zone.groundColor}, ${zone.accentColor}, transparent)`,
              opacity: 0.07,
              animation: `trace-scan ${5 + i * 2}s linear ${i * 0.8}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  if (content === 'static') {
    // Entropy: TV-static noise dots
    return (
      <>
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${Math.floor(i / 4) * 30 + 10}%`,
              left: `${(i % 4) * 25 + 5}%`,
              width: 3,
              height: 3,
              background: zone.accentColor,
              opacity: 0.06,
              animation: `void-glitch ${0.5 + (i % 3) * 0.3}s steps(2) ${i * 0.1}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={`l${i}`}
            style={{
              position: 'absolute',
              top: `${30 + i * 25}%`,
              left: 0,
              right: 0,
              height: 1,
              background: zone.accentColor,
              opacity: 0.04,
              animation: `trace-scan ${6 + i * 3}s linear ${i * 1.2}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
      </>
    );
  }

  if (content === 'overload') {
    // Singularity: intense bright vertical beams
    return (
      <>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: 0,
              left: `${10 + i * 18}%`,
              width: 1,
              height: '100%',
              background: `linear-gradient(to top, ${zone.accentColor}, transparent)`,
              opacity: 0.1,
              animation: `bar-flicker ${0.6 + i * 0.2}s steps(3) ${i * 0.12}s infinite`,
              pointerEvents: 'none',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at 50% 100%, ${zone.accentColor}08, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      </>
    );
  }

  // Stars (Beyond): faint pinpoints of light
  return (
    <>
      {Array.from({ length: 20 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${(i * 17 + 5) % 90}%`,
            left: `${(i * 23 + 3) % 95}%`,
            width: i % 5 === 0 ? 2 : 1,
            height: i % 5 === 0 ? 2 : 1,
            borderRadius: '50%',
            background: zone.accentColor,
            opacity: 0.03 + (i % 4) * 0.01,
            animation: `particle-rise ${8 + i * 0.5}s linear ${i * 0.3}s infinite`,
            pointerEvents: 'none',
          }}
        />
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
