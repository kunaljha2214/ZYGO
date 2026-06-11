import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { fetchDriverWallet } from '../../api/driver';
import { colors, spacing } from '../../theme';
import { formatInr } from '../../utils/formatMoney';

export function DriverWalletScreen() {
  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof fetchDriverWallet>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWallet(await fetchDriverWallet());
    } catch (e) {
      setWallet(null);
      setError(e instanceof Error ? e.message : 'Could not load wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} />
      </View>
    );
  }

  if (error || !wallet) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error ?? 'Could not load wallet'}</Text>
        <Button title="Retry" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <StackScroll>
      <View style={styles.row}>
        <MetricCard label="Pending" value={formatInr(wallet.pending)} />
        <MetricCard label="Withdrawable" value={formatInr(wallet.withdrawable)} accent={colors.primaryBright} />
      </View>
      <MetricCard label="Total earned" value={formatInr(wallet.totalEarned)} wide />
      <Card>
        <Text style={styles.section}>Recent ledger</Text>
        <FlatList
          data={wallet.entries}
          keyExtractor={(e) => e.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.entry}>
              <Text style={styles.entryTitle}>+{formatInr(item.driverEarned)}</Text>
              <Text style={styles.entrySub}>
                Fare {formatInr(item.amount)} · Platform {formatInr(item.platformFee)} · {item.type} ·{' '}
                {item.status}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>No earnings yet — complete a paid ride</Text>}
        />
      </Card>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  err: { color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  section: { color: colors.lavender, fontWeight: '800', marginBottom: spacing.sm },
  entry: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  entryTitle: { color: '#4ade80', fontWeight: '800', fontSize: 18 },
  entrySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  muted: { color: colors.textMuted },
});
