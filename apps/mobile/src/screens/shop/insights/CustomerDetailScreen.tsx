import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../../alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator} from 'react-native';
import { StackScroll } from '../../../components/layout/StackScroll';
import { spacing } from '../../../theme/spacing';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '../../../components/Button';
import { fetchCrmCustomer, updateLoyaltyPoints } from '../../../api/shopCrm';
import type { CrmCustomerDetail } from '../../../types/shopInsights';
import type { ShopInsightsStackParamList } from '../../../navigation/types';
import { colors, radii, placeholderColor } from '../../../theme';
import { statusLabel } from '../orderLabels';

type R = RouteProp<ShopInsightsStackParamList, 'CustomerDetail'>;

export function CustomerDetailScreen() {
  const { userId } = useRoute<R>().params;
  const [customer, setCustomer] = useState<CrmCustomerDetail | null>(null);
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await fetchCrmCustomer(userId);
      setCustomer(c);
      setPoints(String(c.loyaltyPoints));
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const savePoints = async () => {
    const n = parseInt(points, 10);
    if (!Number.isFinite(n) || n < 0) {
      AppAlert.alert('Invalid', 'Enter valid loyalty points');
      return;
    }
    setBusy(true);
    try {
      await updateLoyaltyPoints(userId, n);
      await load();
      AppAlert.alert('Saved', 'Loyalty points updated');
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !customer) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  return (
    <StackScroll>
      <Text style={styles.name}>{customer.name}</Text>
      <Text style={styles.meta}>
        {customer.totalOrders} orders · ₹{customer.totalSpent}
        {customer.isRepeat ? ' · Repeat customer' : ''}
      </Text>

      <Text style={styles.label}>Loyalty points</Text>
      <TextInput
        style={styles.input}
        value={points}
        onChangeText={setPoints}
        keyboardType="number-pad"
        placeholderTextColor={placeholderColor}
      />
      <Button title="Update points" onPress={() => void savePoints()} loading={busy} />

      <Text style={styles.section}>Order history</Text>
      {customer.orderHistory.map((o) => (
        <View key={o.id} style={styles.row}>
          <Text style={styles.rowTitle}>{o.orderNumber}</Text>
          <Text style={styles.rowMeta}>
            {statusLabel(o.status)} · ₹{o.total} · {new Date(o.createdAt).toLocaleDateString()}
          </Text>
        </View>
      ))}

      {customer.reviews.length > 0 ? (
        <>
          <Text style={styles.section}>Reviews</Text>
          {customer.reviews.map((r) => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.rowTitle}>{'★'.repeat(r.rating)}</Text>
              <Text style={styles.rowMeta}>{r.comment || 'No comment'}</Text>
            </View>
          ))}
        </>
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: colors.text },
  meta: { color: colors.textSecondary, marginBottom: 16 },
  label: { color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    padding: 12,
    color: colors.text,
    marginBottom: 12},
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10},
  row: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder},
  rowTitle: { color: colors.text, fontWeight: '700' },
  rowMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 }});
