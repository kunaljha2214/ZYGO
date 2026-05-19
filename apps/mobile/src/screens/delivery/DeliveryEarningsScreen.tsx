import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { fetchEarningsDashboard } from '../../api/deliveryPartner';
import type { EarningsDashboard } from '../../types/deliveryPartner';
import { colors, spacing } from '../../theme';

export function DeliveryEarningsScreen() {
  const [data, setData] = useState<EarningsDashboard | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchEarningsDashboard().then(setData);
    }, [])
  );

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} />
      </View>
    );
  }

  return (
    <StackScroll>
      <View style={styles.row}>
        <MetricCard label="Today" value={`₹${data.todayEarnings}`} accent={colors.primaryBright} />
        <MetricCard label="This week" value={`₹${data.weeklyEarnings}`} />
      </View>
      <View style={styles.row}>
        <MetricCard label="Today trips" value={String(data.todayDeliveries)} />
        <MetricCard label="Week trips" value={String(data.weeklyDeliveries)} />
      </View>
      <Text style={styles.section}>Performance</Text>
      <Text style={styles.line}>Rating {data.rating}★ · Accept {data.acceptanceRate}%</Text>
      <Text style={styles.line}>On-time {data.onTimeRate}% · Cancel {data.cancellationRate}%</Text>
      <Text style={styles.section}>Incentives</Text>
      <Text style={styles.line}>₹{data.incentives} bonus (demo)</Text>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  section: { color: colors.lavender, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.sm },
  line: { color: colors.textSecondary, marginBottom: spacing.xs }});
