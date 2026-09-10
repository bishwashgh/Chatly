export const colors = {
  // Warm, soft canvas
  bg: '#F7F6FB',
  bgDeep: '#EFECF8',
  blobPink: '#F9DFF0',
  blobLavender: '#DCD2FF',
  blobGray: '#E8E6F1',
  // Cards & surfaces
  surface: '#FFFFFF',
  surfaceAlt: '#F4F2FA',
  border: 'rgba(92,68,168,0.14)',
  borderSoft: 'rgba(20,16,44,0.07)',
  // Accents
  primary: '#6546D7',
  primaryDark: '#4C32B1',
  primaryLight: '#A68BFF',
  lavender: '#EDE8FF',
  accent: '#8268E8',
  danger: '#E04C64',
  success: '#20B978',
  // Dark floating accents
  charcoal: '#171521',
  dockActive: '#302A42',
  dockInactive: '#A9A4B8',
  // Typography
  textPrimary: '#191629',
  textSecondary: '#706B82',
  textMuted: 'rgba(112,107,130,0.68)',
};

export const gradients = {
  primary: [colors.primaryDark, colors.primaryLight] as const,
  header: ['#FFFFFF', '#F7F6FB'] as const,
  bubbleMine: ['#EDE8FF', '#E5DEFF'] as const,
  login: ['#F9DFF0', '#DDD3FF', '#F7F6FB'] as const,
};

export const shadows = {
  sm: {
    shadowColor: '#242039',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: '#242039',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  lg: {
    shadowColor: '#242039',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 8,
  },
  dock: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 26,
    elevation: 16,
  },
};

export const radii = { sm: 10, md: 16, lg: 24, xl: 30, full: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };