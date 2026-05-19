import { DarkTheme, type Theme } from '@react-navigation/native';

export { colors } from './colors';
import { colors } from './colors';

export { spacing } from './spacing';
export { layout } from './layout';

export const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 28,
  xxl: 32,
  pill: 999,
};

export const placeholderColor = colors.textMuted;

export const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.cardBorder,
    notification: colors.primary,
  },
};

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.backgroundElevated },
  headerTintColor: colors.primary,
  headerTitleStyle: { fontWeight: '700' as const, color: colors.text, fontSize: 17 },
  headerShadowVisible: false,
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.background, flex: 1 },
};

export const tabScreenOptions = {
  tabBarStyle: {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: 1,
    height: 64,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '600' as const },
};
