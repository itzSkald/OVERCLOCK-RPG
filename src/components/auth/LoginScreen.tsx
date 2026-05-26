import React, { useState } from 'react';
import { TerminalInput } from './TerminalInput';
import type { AuthPlugin } from '../../plugins/AuthPlugin';

interface LoginScreenProps {
  authPlugin: AuthPlugin;
  onSwitchToRegister: () => void;
  onSwitchToReset: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ authPlugin, onSwitchToRegister, onSwitchToReset }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    const { error: err } = await authPlugin.signIn(email, password);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen circuit-bg scanlines flex items-center justify-center animate-crt-flicker">
      <div className="w-full max-w-md mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-pixel glow-cyan mb-2" style={{ color: '#00f5ff', fontSize: '20px', letterSpacing: '4px' }}>
            OVERCLOCK
          </div>
          <div className="font-pixel glow-green" style={{ color: '#39ff14', fontSize: '10px', letterSpacing: '8px' }}>
            .EXE
          </div>
          <div className="mt-4" style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            MOTHERBOARD UPGRADE SIMULATOR v1.0
          </div>
        </div>

        {/* Terminal panel */}
        <div className="pixel-border" style={{ background: '#0d0d1a', borderColor: '#1a2a3a', padding: '24px' }}>
          <div className="font-pixel mb-6" style={{ color: '#00f5ff', fontSize: '8px', borderBottom: '1px solid #1a2a3a', paddingBottom: '12px' }}>
            {'> AUTHENTICATION REQUIRED'}
          </div>

          <TerminalInput
            label="ACCESS EMAIL"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="user@domain.net"
          />

          <TerminalInput
            label="SECURITY KEY"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
          />

          {error && (
            <div className="mb-4 font-pixel glow-red" style={{ color: '#ff2222', fontSize: '7px', lineHeight: '1.8' }}>
              {'> ERROR: '}{error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full font-pixel mt-2 pixel-border-cyan"
            style={{
              background: loading ? '#003d42' : '#0a1f22',
              color: '#00f5ff',
              padding: '14px',
              fontSize: '9px',
              letterSpacing: '2px',
              transition: 'background 0.1s steps(2)',
            }}
          >
            {loading ? '> AUTHENTICATING...' : '> INITIALIZE SESSION'}
          </button>

          <div className="mt-4 flex justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            <button
              onClick={onSwitchToRegister}
              style={{ color: '#39ff14', background: 'none', border: 'none', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
            >
              [NEW USER]
            </button>
            <button
              onClick={onSwitchToReset}
              style={{ color: '#5a6a7a', background: 'none', border: 'none', fontFamily: 'var(--font-mono)', cursor: 'pointer' }}
            >
              [LOST KEY?]
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6" style={{ color: '#2a3a4a', fontFamily: 'var(--font-mono)', fontSize: '10px' }}>
          <span className="animate-blink">{'_'}</span>
          {' SYSTEM READY'}
        </div>
      </div>
    </div>
  );
};
