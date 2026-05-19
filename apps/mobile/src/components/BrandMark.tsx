import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../theme';

type Props = {
  subtitle?: string;
  large?: boolean;
  centered?: boolean;
  /** Tighter layout for auth screens */
  compact?: boolean;
  /** Smallest header — fits one screen with form */
  minimal?: boolean;
};

export function BrandMark({ subtitle, large, centered, compact, minimal }: Props) {
  return (
    <View
      style={[
        styles.wrap,
        centered && styles.wrapCenter,
        compact && styles.wrapCompact,
        compact && centered && styles.wrapCenterCompact,
        minimal && styles.wrapMinimal,
      ]}
    >
      <View style={[styles.logoOuter, compact && styles.logoOuterCompact, minimal && styles.logoOuterMinimal]}>
        <View style={[styles.logoRing, compact && styles.logoRingCompact, minimal && styles.logoRingMinimal]}>
          <Text style={[styles.logoLetter, compact && styles.logoLetterCompact, minimal && styles.logoLetterMinimal]}>Z</Text>
        </View>
      </View>
      <View style={centered && styles.textCenter}>
        <Text style={[styles.name, large && !minimal && styles.nameLarge, minimal && styles.nameMinimal]}>Zygo</Text>
        {subtitle ? <Text style={[styles.sub, minimal && styles.subMinimal]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  wrapCompact: { marginBottom: 0, gap: 12 },
  wrapCenter: { flexDirection: 'column', alignItems: 'center' },
  wrapCenterCompact: { gap: 12 },
  wrapMinimal: { gap: 6 },
  textCenter: { alignItems: 'center' },
  logoOuter: {
    padding: 3,
    borderRadius: radii.lg + 4,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  logoOuterCompact: { padding: 2 },
  logoRing: {
    width: 56,
    height: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  logoRingCompact: {
    width: 52,
    height: 52,
    borderRadius: 16,
    shadowRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.5)',
  },
  logoLetter: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    textShadowColor: colors.primaryBright,
    textShadowRadius: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  nameLarge: { fontSize: 32, letterSpacing: -0.5 },
  logoLetterCompact: { fontSize: 24 },
  logoOuterMinimal: { padding: 2 },
  logoRingMinimal: {
    width: 44,
    height: 44,
    borderRadius: 14,
    shadowRadius: 10,
  },
  logoLetterMinimal: { fontSize: 22 },
  nameMinimal: { fontSize: 24, letterSpacing: -0.3 },
  sub: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
    textAlign: 'center',
  },
  subMinimal: { fontSize: 12, marginTop: 2, lineHeight: 16 },
});
