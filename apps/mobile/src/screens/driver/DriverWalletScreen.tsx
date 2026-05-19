import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { Card } from '../../components/Card';
import { fetchDriverWallet } from '../../api/driver';
import { colors, spacing } from '../../theme';

export function DriverWalletScreen() {
  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof fetchDriverWallet>> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchDriverWallet().then(setWallet);
    }, [])
  );

  if (!wallet) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} />
      </View>
    );
  }

  return (
    <StackScroll>
      <View style={styles.row}>
        <MetricCard label="Pending" value={`₹${wallet.pending}`} />
        <MetricCard label="Withdrawable" value={`₹${wallet.withdrawable}`} accent={colors.primaryBright} />
      </View>
      <MetricCard label="Total earned" value={`₹${wallet.totalEarned}`} wide />
      <Card>
        <Text style={styles.section}>Recent ledger</Text>
        <FlatList
          data={wallet.entries}
          keyExtractor={(e) => e.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.entry}>
              <Text style={styles.entryTitle}>+₹{item.driverEarned}</Text>
              <Text style={styles.entrySub}>
                Fare ₹{item.amount} · Platform ₹{item.platformFee} · {item.type} · {item.status}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>No earnings yet — complete a ride</Text>}
        />
      </Card>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  section: { color: colors.lavender, fontWeight: '800', marginBottom: spacing.sm },
  entry: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  entryTitle: { color: '#4ade80', fontWeight: '800', fontSize: 18 },
  entrySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  muted: { color: colors.textMuted }});
