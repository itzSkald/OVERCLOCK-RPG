import React from 'react';

interface TerminalInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  placeholder = '',
}) => (
  <div className="mb-4">
    <div className="text-xs mb-1 font-pixel" style={{ color: '#5a6a7a', fontSize: '8px' }}>
      {label}
    </div>
    <div className="flex items-center pixel-border" style={{ borderColor: '#2a4a5a', background: '#0d0d1a', padding: '8px 12px' }}>
      <span style={{ color: '#2a4a5a', fontFamily: 'var(--font-mono)', marginRight: 8 }}>{'>'}</span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm"
        style={{ fontFamily: 'var(--font-mono)', color: '#00f5ff', fontSize: '13px' }}
      />
    </div>
  </div>
);
