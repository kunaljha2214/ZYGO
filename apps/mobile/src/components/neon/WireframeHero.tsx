import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

type Size = 'full' | 'compact' | 'minimal';

type Props = {
  compact?: boolean;
  minimal?: boolean;
  size?: Size;
};

function resolveSize(props: Props): Size {
  if (props.minimal || props.size === 'minimal') return 'minimal';
  if (props.compact || props.size === 'compact') return 'compact';
  if (props.size === 'full') return 'full';
  return 'full';
}

/** Neon wireframe terrain silhouette with horizon glow. */
export function WireframeHero(props: Props) {
  const size = resolveSize(props);
  const h = size === 'minimal' ? 52 : size === 'compact' ? 88 : 200;
  const peaks = size === 'minimal' ? MINI_PEAKS : PEAKS;
  const peakBottom = size === 'minimal' ? 10 : size === 'compact' ? 18 : 28;

  return (
    <View style={[styles.wrap, { height: h }]} accessibilityElementsHidden>
      <View
        style={[
          styles.horizonGlow,
          size === 'compact' && styles.horizonGlowCompact,
          size === 'minimal' && styles.horizonGlowMinimal,
        ]}
      />
      <View style={[styles.horizonLine, size === 'minimal' && styles.horizonLineMinimal]} />
      {peaks.map((p, i) => (
        <View
          key={i}
          style={[
            styles.peak,
            {
              left: p.left,
              bottom: peakBottom,
              borderLeftWidth: p.w / 2,
              borderRightWidth: p.w / 2,
              borderBottomWidth: p.h,
              opacity: p.o,
            },
          ]}
        />
      ))}
      {size === 'full' &&
        STARS.map((s, i) => (
          <View
            key={`s${i}`}
            style={[styles.star, { left: s.left, top: s.top, opacity: s.o }]}
          />
        ))}
    </View>
  );
}

const PEAKS: Array<{ left: `${number}%`; w: number; h: number; o: number }> = [
  { left: '6%', w: 44, h: 36, o: 0.25 },
  { left: '14%', w: 56, h: 58, o: 0.4 },
  { left: '26%', w: 68, h: 82, o: 0.55 },
  { left: '38%', w: 80, h: 108, o: 0.85 },
  { left: '50%', w: 72, h: 96, o: 1 },
  { left: '62%', w: 64, h: 78, o: 0.7 },
  { left: '74%', w: 52, h: 56, o: 0.45 },
  { left: '84%', w: 40, h: 38, o: 0.3 },
];

const MINI_PEAKS: Array<{ left: `${number}%`; w: number; h: number; o: number }> = [
  { left: '18%', w: 36, h: 22, o: 0.35 },
  { left: '32%', w: 48, h: 34, o: 0.6 },
  { left: '46%', w: 56, h: 40, o: 0.9 },
  { left: '60%', w: 44, h: 30, o: 0.55 },
  { left: '72%', w: 32, h: 20, o: 0.35 },
];

const STARS: Array<{ left: `${number}%`; top: number; o: number }> = [
  { left: '12%', top: 18, o: 0.35 },
  { left: '28%', top: 32, o: 0.5 },
  { left: '72%', top: 24, o: 0.4 },
  { left: '88%', top: 40, o: 0.25 },
];

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
  },
  horizonGlow: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    bottom: 24,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primaryGlow,
    opacity: 0.5,
  },
  horizonGlowCompact: {
    height: 48,
    bottom: 14,
    opacity: 0.4,
  },
  horizonGlowMinimal: {
    height: 28,
    bottom: 8,
    left: '22%',
    right: '22%',
    opacity: 0.35,
  },
  horizonLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 26,
    height: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.35)',
    shadowColor: colors.primaryBright,
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  horizonLineMinimal: { bottom: 10 },
  peak: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(168, 85, 247, 0.12)',
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.lavender,
    shadowColor: colors.primary,
    shadowOpacity: 1,
    shadowRadius: 6,
  },
});
