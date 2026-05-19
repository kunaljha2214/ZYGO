import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppScreen } from '../../components/layout/AppScreen';
import { spacing } from '../../theme/spacing';
import {
  fetchOrderAlerts,
  fetchShopOrderInsights,
  fetchShopOrders,
} from '../../api/shopOrders';
import type { OrderBatch, ShopOrder } from '../../types/shopOrders';
import type { ShopOrdersStackParamList } from '../../navigation/types';
import { colors, radii } from '../../theme';
import { statusColor, statusLabel } from './orderLabels';

type Nav = NativeStackNavigationProp<ShopOrdersStackParamList, 'OrdersHome'>;
type Filter = 'new' | 'active' | 'all';

const ACTIVE = new Set(['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery']);

function filterOrders(orders: ShopOrder[], f: Filter): ShopOrder[] {
  if (f === 'new') return orders.filter((o) => o.status === 'placed');
  if (f === 'active') return orders.filter((o) => ACTIVE.has(o.status));
  return orders;
}

function OrderCard({
  order,
  onPress,
  highlight}: {
  order: ShopOrder;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        highlight && styles.cardNew,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.orderNum}>{order.orderNumber}</Text>
        <View style={[styles.badge, { borderColor: statusColor(order.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(order.status) }]}>
            {statusLabel(order.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.cardMeta}>
        {order.itemCount} items · ₹{order.total.toFixed(0)}
        {order.estimatedPrepMinutes ? ` · ~${order.estimatedPrepMinutes} min` : ''}
      </Text>
      {order.kitchenStation ? (
        <Text style={styles.station}>Station: {order.kitchenStation}</Text>
      ) : null}
      {order.delayRiskMinutes && order.delayRiskMinutes > 5 ? (
        <Text style={styles.delayWarn}>Delay risk ~{order.delayRiskMinutes} min</Text>
      ) : null}
    </Pressable>
  );
}

export function ShopOrdersScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('new');
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [batches, setBatches] = useState<OrderBatch[]>([]);
  const [insights, setInsights] = useState<Awaited<ReturnType<typeof fetchShopOrderInsights>> | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [newAlertIds, setNewAlertIds] = useState<string[]>([]);
  const lastPollRef = useRef(new Date().toISOString());
  const seenAlertsRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, ins] = await Promise.all([fetchShopOrders(), fetchShopOrderInsights()]);
      setOrders(list.orders);
      setBatches(list.batches);
      setInsights(ins);
    } catch (e) {
      AppAlert.alert('Orders', e instanceof Error ? e.message : 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const pollAlerts = useCallback(async () => {
    try {
      const data = await fetchOrderAlerts(lastPollRef.current);
      lastPollRef.current = data.polledAt;
      setPendingCount(data.pendingCount);
      const fresh = data.alerts.filter((a) => !seenAlertsRef.current.has(a.id));
      if (fresh.length > 0) {
        fresh.forEach((a) => seenAlertsRef.current.add(a.id));
        setNewAlertIds(fresh.map((a) => a.id));
        AppAlert.alert(
          'New order',
          `${fresh.length} new order${fresh.length > 1 ? 's' : ''} received`,
          [{ text: 'View', onPress: () => setFilter('new') }]
        );
        void load();
      }
    } catch {
      /* polling quiet fail */
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void pollAlerts();
      const id = setInterval(() => void pollAlerts(), 8000);
      return () => clearInterval(id);
    }, [load, pollAlerts])
  );

  useEffect(() => {
    if (newAlertIds.length === 0) return;
    const t = setTimeout(() => setNewAlertIds([]), 12000);
    return () => clearTimeout(t);
  }, [newAlertIds]);

  const visible = filterOrders(orders, filter);

  return (
    <AppScreen
      scroll={false}
      tab
      title="Order management"
      subtitle="Real-time kitchen & delivery flow"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {pendingCount > 0 ? (
          <Pressable style={styles.alertBanner} onPress={() => setFilter('new')}>
            <Text style={styles.alertTitle}>🔔 {pendingCount} orders need attention</Text>
            <Text style={styles.alertSub}>Tap to view new & active orders</Text>
          </Pressable>
        ) : null}

        <View style={styles.actions}>
          <Pressable style={styles.kdsBtn} onPress={() => navigation.navigate('KitchenDisplay')}>
            <Text style={styles.kdsBtnText}>Kitchen display</Text>
          </Pressable>
        </View>

        <View style={styles.chips}>
          {(['new', 'active', 'all'] as Filter[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.chip, filter === f && styles.chipOn]}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextOn]}>
                {f === 'new' ? 'New' : f === 'active' ? 'Active' : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>

        {batches.length > 0 ? (
          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>Smart batching</Text>
            {batches.slice(0, 2).map((b) => (
              <Text key={b.batchId} style={styles.insightLine}>
                {b.orderIds.length} orders — {b.reason}
              </Text>
            ))}
          </View>
        ) : null}

        {insights && insights.delayPredictions.some((d) => d.delayRiskMinutes > 5) ? (
          <View style={styles.insightBox}>
            <Text style={styles.insightTitle}>Delay prediction</Text>
            {insights.delayPredictions
              .filter((d) => d.delayRiskMinutes > 5)
              .slice(0, 3)
              .map((d) => (
                <Text key={d.orderId} style={styles.insightLine}>
                  {d.orderNumber}: ~{d.delayRiskMinutes} min risk
                </Text>
              ))}
          </View>
        ) : null}

        {loading && orders.length === 0 ? (
          <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 24 }} />
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>No orders in this view</Text>
        ) : (
          visible.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              highlight={newAlertIds.includes(o.id)}
              onPress={() => navigation.navigate('ShopOrderDetail', { orderId: o.id })}
            />
          ))
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.md },
  scroll: { gap: spacing.stackGap, paddingBottom: spacing.md },
  alertBanner: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  alertTitle: { color: colors.text, fontWeight: '800', fontSize: 15 },
  alertSub: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  kdsBtn: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  kdsBtnText: { color: colors.primaryBright, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  chipOn: { backgroundColor: colors.chipActiveBg },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: colors.lavender },
  insightBox: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  insightTitle: { color: colors.lavender, fontWeight: '700', marginBottom: 6 },
  insightLine: { color: colors.textSecondary, fontSize: 12, marginBottom: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardNew: {
    borderColor: colors.primaryBright,
    shadowColor: colors.primaryBright,
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cardPressed: { opacity: 0.9 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderNum: { color: colors.text, fontWeight: '800', fontSize: 16 },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardMeta: { color: colors.textSecondary, marginTop: 8, fontSize: 13 },
  station: { color: colors.primaryBright, marginTop: 6, fontSize: 12, fontWeight: '600' },
  delayWarn: { color: '#fbbf24', marginTop: 4, fontSize: 12 },
});
