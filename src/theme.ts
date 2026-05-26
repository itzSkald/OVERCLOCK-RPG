export const COLORS = {
  bg: '#0a0a0f',
  bgPanel: '#0d0d1a',
  bgCard: '#111122',
  bgHover: '#161628',

  cyan: '#00f5ff',
  cyanDim: '#00a8b0',
  cyanDark: '#003d42',

  green: '#39ff14',
  greenDim: '#27b00e',
  greenDark: '#0a3d02',

  pink: '#ff0080',
  pinkDim: '#b00058',
  pinkDark: '#3d0024',

  amber: '#ffaa00',
  amberDim: '#b07500',
  amberDark: '#3d2800',

  red: '#ff2222',
  redDim: '#b01010',
  redDark: '#3d0505',

  textPrimary: '#e0e8f0',
  textMuted: '#5a6a7a',
  textDim: '#3a4a5a',

  border: '#1a2a3a',
  borderBright: '#2a4a5a',
} as const;

export const FONTS = {
  pixel: '"Press Start 2P", monospace',
  mono: '"Share Tech Mono", monospace',
} as const;

export const DAMAGE_COLORS = {
  normal: COLORS.cyan,
  crit: COLORS.amber,
  boss: COLORS.pink,
  idle: COLORS.green,
} as const;
