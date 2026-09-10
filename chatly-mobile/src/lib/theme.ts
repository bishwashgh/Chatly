export const colors = {
  // Chatly: quiet iOS surfaces with an indigo → teal signature accent.
  bg: '#F5F5F7',
  bgDeep: '#ECECF0',
  blobPink: '#E4E8FF',
  blobLavender: '#D8F7F2',
  blobGray: '#E3E3E8',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F3',
  border: 'rgba(25,31,56,0.12)',
  borderSoft: 'rgba(25,31,56,0.07)',
  primary: '#4A6CF7',
  primaryDark: '#4A6CF7',
  primaryLight: '#34C1B0',
  lavender: '#E8ECFF',
  accent: '#4A6CF7',
  danger: '#FF453A',
  success: '#30D158',
  charcoal: '#1C1C1E',
  dockActive: '#4A6CF7',
  dockInactive: '#8E8E93',
  textPrimary: '#1C1C1E',
  textSecondary: '#636366',
  textMuted: 'rgba(99,99,102,0.72)',
};

export const gradients = {
  primary: [colors.primary, colors.primaryLight] as const,
  header: ['#FFFFFF', '#F5F5F7'] as const,
  bubbleMine: ['#4A6CF7', '#34C1B0'] as const,
  login: ['#E4E8FF', '#D8F7F2', '#F5F5F7'] as const,
};

export const shadows = {
  sm: {
    shadowColor: '#164447',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
  },
  md: {
    shadowColor: '#164447',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 18,
    elevation: 4,
  },
  lg: {
    shadowColor: '#164447',
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