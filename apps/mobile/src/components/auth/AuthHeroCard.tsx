import React, { type ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../../theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  /** Expand to fill remaining screen height */
  fill?: boolean;
};

function wantsStretch(style?: StyleProp<ViewStyle>, fill?: boolean) {
  if (fill) return true;
  const flat = StyleSheet.flatten(style);
  return flat?.flex === 1 || flat?.minHeight != null;
}

/** Single sign-in panel with neon purple glow border (Stitch reference). */
export function AuthHeroCard({ children, style, compact, fill }: Props) {
  const stretch = wantsStretch(style, fill);

  return (
    <View style={[styles.glow, compact && styles.glowCompact, fill && styles.glowFill, style]}>
      <View
        style={[
          styles.card,
          compact && styles.cardCompact,
          stretch && styles.cardStretch,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    borderRadius: radii.xl + 2,
    padding: 1.5,
    backgroundColor: 'rgba(168, 85, 247, 0.45)',
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
    marginBottom: 24,
    alignSelf: 'stretch',
  },
  glowCompact: {
    marginBottom: 0,
    shadowRadius: 14,
    elevation: 8,
  },
  glowFill: {
    flex: 1,
    marginBottom: 0,
  },
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    padding: 22,
  },
  cardCompact: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  cardStretch: {
    flex: 1,
    minHeight: 0,
  },
});
