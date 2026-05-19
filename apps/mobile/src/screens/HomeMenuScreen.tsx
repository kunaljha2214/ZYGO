import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { HomeStackProps } from '../navigation/types';
import type { MainTabParamList } from '../navigation/types';
import { AppScreen } from '../components/layout/AppScreen';
import { Button } from '../components/Button';
import { ServiceTile } from '../components/ServiceTile';
import { WireframeHero } from '../components/neon/WireframeHero';
import { GlassCard } from '../components/neon/GlassCard';
import { SectionHeader } from '../components/neon/SectionHeader';
import { CircularGauge } from '../components/neon/CircularGauge';
import { MetricsGrid } from '../components/neon/MetricsGrid';
import { ActivityBars } from '../components/neon/ActivityBars';
import { ActivityPeriodDropdown } from '../components/home/ActivityPeriodDropdown';
import { useServiceStore } from '../store/serviceStore';
import { useHomePulse, type ActivityPeriodDays } from '../hooks/useHomePulse';
import { colors, radii, spacing } from '../theme';
import { type } from '../theme/typography';

type Props = HomeStackProps<'HomeMenu'>;
type TabNav = BottomTabNavigationProp<MainTabParamList>;

function liveStatusText(activeCount: number): string {
  if (activeCount === 0) return 'No active orders';
  if (activeCount === 1) return '1 order in progress';
  return `${activeCount} orders in progress`;
}

export function HomeMenuScreen({ navigation }: Props) {
  const tabNav = useNavigation<TabNav>();
  const [periodDays, setPeriodDays] = useState<ActivityPeriodDays>(7);
  const service = useServiceStore((s) => s.service);
  const setService = useServiceStore((s) => s.setService);
  const hydrate = useServiceStore((s) => s.hydrate);
  const { data: pulse, isLoading, isFetching } = useHomePulse(periodDays);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const isFood = service === 'food';
  const stats = pulse!;

  function onGetStarted() {
    if (isFood) {
      void setService('food');
      navigation.navigate('RestaurantList');
    } else {
      void setService('rides');
      navigation.navigate('RidePlan');
    }
  }

  const activeLabel =
    stats.activeCount === 0
      ? 'None'
      : stats.activeCount === 1
        ? '1 active'
        : `${stats.activeCount} active`;

  const chartSubtitle =
    periodDays === 1
      ? 'Today by time'
      : periodDays === 7
        ? 'Food + rides'
        : 'Weekly (30 days)';

  return (
    <AppScreen scroll tab>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.brand}>Zygo</Text>
          <Text style={styles.brandTag}>Food · Rides · One app</Text>
        </View>
        <Pressable
          onPress={() => tabNav.navigate('Orders')}
          style={[styles.livePill, stats.hasLiveActivity && styles.livePillOn]}
        >
          <View style={[styles.liveDot, stats.hasLiveActivity && styles.liveDotOn]} />
          <View>
            <Text style={[styles.liveText, stats.hasLiveActivity && styles.liveTextOn]}>
              {stats.hasLiveActivity ? 'Live' : 'Idle'}
            </Text>
            <Text style={styles.liveSub} numberOfLines={2}>
              {liveStatusText(stats.activeCount)}
            </Text>
          </View>
        </Pressable>
      </View>

      <GlassCard noPadding style={styles.heroCard}>
        <WireframeHero />
        <View style={styles.heroOverlay}>
          <Text style={styles.heroEyebrow}>{isFood ? 'Delivery' : 'Mobility'}</Text>
          <Text style={type.title}>
            {isFood ? 'Order from nearby kitchens' : 'Rides with upfront fares'}
          </Text>
          <Text style={[type.subtitle, styles.heroSub]}>
            {isFood
              ? 'Track orders in real time · Pay on delivery'
              : 'Bike, auto, or car · See price before you book'}
          </Text>
        </View>
      </GlassCard>

      <SectionHeader title="Choose a service" />
      <ServiceTile
        icon="🍽"
        title="Food delivery"
        description="Restaurants near you with menus and live tracking"
        meta="Cash on delivery"
        active={isFood}
        onPress={() => {
          void setService('food');
          navigation.navigate('RestaurantList');
        }}
      />
      <ServiceTile
        icon="🛵"
        title="Book a ride"
        description="Upfront fare estimates before you confirm"
        meta="Bike · Auto · Car"
        active={!isFood}
        onPress={() => {
          void setService('rides');
          navigation.navigate('RidePlan');
        }}
      />

      <View style={styles.activityHeader}>
        <Pressable style={styles.activityTitleWrap} onPress={() => tabNav.navigate('Orders')}>
          <Text style={type.label}>Your activity</Text>
        </Pressable>
        <ActivityPeriodDropdown
          value={periodDays}
          onChange={setPeriodDays}
          disabled={isLoading}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Loading your orders…</Text>
        </View>
      ) : (
        <>
          {isFetching ? (
            <Text style={styles.updating}>Updating…</Text>
          ) : null}
          <View style={styles.widgetGrid}>
            <CircularGauge
              label="Live now"
              unit="Always"
              value={activeLabel}
              progress={stats.activeGaugeProgress}
            />
            <MetricsGrid
              title={stats.periodLabel}
              headline={String(stats.periodTotal)}
              items={[
                { label: 'Food', value: String(stats.periodFood) },
                { label: 'Rides', value: String(stats.periodRides) },
                { label: 'Spent', value: `₹${Math.round(stats.periodSpent)}` },
              ]}
            />
          </View>
          <View style={styles.widgetWide}>
            <ActivityBars
              subtitle={chartSubtitle}
              highlightLabel={stats.highlightBarCount}
              bars={stats.activityBars}
            />
          </View>
          <Text style={styles.pulseHint}>
            <Text style={styles.pulseHintBold}>Live (top right): </Text>
            food or rides still being prepared, delivered, or on trip — not finished yet.{' '}
            <Text style={styles.pulseHintBold}>Live now ring: </Text>
            same count. Chart and totals use the period you pick above. Tap activity title for
            full history.
          </Text>
        </>
      )}

      <View style={styles.ctaBlock}>
        <Button
          title={isFood ? 'Browse restaurants' : 'Plan a ride'}
          onPress={onGetStarted}
        />
        <Text style={styles.ctaHint}>Switch service anytime from home</Text>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: 12},
  headerLeft: { flex: 1 },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5},
  brandTag: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500'},
  livePill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: 148,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.glassBorder},
  livePillOn: {
    backgroundColor: colors.primarySoft,
    borderColor: 'rgba(168, 85, 247, 0.35)'},
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
    marginTop: 4},
  liveDotOn: {
    backgroundColor: colors.primaryBright,
    shadowColor: colors.primary,
    shadowOpacity: 1,
    shadowRadius: 6},
  liveText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  liveTextOn: { color: colors.lavender },
  liveSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 13,
    fontWeight: '500'},
  heroCard: { marginBottom: spacing.section },
  heroOverlay: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 4,
    marginTop: -8},
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryBright,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 6},
  heroSub: { marginTop: 8 },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md},
  activityTitleWrap: { flex: 1 },
  widgetGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12},
  widgetWide: { marginBottom: spacing.sm },
  updating: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 8,
    textAlign: 'right'},
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: spacing.xl,
    justifyContent: 'center'},
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  pulseHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: spacing.section,
    paddingHorizontal: 4},
  pulseHintBold: { fontWeight: '700', color: colors.textSecondary },
  ctaBlock: { gap: spacing.md, marginTop: spacing.xs },
  ctaHint: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500'}});
