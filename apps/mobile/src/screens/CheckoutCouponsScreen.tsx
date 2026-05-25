import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { StackScroll } from '../components/layout/StackScroll';
import { AppTextInput } from '../components/AppTextInput';
import { OfferCouponCard } from '../components/food/OfferCouponCard';
import type { HomeStackProps } from '../navigation/types';
import { useCartStore } from '../store/cartStore';
import {
  fetchRestaurantOffers,
  validateRestaurantCoupon,
} from '../api/customerOffers';
import { shared } from '../theme/styles';
import { colors, radii } from '../theme';

type Props = HomeStackProps<'CheckoutCoupons'>;

export function CheckoutCouponsScreen({ navigation }: Props) {
  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const applied = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);

  const [couponInput, setCouponInput] = useState(applied?.code ?? '');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );
  const cartItemNames = useMemo(() => items.map((i) => i.name), [items]);

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ['restaurant-offers', restaurantId],
    queryFn: () => fetchRestaurantOffers(restaurantId!),
    enabled: Boolean(restaurantId),
  });

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
        cartItemNames,
      });
      setAppliedCoupon(result);
      navigation.goBack();
    } catch (e) {
      setCouponError(e instanceof Error ? e.message : 'Could not apply coupon');
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
    navigation.goBack();
  };

  return (
    <StackScroll keyboardShouldPersistTaps="handled">
      <Text style={shared.hint}>Tap a coupon to apply it to your order.</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
      ) : offers.length === 0 ? (
        <Text style={styles.empty}>No active offers for this restaurant right now.</Text>
      ) : (
        <View style={styles.list}>
          {offers.map((o) => (
            <OfferCouponCard
              key={o.id}
              offer={o}
              selected={applied?.code === o.code}
              disabled={applying}
              onPress={() => void applyCoupon(o.code)}
            />
          ))}
        </View>
      )}

      <Text style={shared.label}>Have a code?</Text>
      <View style={styles.couponRow}>
        <AppTextInput
          style={styles.couponInput}
          value={couponInput}
          onChangeText={(t) => {
            setCouponInput(t.toUpperCase());
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
        <Pressable onPress={removeCoupon} style={styles.removeWrap}>
          <Text style={styles.removeText}>Remove applied coupon</Text>
        </Pressable>
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.textMuted, fontSize: 13, marginVertical: 12 },
  list: { gap: 10, marginBottom: 8 },
  couponRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  couponInput: { flex: 1, marginBottom: 0 },
  applyBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 72,
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.6 },
  applyBtnText: { color: '#fff', fontWeight: '800' },
  removeWrap: { marginTop: 8 },
  removeText: { color: colors.lavender, fontWeight: '600', textAlign: 'center' },
});
