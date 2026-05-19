import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScroll } from '../../components/layout/StackScroll';
import { fetchPartnerWallet } from '../../api/deliveryPartner';
import { colors, spacing } from '../../theme';

export function DeliveryWalletScreen() {
  const [wallet, setWallet] = useState<Awaited<ReturnType<typeof fetchPartnerWallet>> | null>(null);

  useFocusEffect(
    useCallback(() => {
      void fetchPartnerWallet().then(setWallet);
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
      <Text style={styles.big}>₹{wallet.pending}</Text>
      <Text style={styles.sub}>Pending balance</Text>
      <Text style={styles.meta}>Total earned ₹{wallet.totalEarned}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  big: { fontSize: 36, fontWeight: '900', color: colors.primaryBright },
  sub: { color: colors.textSecondary, marginBottom: spacing.sm },
  meta: { color: colors.textMuted, marginBottom: spacing.xl },
  section: { color: colors.lavender, fontWeight: '700', marginBottom: spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  order: { color: colors.text, fontWeight: '600' },
  amt: { color: '#4ade80', fontWeight: '700' }});
