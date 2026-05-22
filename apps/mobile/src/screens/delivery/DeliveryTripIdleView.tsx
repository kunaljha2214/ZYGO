import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { GlassCard } from '../../components/neon/GlassCard';
import { WireframeHero } from '../../components/neon/WireframeHero';
import { Button } from '../../components/Button';
import { colors, radii, spacing } from '../../theme';

type Props = {
  onDeliveryHistory: () => void;
  onGoHub: () => void;
};

export function DeliveryTripIdleView({ onDeliveryHistory, onGoHub }: Props) {
  return (
    <AppScreen tab scroll eyebrow="Delivery" title="Your trip" subtitle="No active delivery">
      <View style={styles.heroWrap}>
        <WireframeHero compact />
        <View style={styles.heroIcon}>
          <Text style={styles.heroEmoji}>🚴</Text>
        </View>
      </View>

      <Text style={styles.emptyTitle}>No active delivery</Text>
      <Text style={styles.emptySub}>
        Stay online on the Hub tab to receive food orders. Accepted deliveries appear here with
        restaurant, customer, and navigation.
      </Text>

      <GlassCard style={styles.tipCard}>
        <Text style={styles.tipEmoji}>🟢</Text>
        <View style={styles.tipBody}>
          <Text style={styles.tipTitle}>Hub · Online</Text>
          <Text style={styles.tipText}>
            Turn Online ON on Hub. New delivery offers show as a popup — accept to start this trip.
          </Text>
        </View>
      </GlassCard>

      <Button title="Delivery history" onPress={onDeliveryHistory} style={styles.historyBtn} />

      <Pressable onPress={onGoHub} style={styles.linkWrap}>
        <Text style={styles.link}>Go to Hub tab →</Text>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    marginBottom: spacing.lg,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
  },
  heroIcon: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBright,
  },
  heroEmoji: { fontSize: 22 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  tipEmoji: { fontSize: 28 },
  tipBody: { flex: 1 },
  tipTitle: { color: colors.lavender, fontWeight: '800', fontSize: 14, marginBottom: 4 },
  tipText: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
  historyBtn: { marginBottom: spacing.md },
  linkWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  link: { color: colors.primaryBright, fontWeight: '700', fontSize: 15 },
});
