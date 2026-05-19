import { StyleSheet } from 'react-native';
import { colors } from './index';

export const type = StyleSheet.create({
  display: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
