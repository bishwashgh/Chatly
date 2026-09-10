export const colors = {
  // iOS Native Chatly palette (from design zip)
  bg: '#FAF9FE',
  bgDeep: '#F4F3F8',
  surface: '#FFFFFF',
  surfaceBright: '#FAF9FE',
  surfaceDim: '#DAD9DF',
  surfaceAlt: '#F4F3F8',
  surfaceContainer: '#EEEDF3',
  surfaceContainerLow: '#F4F3F8',
  surfaceContainerHigh: '#E9E7ED',
  surfaceContainerHighest: '#E3E2E7',
  surfaceVariant: '#E3E2E7',

  border: 'rgba(26,27,31,0.08)',
  borderSoft: 'rgba(26,27,31,0.05)',

  // Signature iOS Deep Green & vibrant accents
  primary: '#006E28',
  primaryDark: '#004D1A',
  primaryLight: '#34C759',
  primaryContainer: '#34C759',
  primaryFixed: '#72FE88',
  primaryFixedDim: '#53E16F',
  primaryTint: 'rgba(114, 254, 136, 0.22)',

  // Secondary Blue (Outgoing chat bubble, Friend-Gated badge)
  secondary: '#0058BC',
  secondaryContainer: '#0070EB',
  secondaryFixed: '#D8E2FF',
  onSecondaryFixed: '#001A41',
  onSecondaryFixedVariant: '#004493',

  // Tertiary & Error
  tertiary: '#9C413D',
  tertiaryContainer: '#FF8E86',
  danger: '#BA1A1A',
  error: '#BA1A1A',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',
  success: '#34C759',

  charcoal: '#1A1B1F',
  dockActive: '#006E28',
  dockInactive: '#6D7B6B',

  textPrimary: '#1A1B1F',
  textSecondary: '#3D4A3C',
  textMuted: '#6D7B6B',
  outline: '#6D7B6B',
  outlineVariant: '#BCCBB8',

  blobPink: '#E8F5E9',
  blobLavender: '#E0F2FE',
  blobGray: '#F4F3F8',
  lavender: '#E8F8EE',
  accent: '#006E28',
};

export const darkColors = {
  ...colors,
  bg: '#121316',
  bgDeep: '#1A1B1F',
  blobPink: '#172B1E',
  blobLavender: '#13243A',
  blobGray: '#202125',
  surface: '#1A1B1F',
  surfaceAlt: '#24252A',
  surfaceContainer: '#28292E',
  surfaceContainerLow: '#202125',
  surfaceContainerHigh: '#2F3035',
  surfaceContainerHighest: '#36373D',
  border: 'rgba(255,255,255,0.12)',
  borderSoft: 'rgba(255,255,255,0.06)',
  charcoal: '#FAF9FE',
  dockInactive: '#8E9A8C',
  textPrimary: '#F1F0F5',
  textSecondary: '#C2CEC0',
  textMuted: '#8E9A8C',
};

export const gradients = {
  primary: ['#006E28', '#34C759'] as const,
  primaryLight: ['#34C759', '#72FE88'] as const,
  header: ['#FAF9FE', '#F4F3F8'] as const,
  bubbleMine: ['#0070EB', '#0058BC'] as const,
  storyRing: ['#006E28', '#72FE88'] as const,
  login: ['#E8F8EE', '#D8E2FF', '#FAF9FE'] as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  dock: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
};

export const radii = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 40 };
