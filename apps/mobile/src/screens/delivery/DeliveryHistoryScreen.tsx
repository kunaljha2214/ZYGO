import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreen } from '../../components/layout/AppScreen';
import { GlassCard } from '../../components/neon/GlassCard';
import { fetchDeliveryHistory } from '../../api/deliveryPartner';
import { colors, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';

export function DeliveryHistoryScreen() {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchDeliveryHistory>>>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void fetchDeliveryHistory()
        .then(setHistory)
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <AppScreen scroll eyebrow="Delivery" title="Delivery history" subtitle="Loading…">
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryBright} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll eyebrow="Delivery" title="Delivery history" subtitle="Completed food trips">
      <FlatList
        data={history}
        keyExtractor={(h) => h.id}
        scrollEnabled={false}
        ListEmptyComponent={
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No deliveries yet</Text>
            <Text style={styles.emptySub}>Completed trips and earnings show up here.</Text>
          </GlassCard>
        }
        renderItem={({ item }) => (
          <GlassCard style={styles.rowCard}>
            <Text style={styles.num}>{item.orderNumber}</Text>
            <Text style={styles.meta} numberOfLines={2}>
              {item.restaurantName ?? 'Restaurant'} · {formatInr(item.total)}
            </Text>
            <Text style={styles.earn}>+{formatInr(item.earnings ?? 0)} earned</Text>
          </GlassCard>
        )}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  rowCard: { marginBottom: spacing.md },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { color: colors.lavender, fontWeight: '800', fontSize: 16, marginBottom: 6 },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center' },
  num: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 4 },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  earn: { color: '#4ade80', fontWeight: '700', marginTop: spacing.sm, fontSize: 14 },
});
