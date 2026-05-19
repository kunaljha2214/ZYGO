import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { Card } from '../../components/Card';
import { fetchDriverEarningsDashboard } from '../../api/driver';
import type { DriverEarningsDashboard } from '../../types/driver';
import { colors, spacing } from '../../theme';

export function DriverEarningsScreen() {
  const [data, setData] = useState<DriverEarningsDashboard | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchDriverEarningsDashboard().then(setData);
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
        <MetricCard label="Today rides" value={String(data.todayRides)} />
        <MetricCard label="Week rides" value={String(data.weeklyRides)} />
      </View>
      <Card>
        <Text style={styles.section}>Performance metrics</Text>
        <Text style={styles.line}>Rating {data.rating}★</Text>
        <Text style={styles.line}>Acceptance {data.acceptanceRate}%</Text>
        <Text style={styles.line}>Completion {data.completionRate}%</Text>
        <Text style={styles.line}>Cancellation {data.cancellationRate}%</Text>
      </Card>
      <Card glow>
        <Text style={styles.section}>Incentives</Text>
        <Text style={styles.line}>Progress {data.incentiveProgress}%</Text>
        <Text style={styles.line}>Bonus pool ₹{data.incentives} (demo)</Text>
        <Text style={styles.line}>Online hours today: {data.onlineHours}h</Text>
      </Card>
      <Card>
        <Text style={styles.section}>Sample breakdown</Text>
        <Text style={styles.line}>Ride fare ₹120</Text>
        <Text style={styles.line}>Platform fee ₹20</Text>
        <Text style={styles.earn}>Driver earned ₹100</Text>
      </Card>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  section: { color: colors.lavender, fontWeight: '800', marginBottom: spacing.sm },
  line: { color: colors.textSecondary, marginBottom: spacing.xs },
  earn: { color: '#4ade80', fontWeight: '800', fontSize: 18, marginTop: spacing.sm }});
