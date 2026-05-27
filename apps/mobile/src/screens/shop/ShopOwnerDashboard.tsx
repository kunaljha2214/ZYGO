import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchShopDashboard } from '../../api/shopDashboard';
import {
  fetchShopOpenStatus,
  setShopOpenStatus,
  fetchShopCustomerVisibility,
  type ShopCustomerVisibility,
} from '../../api/shopOwner';
import type { ShopDashboard } from '../../types/shopDashboard';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { MiniBarChart } from '../../components/dashboard/MiniBarChart';
import { ShopOpenToggle } from '../../components/shop/ShopOpenToggle';
import { colors, radii, spacing } from '../../theme';

import { statusLabel as orderStatusLabel, statusColor as orderStatusColor } from './orderLabels';

function formatStatus(status: string): string {
  return orderStatusLabel(status);
}

function statusColor(status: string): string {
  return orderStatusColor(status);
}

type Props = {
  shopName: string;
};

export function ShopOwnerDashboard({ shopName }: Props) {
  const [data, setData] = useState<ShopDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [openToggling, setOpenToggling] = useState(false);
  const [customerVisibility, setCustomerVisibility] = useState<ShopCustomerVisibility | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [dash, openStatus, visibility] = await Promise.all([
        fetchShopDashboard(),
        fetchShopOpenStatus(),
        fetchShopCustomerVisibility().catch(() => null),
      ]);
      setData(dash);
      setIsOpen(openStatus.isAcceptingOrders);
      setCustomerVisibility(visibility);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  async function onToggleOpen(next: boolean) {
    const prev = isOpen;
    setIsOpen(next);
    setOpenToggling(true);
    try {
      const res = await setShopOpenStatus(next);
      setIsOpen(res.isAcceptingOrders);
      const visibility = await fetchShopCustomerVisibility().catch(() => null);
      setCustomerVisibility(visibility);
    } catch (e) {
      setIsOpen(prev);
      AppAlert.alert(
        'Could not update shop status',
        e instanceof Error ? e.message : 'Please try again.'
      );
    } finally {
      setOpenToggling(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  if (err && !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{err}</Text>
      </View>
    );
  }

  if (!data) return null;

  const s = data.summary;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      <Text style={styles.greeting}>Welcome back</Text>
      <Text style={styles.shopTitle}>{shopName || data.shopName}</Text>
      <Text style={styles.rating}>⭐ {data.ratingLabel}</Text>

      <ShopOpenToggle
        isOpen={isOpen}
        loading={openToggling}
        onToggle={(v) => void onToggleOpen(v)}
      />

      {customerVisibility ? (
        <View
          style={[
            styles.visibilityCard,
            customerVisibility.listVisible ? styles.visibilityOk : styles.visibilityWarn,
          ]}
        >
          <Text style={styles.visibilityTitle}>Customer app visibility</Text>
          <Text style={styles.visibilitySummary}>{customerVisibility.customerListSummary}</Text>
          {!customerVisibility.subscriptionActive ? (
            <Text style={styles.visibilityMeta}>
              Renew your monthly plan to appear on the customer restaurant list.
            </Text>
          ) : null}
          {customerVisibility.availabilityLabel && customerVisibility.listVisible ? (
            <Text style={styles.visibilityMeta}>{customerVisibility.availabilityLabel}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <MetricCard label="Orders today" value={String(s.ordersToday)} />
        <MetricCard label="Revenue today" value={`₹${s.revenueToday}`} accent={colors.primaryBright} />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard label="Pending orders" value={String(s.pendingOrders)} accent="#fbbf24" />
        <MetricCard label="Cancelled today" value={String(s.cancelledToday)} accent={colors.error} />
      </View>

      <Text style={styles.section}>Live order tracking</Text>
      {data.liveOrders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active orders right now.</Text>
        </View>
      ) : (
        data.liveOrders.map((o) => (
          <View key={o.id} style={styles.orderCard}>
            <View style={styles.orderTop}>
              <Text style={styles.orderNum}>{o.orderNumber}</Text>
              <Text style={[styles.orderStatus, { color: statusColor(o.status) }]}>
                {formatStatus(o.status)}
              </Text>
            </View>
            <Text style={styles.orderMeta}>
              ₹{o.total} · {o.itemCount} items · {new Date(o.createdAt).toLocaleTimeString()}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Top-selling items</Text>
      {data.topSellingItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sales data will appear after customer orders.</Text>
        </View>
      ) : (
        data.topSellingItems.map((item, idx) => (
          <View key={item.name} style={styles.rankRow}>
            <Text style={styles.rank}>#{idx + 1}</Text>
            <View style={styles.rankBody}>
              <Text style={styles.rankName}>{item.name}</Text>
              <Text style={styles.rankMeta}>
                {item.quantity} sold · ₹{Math.round(item.revenue)}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.chartGap}>
        <MiniBarChart
          title="Daily sales (7 days)"
          data={data.dailySales.map((d) => ({ label: d.label, value: d.revenue }))}
          valuePrefix="₹"
        />
      </View>

      <View style={styles.chartGap}>
        <MiniBarChart
          title="Weekly trends"
          data={data.weeklyTrends.map((w) => ({ label: w.label, value: w.revenue }))}
          valuePrefix="₹"
        />
      </View>

      <View style={styles.chartGap}>
        <MiniBarChart
          title="Peak order times"
          data={data.peakOrderTimes.map((p) => ({ label: p.label, value: p.count }))}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.md, gap: spacing.stackGap },
  center: { padding: spacing.xxl, alignItems: 'center' },
  err: { color: colors.error, textAlign: 'center' },
  greeting: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  shopTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 6 },
  rating: { fontSize: 14, color: colors.primaryBright, fontWeight: '600', marginBottom: 18 },
  visibilityCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  visibilityOk: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.glassBorder,
  },
  visibilityWarn: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  visibilityTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  visibilitySummary: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  visibilityMeta: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.md},
  emptyCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 16},
  emptyText: { color: colors.textMuted, fontSize: 14 },
  orderCard: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    marginBottom: 0},
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderNum: { color: colors.text, fontWeight: '800', fontSize: 15 },
  orderStatus: { fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  orderMeta: { color: colors.textSecondary, fontSize: 13 },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  rank: { color: colors.primaryBright, fontWeight: '800', width: 28 },
  rankBody: { flex: 1 },
  rankName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  rankMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  chartGap: { marginTop: spacing.md }});
