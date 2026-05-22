import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppScreen } from '../../components/layout/AppScreen';
import { GlassCard } from '../../components/neon/GlassCard';
import { fetchDriverHistory } from '../../api/driver';
import { colors, spacing, radii } from '../../theme';

export function DriverHistoryScreen() {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof fetchDriverHistory>>>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void fetchDriverHistory()
        .then(setHistory)
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <AppScreen scroll eyebrow="Captain" title="Ride history" subtitle="Loading…">
        <View style={styles.center}>
          <ActivityIndicator color={colors.primaryBright} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll eyebrow="Captain" title="Ride history" subtitle="Past trips & earnings">
      <FlatList
        data={history}
        keyExtractor={(h) => h.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <GlassCard style={styles.rowCard}>
            <View style={styles.row}>
              <Text style={styles.earn}>₹{item.driverEarned.toFixed(2)}</Text>
              <Text style={styles.km}>{item.distanceKm} km</Text>
            </View>
            <Text style={styles.pickup}>{item.pickup}</Text>
            <Text style={styles.drop}>→ {item.drop}</Text>
            {item.customerRating ? (
              <Text style={styles.rating}>Customer rated {item.customerRating}★</Text>
            ) : null}
          </GlassCard>
        )}
        ListEmptyComponent={
          <GlassCard style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptySub}>Completed trips will show here with earnings.</Text>
          </GlassCard>
        }
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.xl },
  rowCard: { marginBottom: spacing.md },
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  earn: { color: '#4ade80', fontWeight: '800', fontSize: 20 },
  km: { color: colors.lavender, fontWeight: '700' },
  pickup: { color: colors.text, fontWeight: '600' },
  drop: { color: colors.textSecondary, marginTop: 4 },
  rating: {
    color: colors.primaryBright,
    marginTop: spacing.sm,
    fontSize: 12,
    fontWeight: '600'},
  emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  emptySub: { color: colors.textMuted, marginTop: spacing.xs }});
