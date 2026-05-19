import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator} from 'react-native';
import { StackScroll } from '../../../components/layout/StackScroll';
import { spacing } from '../../../theme/spacing';
import { useFocusEffect } from '@react-navigation/native';
import { fetchShopAnalytics } from '../../../api/shopAnalytics';
import type { ShopAnalytics } from '../../../types/shopInsights';
import { MiniBarChart } from '../../../components/dashboard/MiniBarChart';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { colors, radii } from '../../../theme';

type Period = '7d' | '30d' | '90d';

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<ShopAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchShopAnalytics(period));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Could not load analytics. Ensure your shop is approved.</Text>
      </View>
    );
  }

  const s = data.salesReport;
  const adv = data.advanced;

  return (
    <StackScroll
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={styles.chips}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <Pressable
            key={p}
            style={[styles.chip, period === p && styles.chipOn]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.chipText, period === p && styles.chipTextOn]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Sales report</Text>
      <View style={styles.metricsRow}>
        <MetricCard label="Revenue" value={`₹${s.totalRevenue}`} accent={colors.primaryBright} />
        <MetricCard label="Orders" value={String(s.orderCount)} />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard label="Avg order" value={`₹${s.avgOrderValue}`} />
        <MetricCard label="Delivered" value={String(s.deliveredCount)} />
      </View>

      <MiniBarChart
        title="Daily sales"
        data={s.daily.map((d) => ({ label: d.label, value: d.revenue }))}
        valuePrefix="₹"
      />

      <Text style={styles.section}>Item-wise report</Text>
      {data.itemWiseReport.slice(0, 6).map((it) => (
        <View key={it.name} style={styles.row}>
          <Text style={styles.rowName} numberOfLines={1}>
            {it.name}
          </Text>
          <Text style={styles.rowMeta}>
            {it.quantity} sold · ₹{it.revenue} · {it.sharePercent}%
          </Text>
        </View>
      ))}

      <Text style={styles.section}>Peak hours</Text>
      <MiniBarChart
        title="Orders by hour"
        data={data.peakHours.slice(0, 6).map((h) => ({ label: h.label, value: h.count }))}
      />

      <Text style={styles.section}>Customer retention</Text>
      <View style={styles.retentionBox}>
        <Text style={styles.retentionLine}>
          {data.customerRetention.repeatCustomers} repeat / {data.customerRetention.totalCustomers}{' '}
          total ({data.customerRetention.repeatRate}%)
        </Text>
        <Text style={styles.retentionSub}>
          {data.customerRetention.newCustomers} new customers in period
        </Text>
      </View>

      <Text style={styles.section}>Cancellation analysis</Text>
      <View style={styles.retentionBox}>
        <Text style={styles.retentionLine}>
          {data.cancellationAnalysis.cancelledCount} cancelled ·{' '}
          {data.cancellationAnalysis.cancellationRate}% rate
        </Text>
        {data.cancellationAnalysis.reasons.map((r) => (
          <Text key={r.reason} style={styles.retentionSub}>
            {r.reason}: {r.count}
          </Text>
        ))}
      </View>

      <Text style={styles.section}>Advanced analytics</Text>
      <Text style={styles.advLabel}>Demand forecast (next 7 days)</Text>
      <MiniBarChart
        title="Predicted orders"
        data={adv.demandForecast.map((d) => ({ label: d.label, value: d.predictedOrders }))}
      />

      <Text style={styles.advLabel}>Inventory forecast</Text>
      {adv.inventoryForecast.map((inv) => (
        <View key={inv.itemName} style={styles.row}>
          <Text style={styles.rowName}>{inv.itemName}</Text>
          <Text style={styles.rowMeta}>
            Stock ~{inv.suggestedStock} · {inv.daysCover}d cover
          </Text>
        </View>
      ))}

      <Text style={styles.advLabel}>Profit margin (est.)</Text>
      <View style={styles.retentionBox}>
        <Text style={styles.retentionLine}>
          Revenue ₹{adv.profitMargin.revenue} · Margin {adv.profitMargin.marginPercent}%
        </Text>
        <Text style={styles.retentionSub}>
          Est. cost ₹{adv.profitMargin.estimatedCost} · Profit ₹{adv.profitMargin.grossProfit}
        </Text>
      </View>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  muted: { color: colors.textMuted, textAlign: 'center' },
  chips: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.chip},
  chipOn: { backgroundColor: colors.chipActiveBg },
  chipText: { color: colors.textMuted, fontWeight: '600' },
  chipTextOn: { color: colors.lavender },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 10},
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  rowName: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  retentionBox: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder},
  retentionLine: { color: colors.text, fontWeight: '700' },
  retentionSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  advLabel: { color: colors.textSecondary, fontWeight: '600', marginTop: 8, marginBottom: 6 }});
