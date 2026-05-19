import React, { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle, type StyleProp } from 'react-native';
import { colors, radii, spacing } from '../theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
};

export function Card({ children, style, glow }: Props) {
  return <View style={[styles.card, glow && styles.glow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glass,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.cardGap,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  glow: {
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
