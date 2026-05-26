import React, { useState } from 'react';
import { TerminalInput } from './TerminalInput';
import type { AuthPlugin } from '../../plugins/AuthPlugin';

interface ResetScreenProps {
  authPlugin: AuthPlugin;
  onBack: () => void;
}

export const ResetScreen: React.FC<ResetScreenProps> = ({ authPlugin, onBack }) => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) return;
    setError('');
    setLoading(true);
    const { error: err } = await authPlugin.resetPassword(email);
    setLoading(false);
    if (err) setError(err);
    else setSent(true);
  };

  return (
    <div className="min-h-screen circuit-bg scanlines flex items-center justify-center animate-crt-flicker">
      <div className="w-full max-w-md mx-4">
        <div className="pixel-border" style={{ background: '#0d0d1a', borderColor: '#1a2a3a', padding: '24px' }}>
          <div className="font-pixel mb-6" style={{ color: '#ff0080', fontSize: '8px', borderBottom: '1px solid #1a2a3a', paddingBottom: '12px' }}>
            {'> KEY RECOVERY PROTOCOL'}
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="font-pixel glow-green mb-4" style={{ color: '#39ff14', fontSize: '8px', lineHeight: '2' }}>
                {'> RECOVERY SIGNAL SENT'}
              </div>
              <div style={{ color: '#5a6a7a', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                Check your inbox for the recovery link.
              </div>
            </div>
          ) : (
            <>
              <TerminalInput
                label="REGISTERED EMAIL"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="user@domain.net"
              />

              {error && (
                <div className="mb-4 font-pixel glow-red" style={{ color: '#ff2222', fontSize: '7px', lineHeight: '1.8' }}>
                  {'> ERROR: '}{error}
                </div>
              )}

              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full font-pixel mt-2 pixel-border-pink"
                style={{
                  background: '#1a0010',
                  color: '#ff0080',
                  padding: '14px',
                  fontSize: '9px',
                  letterSpacing: '2px',
                }}
              >
                {loading ? '> TRANSMITTING...' : '> SEND RECOVERY SIGNAL'}
              </button>
            </>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={onBack}
              style={{ color: '#5a6a7a', background: 'none', border: 'none', fontFamily: 'var(--font-mono)', cursor: 'pointer', fontSize: '11px' }}
            >
              {'< BACK TO LOGIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
