// Chatly theme - clean, Messenger-inspired light design
// Blue primary, white surfaces, soft neutrals - familiar and trustworthy
export const colors = {
  // Base surfaces
  background: '#ffffff',
  surface: '#ffffff',
  surfaceDim: '#f0f2f5',
  surfaceBright: '#ffffff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f7f8fa',
  surfaceContainer: '#f0f2f5',
  surfaceContainerHigh: '#e4e6eb',
  surfaceContainerHighest: '#d8dadf',
  surfaceVariant: '#f0f2f5',

  // Text
  onSurface: '#050505',
  onBackground: '#050505',
  onSurfaceVariant: '#65676b',
  onPrimary: '#ffffff',
  onSecondary: '#ffffff',

  // Accent colors
  primary: '#0084ff',
  primaryContainer: '#e7f3ff',
  primaryFixedDim: '#0084ff',
  onPrimaryContainer: '#050505',
  secondary: '#00b2ff',
  secondaryContainer: '#e6f7ff',
  onSecondaryContainer: '#003b5c',
  tertiary: '#31a24c',
  tertiaryContainer: '#e7f8ec',

  // Status colors
  error: '#f02849',
  errorContainer: '#ffe9ec',
  outline: '#bcc0c4',
  outlineVariant: '#e4e6eb',
  success: '#31a24c',
  successContainer: '#e7f8ec',

  // Surface utilities (cards, borders, chips)
  glassBorder: '#e4e6eb',
  glassBorderLight: '#f0f2f5',
  glassFill: '#ffffff',
  glassFillStrong: '#e4e6eb',
  glassFillCard: '#ffffff',
  glassPanel: '#ffffff',
  white5: 'rgba(255, 255, 255, 0.5)',
  white10: 'rgba(0, 0, 0, 0.06)',
  white20: 'rgba(0, 0, 0, 0.12)',
  white30: 'rgba(0, 0, 0, 0.2)',

  // Gradients
  gradientPrimary: '#0084ff',
  gradientSecondary: '#00b2ff',
  gradientTertiary: '#31a24c',
} as const;

export type ThemeColors = { [K in keyof typeof colors]: string };

export const darkColors: ThemeColors = {
  // Base surfaces
  background: '#0b0d12',
  surface: '#151820',
  surfaceDim: '#10131a',
  surfaceBright: '#1a1e28',
  surfaceContainerLowest: '#0e1117',
  surfaceContainerLow: '#13161d',
  surfaceContainer: '#1a1e27',
  surfaceContainerHigh: '#222734',
  surfaceContainerHighest: '#2a2f3d',
  surfaceVariant: '#1c202a',

  // Text
  onSurface: '#e6e8ec',
  onBackground: '#e6e8ec',
  onSurfaceVariant: '#9aa2b1',
  onPrimary: '#ffffff',
  onSecondary: '#00324a',

  // Accent colors
  primary: '#4da3ff',
  primaryContainer: '#123a5c',
  primaryFixedDim: '#4da3ff',
  onPrimaryContainer: '#e6f2ff',
  secondary: '#4fc3ff',
  secondaryContainer: '#0e3a4d',
  onSecondaryContainer: '#d9f2ff',
  tertiary: '#55c46f',
  tertiaryContainer: '#14401f',

  // Status colors
  error: '#f26d84',
  errorContainer: '#52111d',
  outline: '#3a4150',
  outlineVariant: '#232836',
  success: '#55c46f',
  successContainer: '#14401f',

  // Surface utilities (cards, borders, chips)
  glassBorder: '#262b38',
  glassBorderLight: '#202533',
  glassFill: '#151820',
  glassFillStrong: '#262b38',
  glassFillCard: '#171b24',
  glassPanel: '#151820',
  white5: 'rgba(255, 255, 255, 0.04)',
  white10: 'rgba(255, 255, 255, 0.08)',
  white20: 'rgba(255, 255, 255, 0.14)',
  white30: 'rgba(255, 255, 255, 0.22)',

  // Gradients
  gradientPrimary: '#4da3ff',
  gradientSecondary: '#4fc3ff',
  gradientTertiary: '#55c46f',
};

// Subtle ambient mesh gradients for light screens
export const meshGradients = [
  ['rgba(0, 132, 255, 0.06)', 'rgba(255, 255, 255, 0)'],
  ['rgba(0, 178, 255, 0.04)', 'rgba(255, 255, 255, 0)'],
  ['rgba(49, 162, 76, 0.03)', 'rgba(255, 255, 255, 0)'],
] as const;

export const borderRadius = {
  sm: 8,
  default: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 9999,
} as const;

export const spacing = {
  marginMain: 12,
  gutter: 16,
  stackSm: 8,
  stackMd: 16,
  stackLg: 32,
} as const;

export const typography = {
  headlineLg: {
    fontFamily: 'Manrope',
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.02,
  },
  headlineMd: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.01,
  },
  headlineLgMobile: {
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  bodyLg: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMd: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelSm: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.01,
  },
} as const;

// Soft, neutral card shadows
export const glassShadows = {
  panel: {
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 2,
  },
  glowPrimary: {
    shadowColor: '#0084ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  glowSecondary: {
    shadowColor: '#00b2ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;