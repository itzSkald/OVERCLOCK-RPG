import React, { useEffect, useState } from 'react';
import type { GameEngine } from '../../engine/Engine';

interface BootScreenProps {
  engine: GameEngine;
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ engine, onComplete }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const unsub = engine.on<string>('boot_log', event => {
      setLines(prev => [...prev, event.payload]);
    });

    return unsub;
  }, [engine]);

  useEffect(() => {
    if (lines.some(l => l.includes('ALL SYSTEMS ONLINE') || l.includes('BOOT TIMEOUT'))) {
      setTimeout(() => {
        setDone(true);
        setTimeout(onComplete, 600);
      }, 400);
    }
  }, [lines, onComplete]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLines(prev => {
        if (prev.some(l => l.includes('ALL SYSTEMS ONLINE'))) return prev;
        return [...prev, '> BOOT TIMEOUT - ENTERING SAFE MODE...'];
      });
    }, 10_000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      className="min-h-screen circuit-bg scanlines flex items-center justify-center animate-crt-flicker"
      style={{ background: '#0a0a0f' }}
    >
      <div style={{ width: '100%', maxWidth: 520, padding: '0 24px' }}>
        <div className="font-pixel glow-cyan mb-6 text-center" style={{ color: '#00f5ff', fontSize: '16px', letterSpacing: '4px' }}>
          OVERCLOCK.EXE
        </div>

        <div
          className="pixel-border"
          style={{ background: '#0d0d1a', borderColor: '#1a2a3a', padding: '20px', minHeight: 200 }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className="animate-boot-line"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                lineHeight: '1.8',
                color: line.includes('OK') ? '#39ff14' : line.includes('ERROR') ? '#ff2222' : line.includes('ALL SYSTEMS') ? '#00f5ff' : '#5a6a7a',
                overflow: 'hidden',
              }}
            >
              {line}
            </div>
          ))}

          {!done && (
            <span className="animate-blink" style={{ color: '#00f5ff', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              _
            </span>
          )}

          {done && (
            <div className="font-pixel glow-green mt-2" style={{ color: '#39ff14', fontSize: '8px' }}>
              {'> ENTERING MATRIX...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
