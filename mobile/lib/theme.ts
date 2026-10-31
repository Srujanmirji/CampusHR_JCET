import { Platform } from 'react-native';
import tokens from '../../design/mobile-v2/tokens.json';

// Apple iOS 18 / HIG-inspired CampusHR design system. Legacy semantic aliases
// keep existing screens and API-driven states on the same palette.
const lightColors = {
  ...tokens.color,
  canvas: '#F2F2F7',
  background: '#F2F2F7',
  softBg: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#E5E5EA',
  muted: '#EFEFF4',
  inset: '#E5E5EA',
  ink: '#1C1C1E',
  foreground: '#1C1C1E',
  deepInk: '#0B132B',
  brandDeep: '#0B132B',
  textSecondary: '#636366',
  textTertiary: '#636366',
  mutedForeground: '#636366',
  border: 'rgba(60, 60, 67, 0.12)',
  divider: 'rgba(60, 60, 67, 0.12)',
  input: '#8E8E93',
  primary: '#0066CC',
  action: '#0066CC',
  actionPressed: '#004C99',
  royalBlue: '#0066CC',
  electricBlue: '#007AFF',
  interactiveAccent: '#007AFF',
  onAction: '#FFFFFF',
  focus: '#0066CC',
  hero: '#0F2557',
  onHero: '#FFFFFF',
  heroMuted: '#DBEAFE',
  heroInset: 'rgba(255,255,255,0.14)',
  blueContainer: '#EBF5FF',
  violet: '#5856D6',
  violetContainer: '#F2F1FF',
  mint: '#34C759',
  mintInk: '#156F2E',
  mintContainer: '#E8F8EE',
  success: '#156F2E',
  amber: '#FF9500',
  amberInk: '#8A4B00',
  amberContainer: '#FFF5E5',
  warning: '#8A4B00',
  coral: '#FF3B30',
  coralInk: '#B91C1C',
  coralContainer: '#FFECEB',
  error: '#B91C1C',
  errorInk: '#B91C1C',
  accent: '#FF5520',
  brandAccent: '#FF5520',
  heritageOrange: '#FF5520',
  accentInk: '#5856D6',
  scrim: 'rgba(15, 23, 42, 0.36)',
};

export const darkColors: typeof lightColors = {
  ...lightColors,
  canvas: '#000000',
  background: '#000000',
  softBg: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  muted: '#2C2C2E',
  inset: '#2C2C2E',
  ink: '#F2F2F7',
  foreground: '#F2F2F7',
  deepInk: '#F2F2F7',
  brandDeep: '#F2F2F7',
  textSecondary: '#98989D',
  textTertiary: '#98989D',
  mutedForeground: '#98989D',
  border: 'rgba(255, 255, 255, 0.14)',
  divider: 'rgba(255, 255, 255, 0.14)',
  input: '#636366',
  primary: '#0A84FF',
  action: '#0A84FF',
  actionPressed: '#0066CC',
  royalBlue: '#0A84FF',
  electricBlue: '#0A84FF',
  interactiveAccent: '#0A84FF',
  focus: '#0A84FF',
  blueContainer: '#172554',
  violet: '#7D7AFF',
  violetContainer: '#1E1B4B',
  mintInk: '#4ADE80',
  mintContainer: '#052E16',
  amberInk: '#FBBF24',
  amberContainer: '#451A03',
  coralInk: '#F87171',
  coralContainer: '#450A0A',
  error: '#F87171',
  errorInk: '#F87171',
};

const colors = { ...lightColors };

export type AppearanceMode = 'light' | 'dark';
let currentAppearance: AppearanceMode = 'light';
const appearanceListeners = new Set<() => void>();

export function getAppearance(): AppearanceMode {
  return currentAppearance;
}

export function setAppearance(mode: AppearanceMode) {
  currentAppearance = mode;
  Object.assign(colors, mode === 'dark' ? darkColors : lightColors);
  for (const listener of appearanceListeners) listener();
}

export function subscribeAppearance(listener: () => void) {
  appearanceListeners.add(listener);
  return () => {
    appearanceListeners.delete(listener);
  };
}
const systemFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default:
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
});

export const theme = {
  colors,
  typography: {
    display: 34,
    heading: 34,
    greeting: 28,
    subheading: 22,
    title: 22,
    metric: 28,
    body: 17,
    secondary: 15,
    button: 17,
    label: 15,
    caption: 13,
    tab: 11,
    bodyFamily: systemFamily,
    headingFamily: systemFamily,
    lineHeight: 24,
    displayLineHeight: 40,
    greetingLineHeight: 34,
    titleLineHeight: 28,
    secondaryLineHeight: 21,
    captionLineHeight: 18,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    section: 16,
    lg: 20,
    page: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48,
  },
  radius: {
    control: 12,
    field: 14,
    card: 20,
    hero: 26,
    modal: 28,
    full: 9999,
    status: 9999,
  },
  sizes: {
    tapTarget: 48,
    icon: 24,
    iconSmall: 20,
    avatar: 40,
    avatarLarge: 80,
    contentMax: 680,
  },
  motion: {
    pressScale: 0.975,
    stiffness: 500,
    damping: 40,
    selectionMs: 180,
  },
  shadows: {
    card: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 14,
      elevation: 2,
    },
  },
};
