import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { fetchDeliveryHistory } from '../../api/deliveryPartner';
import { colors, spacing } from '../../theme';

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
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} />
      </View>
    );
  }

  return (
    <StackScroll>
      {history.length === 0 ? (
        <Text style={styles.empty}>No completed deliveries yet.</Text>
      ) : (
        history.map((h) => (
          <View key={h.id} style={styles.card}>
            <Text style={styles.num}>{h.orderNumber}</Text>
            <Text style={styles.meta}>
              {h.restaurantName} · ₹{h.total} · +₹{h.earnings ?? 0}
            </Text>
          </View>
        ))
      )}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: colors.textMuted, textAlign: 'center' },
  card: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder},
  num: { color: colors.text, fontWeight: '800' },
  meta: { color: colors.textMuted, marginTop: 4, fontSize: 13 }});
