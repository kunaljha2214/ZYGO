import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { Button } from '../../components/Button';
import { fetchPartnerWallet } from '../../api/deliveryPartner';
import { colors, spacing } from '../../theme';

export function DeliveryWalletScreen() {
  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof fetchPartnerWallet>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWallet(await fetchPartnerWallet());
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
      <Text style={styles.big}>₹{wallet.pending}</Text>
      <Text style={styles.sub}>Pending balance</Text>
      <Text style={styles.meta}>Total earned ₹{wallet.totalEarned}</Text>
      <Text style={styles.payoutNote}>Payouts are processed weekly to your registered account.</Text>
      <Text style={styles.section}>Recent</Text>
      {wallet.entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <Text style={styles.order}>{e.orderNumber}</Text>
          <Text style={styles.amt}>+₹{e.amount}</Text>
        </View>
      ))}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  err: { color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  big: { fontSize: 36, fontWeight: '900', color: colors.primaryBright },
  sub: { color: colors.textSecondary, marginBottom: spacing.sm },
  meta: { color: colors.textMuted, marginBottom: spacing.sm },
  payoutNote: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: spacing.xl },
  section: { color: colors.lavender, fontWeight: '700', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  order: { color: colors.text, fontWeight: '600' },
  amt: { color: '#4ade80', fontWeight: '800' },
});
