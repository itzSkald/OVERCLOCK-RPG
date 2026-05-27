import React, { useState, useRef, useCallback, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
  delay?: number;
  children: React.ReactNode;
  disabled?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 300,
  children,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay, disabled]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const positionStyles: Record<TooltipPosition, React.CSSProperties> = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 8 },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8 },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 8 },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 8 },
  };

  const arrowStyles: Record<TooltipPosition, React.CSSProperties> = {
    top: { bottom: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    bottom: { top: -4, left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    left: { right: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
    right: { left: -4, top: '50%', transform: 'translateY(-50%) rotate(45deg)' },
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}

      {visible && (
        <div
          style={{
            position: 'absolute',
            zIndex: 999,
            pointerEvents: 'none',
            ...positionStyles[position],
          }}
        >
          <div
            style={{
              background: '#0a0e14',
              border: '1px solid #1a3a4a',
              padding: '8px 10px',
              minWidth: 120,
              maxWidth: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 8px rgba(0,245,255,0.08)',
              animation: 'tooltipFadeIn 0.15s ease-out',
            }}
          >
            {content}
          </div>

          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              background: '#0a0e14',
              border: '1px solid #1a3a4a',
              borderTop: position === 'bottom' ? '1px solid #1a3a4a' : 'none',
              borderLeft: position === 'right' ? '1px solid #1a3a4a' : 'none',
              borderBottom: position === 'top' ? '1px solid #1a3a4a' : 'none',
              borderRight: position === 'left' ? '1px solid #1a3a4a' : 'none',
              ...arrowStyles[position],
            }}
          />
        </div>
      )}
    </div>
  );
};

export const TooltipLabel: React.FC<{ label: string; color?: string }> = ({ label, color = '#00f5ff' }) => (
  <div className="font-pixel" style={{ color, fontSize: '7px', letterSpacing: '1px', marginBottom: 3 }}>
    {label}
  </div>
);

export const TooltipText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: '#8a9aaa', fontFamily: 'var(--font-mono)', fontSize: '10px', lineHeight: '14px' }}>
    {children}
  </div>
);

export const TooltipStat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#5a7a8a' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 3 }}>
    <span style={{ color: '#4a5a6a', fontFamily: 'var(--font-mono)', fontSize: '9px' }}>{label}</span>
    <span style={{ color, fontFamily: 'var(--font-mono)', fontSize: '9px' }}>{value}</span>
  </div>
);
