export const colors = {
  // Calm, ocean-inspired canvas
  bg: '#F4FAF9',
  bgDeep: '#E7F4F1',
  blobPink: '#FCE8DE',
  blobLavender: '#CDEFEA',
  blobGray: '#E4EEF0',
  // Cards & surfaces
  surface: '#FFFFFF',
  surfaceAlt: '#EFF8F6',
  border: 'rgba(19,112,105,0.15)',
  borderSoft: 'rgba(15,38,43,0.08)',
  // Accents
  primary: '#0F766E',
  primaryDark: '#115E59',
  primaryLight: '#2CB7A9',
  lavender: '#DDF5F1',
  accent: '#159A91',
  danger: '#E04C64',
  success: '#20B978',
  // Dark floating accents
  charcoal: '#102A2B',
  dockActive: '#0F766E',
  dockInactive: '#9BB1B1',
  // Typography
  textPrimary: '#102A2B',
  textSecondary: '#5C7071',
  textMuted: 'rgba(92,112,113,0.72)',
};

export const gradients = {
  primary: [colors.primaryDark, colors.primaryLight] as const,
  header: ['#FFFFFF', '#F4FAF9'] as const,
  bubbleMine: ['#DDF5F1', '#CDEFEA'] as const,
  login: ['#FCE8DE', '#CDEFEA', '#F4FAF9'] as const,
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