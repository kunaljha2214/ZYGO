import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { Card } from '../../components/Card';
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
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} />
      </View>
    );
  }

  return (
    <StackScroll>
      <FlatList
        data={history}
        keyExtractor={(h) => h.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.earn}>₹{item.driverEarned}</Text>
              <Text style={styles.km}>{item.distanceKm} km</Text>
            </View>
            <Text style={styles.pickup}>{item.pickup}</Text>
            <Text style={styles.drop}>→ {item.drop}</Text>
            {item.customerRating ? (
              <Text style={styles.rating}>Customer rated {item.customerRating}★</Text>
            ) : null}
          </Card>
        )}
        ListEmptyComponent={
          <Card>
            <Text style={styles.emptyTitle}>No rides yet</Text>
            <Text style={styles.emptySub}>Completed trips will show here with earnings.</Text>
          </Card>
        }
      />
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
