import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { OrdersStackProps } from '../navigation/types';
import { api } from '../api/client';
import { AppScreen } from '../components/layout/AppScreen';
import { GlassCard } from '../components/neon/GlassCard';
import { OrderListCard } from '../components/orders/OrderListCard';
import { colors, spacing } from '../theme';

type FoodRow = {
  id: string;
  type: 'food';
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
};

type RideRow = {
  id: string;
  type: 'ride';
  fare: number;
  status: string;
  createdAt: string;
  drop: { line1: string };
};

type Row = (FoodRow | RideRow) & { sortKey: number };

type Props = OrdersStackProps<'OrdersList'>;

export function OrdersListScreen({ navigation }: Props) {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['orders-unified'],
    queryFn: async () => {
      const [foodRes, rideRes] = await Promise.all([
        api.get<FoodRow[]>('/orders'),
        api.get<RideRow[]>('/rides'),
      ]);
      const food: Row[] = foodRes.data.map((o) => ({
        ...o,
        sortKey: new Date(o.createdAt).getTime(),
      }));
      const rides: Row[] = rideRes.data.map((r) => ({
        ...r,
        sortKey: new Date(r.createdAt).getTime(),
      }));
      return [...food, ...rides].sort((a, b) => b.sortKey - a.sortKey);
    },
  });

  if (isLoading) {
    return (
      <AppScreen tab eyebrow="Activity" title="Orders" subtitle="Food & rides in one place">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryBright} />
          <Text style={styles.loadingText}>Loading your orders…</Text>
        </View>
      </AppScreen>
    );
  }

  const count = data?.length ?? 0;

  return (
    <AppScreen
      tab
      scroll={false}
      eyebrow="Activity"
      title="Orders"
      subtitle={count ? `${count} order${count === 1 ? '' : 's'}` : 'Food delivery & ride history'}
    >
      <FlatList
        style={styles.listFlex}
        data={data}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        onRefresh={() => void refetch()}
        refreshing={isRefetching}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <GlassCard style={styles.empty}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>
              Book a ride or order food from Home — everything shows up here.
            </Text>
          </GlassCard>
        }
        renderItem={({ item }) => {
          if (item.type === 'food') {
            return (
              <OrderListCard
                kind="food"
                title={item.orderNumber}
                amount={item.total}
                status={item.status}
                onPress={() => navigation.navigate('FoodOrderDetail', { orderId: item.id })}
              />
            );
          }
          return (
            <OrderListCard
              kind="ride"
              title={item.drop.line1}
              amount={item.fare}
              status={item.status}
              onPress={() => navigation.navigate('RideDetail', { rideId: item.id })}
            />
          );
        }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listFlex: { flex: 1 },
  center: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  loadingText: { color: colors.textMuted, marginTop: spacing.md, fontSize: 14 },
  list: { paddingBottom: spacing.xl },
  empty: { alignItems: 'center', paddingVertical: spacing.xl * 1.5 },
  emptyEmoji: { fontSize: 36, marginBottom: spacing.md },
  emptyTitle: { color: colors.lavender, fontWeight: '800', fontSize: 18, marginBottom: spacing.sm },
  emptySub: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
