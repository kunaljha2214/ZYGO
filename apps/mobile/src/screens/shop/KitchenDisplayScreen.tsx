import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchKitchenDisplay } from '../../api/shopOrders';
import type { KitchenDisplay, ShopOrder } from '../../types/shopOrders';
import { colors, radii, spacing } from '../../theme';
import { StackScroll } from '../../components/layout/StackScroll';
import { statusLabel } from './orderLabels';

function KdsCard({ order }: { order: ShopOrder }) {
  return (
    <View style={styles.kdsCard}>
      <Text style={styles.kdsNum}>{order.orderNumber}</Text>
      <Text style={styles.kdsStatus}>{statusLabel(order.status)}</Text>
      {order.estimatedPrepMinutes ? (
        <Text style={styles.kdsPrep}>~{order.estimatedPrepMinutes} min</Text>
      ) : null}
      {order.items.map((it, i) => (
        <Text key={i} style={styles.kdsItem}>
          {it.quantity}× {it.name}
        </Text>
      ))}
      {order.customerNotes ? (
        <Text style={styles.kdsNote}>Note: {order.customerNotes}</Text>
      ) : null}
      {order.shopNotes ? <Text style={styles.kdsNote}>Shop: {order.shopNotes}</Text> : null}
    </View>
  );
}

export function KitchenDisplayScreen() {
  const [data, setData] = useState<KitchenDisplay | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const k = await fetchKitchenDisplay();
      setData(k);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const id = setInterval(() => void load(), 5000);
      return () => clearInterval(id);
    }, [load])
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  const stations = data?.stations ?? [];
  const flat = data?.orders ?? [];

  return (
    <StackScroll
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Kitchen display</Text>
      <Text style={styles.sub}>Auto-refresh · routed by station</Text>

      {stations.length > 0
        ? stations.map(({ station, orders }) => (
            <View key={station} style={styles.section}>
              <Text style={styles.stationTitle}>{station}</Text>
              <View style={styles.grid}>
                {orders.map((o) => (
                  <KdsCard key={o.id} order={o} />
                ))}
              </View>
            </View>
          ))
        : flat.map((o) => <KdsCard key={o.id} order={o} />)}

      {flat.length === 0 ? (
        <Text style={styles.empty}>No active kitchen tickets</Text>
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050508' },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: colors.textMuted, marginBottom: 16 },
  section: { marginBottom: 20 },
  stationTitle: {
    color: colors.primaryBright,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1},
  grid: { gap: 12 },
  kdsCard: {
    backgroundColor: '#14141f',
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: 12},
  kdsNum: { color: colors.text, fontSize: 20, fontWeight: '900' },
  kdsStatus: { color: colors.lavender, fontWeight: '700', marginVertical: 6 },
  kdsPrep: { color: '#fbbf24', fontWeight: '600', marginBottom: 8 },
  kdsItem: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  kdsNote: { color: colors.error, marginTop: 8, fontWeight: '600' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 40, fontSize: 16 }});
