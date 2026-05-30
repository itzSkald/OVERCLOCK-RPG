import React, { useState } from 'react';
import { TerminalInput } from './TerminalInput';
import type { AuthPlugin } from '../../plugins/AuthPlugin';
import { AUTH_CONFIG } from '../../config/game.config';

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

  // Only shown when AUTH_CONFIG.emailConfirmationEnabled === true
  const [confirmationSent, setConfirmationSent] = useState(false);

  const handleRegister = async () => {
    setError('');

    const trimmedHandle = handle.trim();
    if (!trimmedHandle) return setError('HANDLE IS REQUIRED');
    if (!email) return setError('RECOVERY EMAIL IS REQUIRED');
    if (!password) return setError('SECURITY KEY IS REQUIRED');
    if (password !== confirm) return setError('KEYS DO NOT MATCH');
    if (password.length < 6) return setError('KEY TOO SHORT (MIN 6 CHARS)');

    setLoading(true);
    const { error: err, needsConfirmation } = await authPlugin.signUp(email, password, trimmedHandle);
    setLoading(false);

    if (err) {
      setError(err.toUpperCase());
    } else if (needsConfirmation) {
      // Only reached when AUTH_CONFIG.emailConfirmationEnabled === true
      setConfirmationSent(true);
    }
    // On success without confirmation, auth_success fires → App navigates to game
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRegister();
  };

  // ── Confirmation screen (only when email confirmation is enabled) ────────────
  if (confirmationSent) {
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
              {'> EMAIL VERIFICATION REQUIRED'}
            </div>

            <div className="font-pixel mb-3" style={{ color: '#5a6a7a', fontSize: '9px', lineHeight: '1.8' }}>
              {'> CHECK YOUR INBOX'}
            </div>

            <div className="mb-6" style={{ color: '#3a4a5a', fontFamily: 'var(--font-mono)', fontSize: '11px', lineHeight: '1.6' }}>
              A confirmation link was sent to{' '}
              <span style={{ color: '#00f5ff' }}>{email}</span>.{' '}
              Click it to activate your account, then return here to log in.
            </div>

            <button
              onClick={onSwitchToLogin}
              className="w-full font-pixel pixel-border-cyan"
              style={{ background: '#001a20', color: '#00f5ff', padding: '14px', fontSize: '9px', letterSpacing: '2px' }}
            >
              {'> BACK TO LOGIN'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ────────────────────────────────────────────────────────
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

          <div onKeyDown={handleKeyDown}>
            <TerminalInput
              label="HACKER HANDLE (LOGIN USERNAME)"
              value={handle}
              onChange={v => setHandle(v.toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 12))}
              placeholder="GHOST_RUNNER"
            />

            <TerminalInput
              label={`RECOVERY EMAIL${AUTH_CONFIG.emailConfirmationEnabled ? '' : ' (PASSWORD RESET ONLY)'}`}
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
          </div>

          {!AUTH_CONFIG.emailConfirmationEnabled && (
            <div
              style={{
                marginBottom: '16px',
                padding: '8px 10px',
                border: '1px solid #1a2a1a',
                background: '#050f05',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: '#2a5a2a',
                lineHeight: '1.6',
              }}
            >
              {'> '} Login uses your handle. Email is stored for key recovery only.
            </div>
          )}

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
