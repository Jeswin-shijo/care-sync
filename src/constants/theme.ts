export const colors = {
  primary: '#1E6BFF',
  primaryDark: '#0D47A1',
  primaryLight: '#E8F1FF',
  primaryGradientStart: '#2563EB',
  primaryGradientEnd: '#1D4ED8',

  secondary: '#00B4D8',
  secondaryLight: '#E0F7FA',

  background: '#F8FAFC',
  card: '#FFFFFF',
  cardMuted: '#F1F5F9',
  border: '#E2E8F0',
  borderLight: '#EDF2F7',

  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: '#ECFDF5',
  successText: '#065F46',

  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningText: '#92400E',

  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  dangerText: '#991B1B',

  info: '#3B82F6',
  infoLight: '#EFF6FF',
  infoText: '#1E40AF',

  purple: '#8B5CF6',
  purpleLight: '#F5F3FF',

  teal: '#14B8A6',
  tealLight: '#F0FDFA',

  rose: '#F43F5E',
  roseLight: '#FFF1F2',

  orange: '#F97316',
  orangeLight: '#FFF7ED',
};

export const typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
};
