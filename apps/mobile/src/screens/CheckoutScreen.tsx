import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { Button } from '../components/Button';
import { AppTextInput } from '../components/AppTextInput';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import {
  fetchRestaurantOffers,
  validateRestaurantCoupon,
  type ValidatedCoupon} from '../api/customerOffers';
import { shared } from '../theme/styles';
import { colors, radii } from '../theme';

type Props = HomeStackProps<'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const restaurantName = useCartStore((s) => s.restaurantName);
  const clear = useCartStore((s) => s.clear);

  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('Indiranagar, Bangalore');
  const [lat, setLat] = useState('12.9716');
  const [lng, setLng] = useState('77.5946');
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<ValidatedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const cartItemNames = useMemo(() => items.map((i) => i.name), [items]);

  const discount = applied?.discountAmount ?? 0;
  const total = applied ? applied.finalTotal : subtotal;

  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['restaurant-offers', restaurantId],
    queryFn: () => fetchRestaurantOffers(restaurantId!),
    enabled: Boolean(restaurantId)});

  const applyCoupon = async (code: string) => {
    if (!restaurantId) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setCouponError('Enter a coupon code');
      return;
    }
    setApplying(true);
    setCouponError(null);
    try {
      const result = await validateRestaurantCoupon(restaurantId, {
        code: trimmed,
        subtotal,
        cartItemNames});
      setApplied(result);
      setCouponInput(result.code);
    } catch (e) {
      setApplied(null);
      setCouponError(e instanceof Error ? e.message : 'Could not apply coupon');
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCouponInput('');
    setCouponError(null);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('No restaurant');
      const { data } = await api.post<{ id: string }>('/orders', {
        restaurantId,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          ...(i.variantName ? { variantName: i.variantName } : {}),
          ...(i.addOnNames?.length ? { addOnNames: i.addOnNames } : {})})),
        ...(applied?.code ? { couponCode: applied.code } : {}),
        deliveryAddress: {
          label,
          line1,
          coordinates: { lat: parseFloat(lat), lng: parseFloat(lng) }}});
      return data;
    },
    onSuccess: (data) => {
      clear();
      void qc.invalidateQueries({ queryKey: ['orders'] });
      navigation.replace('OrderTrack', { orderId: data.id });
    }});

  return (
    <StackScroll keyboardShouldPersistTaps="handled">
      {restaurantName ? (
        <Text style={styles.shopName}>{restaurantName}</Text>
      ) : null}

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Item total</Text>
          <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
        </View>
        {applied ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Discount ({applied.code})
            </Text>
            <Text style={styles.discountValue}>−₹{discount.toFixed(2)}</Text>
          </View>
        ) : null}
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.totalLabel}>To pay</Text>
          <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={shared.label}>Coupons & offers</Text>
      {offersLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      ) : offers.length === 0 ? (
        <Text style={styles.emptyOffers}>No active offers for this restaurant right now.</Text>
      ) : (
        <View style={styles.offerList}>
          {offers.map((o) => {
            const selected = applied?.code === o.code;
            return (
              <Pressable
                key={o.id}
                style={[styles.offerCard, selected && styles.offerCardOn]}
                onPress={() => void applyCoupon(o.code)}
                disabled={applying}
              >
                <Text style={styles.offerCode}>{o.code}</Text>
                <Text style={styles.offerTitle}>{o.title}</Text>
                <Text style={styles.offerMeta}>
                  {o.summary}
                  {o.minOrderAmount > 0 ? ` · min ₹${o.minOrderAmount}` : ''}
                </Text>
                {o.campaignType === 'happy_hour' && o.happyHourStart ? (
                  <Text style={styles.offerHint}>
                    Happy hour {o.happyHourStart}–{o.happyHourEnd}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={shared.label}>Have a code?</Text>
      <View style={styles.couponRow}>
        <AppTextInput
          style={styles.couponInput}
          value={couponInput}
          onChangeText={(t) => {
            setCouponInput(t.toUpperCase());
            if (applied) setApplied(null);
            setCouponError(null);
          }}
          placeholder="Enter coupon code"
          autoCapitalize="characters"
        />
        <Pressable
          style={[styles.applyBtn, applying && styles.applyBtnDisabled]}
          onPress={() => void applyCoupon(couponInput)}
          disabled={applying}
        >
          {applying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.applyBtnText}>Apply</Text>
          )}
        </Pressable>
      </View>

      {couponError ? <Text style={shared.err}>{couponError}</Text> : null}
      {applied ? (
        <Pressable onPress={removeCoupon}>
          <Text style={styles.removeCoupon}>Remove coupon</Text>
        </Pressable>
      ) : null}

      <Text style={[shared.label, { marginTop: 16 }]}>Delivery address</Text>
      <Text style={shared.label}>Address label</Text>
      <AppTextInput value={label} onChangeText={setLabel} />
      <Text style={shared.label}>Address line</Text>
      <AppTextInput value={line1} onChangeText={setLine1} />
      <Text style={shared.label}>Latitude / Longitude</Text>
      <View style={shared.row}>
        <AppTextInput style={shared.half} value={lat} onChangeText={setLat} keyboardType="decimal-pad" />
        <AppTextInput style={shared.half} value={lng} onChangeText={setLng} keyboardType="decimal-pad" />
      </View>

      {mutation.error ? (
        <Text style={shared.err}>
          {mutation.error instanceof Error ? mutation.error.message : 'Failed'}
        </Text>
      ) : null}

      <Button
        title={`Place order (COD) · ₹${total.toFixed(2)}`}
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={items.length === 0}
      />
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  shopName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 8,
    gap: 8},
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.textSecondary },
  summaryValue: { color: colors.text, fontWeight: '600' },
  discountValue: { color: '#4ade80', fontWeight: '700' },
  summaryTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder},
  totalLabel: { color: colors.text, fontWeight: '800', fontSize: 16 },
  totalValue: { color: colors.primary, fontWeight: '800', fontSize: 18 },
  emptyOffers: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  offerList: { gap: 8, marginBottom: 12 },
  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.chipBorder},
  offerCardOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  offerCode: { color: colors.primaryBright, fontWeight: '900', fontSize: 15 },
  offerTitle: { color: colors.text, fontWeight: '700', marginTop: 4 },
  offerMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  offerHint: { color: colors.lavender, fontSize: 11, marginTop: 4 },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: { flex: 1, marginBottom: 0 },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 72,
    alignItems: 'center'},
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText: { color: '#fff', fontWeight: '800' },
  removeCoupon: { color: colors.lavender, fontWeight: '600', marginBottom: 8 }});
