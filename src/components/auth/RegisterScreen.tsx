import React, { useState } from 'react';
import { TerminalInput } from './TerminalInput';
import type { AuthPlugin } from '../../plugins/AuthPlugin';

interface RegisterScreenProps {
  authPlugin: AuthPlugin;
  onSwitchToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ authPlugin, onSwitchToLogin }) => {
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!handle || !email || !password) return setError('ALL FIELDS REQUIRED');
    if (password !== confirm) return setError('KEYS DO NOT MATCH');
    if (password.length < 6) return setError('KEY TOO SHORT (MIN 6 CHARS)');

    setLoading(true);
    const { error: err } = await authPlugin.signUp(email, password, handle);
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen circuit-bg scanlines flex items-center justify-center animate-crt-flicker">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="font-pixel glow-cyan mb-2" style={{ color: '#00f5ff', fontSize: '20px', letterSpacing: '4px' }}>
            OVERCLOCK
          </div>
          <div className="font-pixel glow-green" style={{ color: '#39ff14', fontSize: '10px', letterSpacing: '8px' }}>
            .EXE
          </div>
        </div>

        <div className="pixel-border" style={{ background: '#0d0d1a', borderColor: '#1a2a3a', padding: '24px' }}>
          <div className="font-pixel mb-6" style={{ color: '#39ff14', fontSize: '8px', borderBottom: '1px solid #1a2a3a', paddingBottom: '12px' }}>
            {'> NEW USER REGISTRATION'}
          </div>

          <TerminalInput
            label="HACKER HANDLE (12 CHARS MAX)"
            value={handle}
            onChange={v => setHandle(v.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12))}
            placeholder="GHOST_RUNNER"
          />

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
            placeholder="min 6 characters"
          />

          <TerminalInput
            label="CONFIRM KEY"
            value={confirm}
            onChange={setConfirm}
            type="password"
            placeholder="repeat key"
          />

          {error && (
            <div className="mb-4 font-pixel glow-red" style={{ color: '#ff2222', fontSize: '7px', lineHeight: '1.8' }}>
              {'> ERROR: '}{error}
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full font-pixel mt-2 pixel-border-green"
            style={{
              background: loading ? '#0a3d02' : '#0a1a02',
              color: '#39ff14',
              padding: '14px',
              fontSize: '9px',
              letterSpacing: '2px',
            }}
          >
            {loading ? '> INITIALIZING...' : '> INITIALIZE USER'}
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={onSwitchToLogin}
              style={{ color: '#5a6a7a', background: 'none', border: 'none', fontFamily: 'var(--font-mono)', cursor: 'pointer', fontSize: '11px' }}
            >
              [ALREADY REGISTERED? LOGIN]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
