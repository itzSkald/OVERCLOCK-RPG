import React from 'react';

interface ConfirmationScreenProps {
  email: string;
  onBack: () => void;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ email, onBack }) => (
  <div className="min-h-screen circuit-bg scanlines flex items-center justify-center animate-crt-flicker">
    <div className="w-full max-w-md mx-4 text-center">
      <div className="font-pixel glow-amber mb-8" style={{ color: '#ffaa00', fontSize: '12px', letterSpacing: '2px' }}>
        AWAITING SIGNAL...
      </div>

      <div className="pixel-border" style={{ background: '#0d0d1a', borderColor: '#ffaa00', padding: '32px' }}>
        <div className="mb-6">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="inline-block mx-1 font-pixel"
              style={{
                color: '#ffaa00',
                fontSize: '20px',
                animation: `blink 1s step-end infinite`,
                animationDelay: `${i * 0.33}s`,
              }}
            >
              {'█'}
            </div>
          ))}
        </div>

        <div className="font-pixel mb-4" style={{ color: '#5a6a7a', fontSize: '7px', lineHeight: '2' }}>
          {'> CONFIRMATION SIGNAL SENT TO:'}
        </div>
        <div className="mb-6" style={{ color: '#00f5ff', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
          {email}
        </div>

        <div className="font-pixel mb-6" style={{ color: '#5a6a7a', fontSize: '7px', lineHeight: '2' }}>
          {'> CHECK YOUR INBOX AND'}<br />
          {'> CLICK THE ACTIVATION LINK'}<br />
          {'> TO BOOT YOUR ACCOUNT'}
        </div>

        <button
          onClick={onBack}
          className="font-pixel pixel-border"
          style={{
            background: 'transparent',
            color: '#5a6a7a',
            borderColor: '#1a2a3a',
            padding: '10px 20px',
            fontSize: '7px',
            letterSpacing: '1px',
          }}
        >
          {'< BACK TO LOGIN'}
        </button>
      </div>
    </div>
  </div>
);
