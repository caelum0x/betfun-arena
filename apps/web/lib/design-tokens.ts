/**
 * BetFun Arena Design Tokens
 * EXACT specs from USERFLOW.md wireframes
 * Dark mode only | iPhone 15 Pro (393×852px)
 */

export const colors = {
  // Primary Colors (EXACT from USERFLOW.md)
  electricPurple: '#A020F0',  // Primary brand
  neonGreen: '#39FF14',       // Yes outcome
  hotPink: '#FF2D55',         // No outcome (EXACT spec)
  solBlue: '#14F195',
  bloodRed: '#DC143C',

  // Neutrals (EXACT from USERFLOW.md)
  black: '#000000',
  darkGray: '#1A1A1A',
  mediumGray: '#2D2D2D',
  lightGray: '#666666',       // Secondary text (EXACT spec)
  mutedGray: '#888888',       // Tertiary text (EXACT spec)
  white: '#FFFFFF',

  // Semantic
  success: '#39FF14',
  error: '#FF2D55',
  warning: '#FFD700',
  info: '#14F195',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',      // Card spacing (EXACT)
  md: '16px',
  card: '20px',   // Card margin (EXACT from wireframe)
  lg: '24px',
  xl: '32px',     // Vertical padding (EXACT)
  '2xl': '48px',  // FAB offset (EXACT)
  '3xl': '64px',  // Tab bar height (EXACT)
  safe: '56px',   // Safe area top (EXACT)
} as const;

export const borderRadius = {
  sm: '8px',
  md: '16px',
  lg: '24px',
  full: '9999px',
} as const;

export const shadows = {
  glowPurple: '0 0 20px rgba(160, 32, 240, 0.5)',
  glowGreen: '0 0 20px rgba(57, 255, 20, 0.5)',
  glowBlue: '0 0 20px rgba(20, 241, 149, 0.5)',
  card: '0 4px 24px rgba(0, 0, 0, 0.8)',
} as const;

export const typography = {
  fontFamily: {
    header: '"PP Mori", "Inter", system-ui, sans-serif',  // EXACT from wireframe
    body: '"Inter", system-ui, sans-serif',               // EXACT from wireframe
    meme: '"Impact", sans-serif',
  },
  fontSize: {
    display: '64px',
    hero: '48px',     // Victory screen (EXACT)
    h1: '32px',       // Landing title (EXACT)
    h2: '24px',       // Section headers
    h3: '20px',       // Arena detail title (EXACT)
    h4: '18px',       // "Trending today" (EXACT)
    bodyLarge: '18px',// Create form inputs (EXACT)
    body: '16px',     // Arena card text (EXACT)
    bodySmall: '14px',// Stats text (EXACT)
    caption: '12px',  // LivePotBar height (EXACT)
  },
  lineHeight: {
    display: 1.1,
    h1: 1.2,
    h2: 1.3,
    h3: 1.4,
    body: 1.6,
    bodySmall: 1.5,
    caption: 1.4,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    bold: 700,      // Button text 24px bold (EXACT)
  },
} as const;

export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

export const animations = {
  cardEnter: 'fadeInUp 300ms ease-out',
  buttonHover: 'scale 150ms ease',
  progressFill: 'fillBar 500ms ease-in-out',
  pulse: 'pulse 2s infinite',
  spin: 'spin 1s linear infinite',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1300,
  tooltip: 1400,
  confetti: 9999,
} as const;

// CSS Custom Properties (for Tailwind)
export const cssVariables = {
  '--color-electric-purple': colors.electricPurple,
  '--color-neon-green': colors.neonGreen,
  '--color-sol-blue': colors.solBlue,
  '--color-hot-pink': colors.hotPink,
  '--color-blood-red': colors.bloodRed,
  '--color-black': colors.black,
  '--color-dark-gray': colors.darkGray,
  '--color-medium-gray': colors.mediumGray,
  '--color-light-gray': colors.lightGray,
  '--color-white': colors.white,
} as const;

