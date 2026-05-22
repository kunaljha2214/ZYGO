import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { Button } from '../components/Button';
import { AppTextInput } from '../components/AppTextInput';
import { LocationSearchField } from '../components/rides/LocationSearchField';
import { LocationPickerModal } from '../components/rides/LocationPickerModal';
import { api } from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useFoodDeliveryLocationStore } from '../store/foodDeliveryLocationStore';
import {
  fetchRestaurantOffers,
  validateRestaurantCoupon,
  type ValidatedCoupon} from '../api/customerOffers';
import { reverseGeocode, type GeocodedPlace } from '../services/geocoding';
import { isFiniteCoord } from '../components/rides/mapTypes';
import {
  ensureLocationPermission,
  getCurrentCoordinates,
} from '../services/location';
import { withTimeout } from '../utils/withTimeout';
import { shared } from '../theme/styles';
import { colors, radii } from '../theme';

const DELIVERY_FALLBACK = { lat: 12.9716, lng: 77.5946 };

type Props = HomeStackProps<'Checkout'>;

export function CheckoutScreen({ navigation }: Props) {
  const qc = useQueryClient();
  const items = useCartStore((s) => s.items);
  const restaurantId = useCartStore((s) => s.restaurantId);
  const restaurantName = useCartStore((s) => s.restaurantName);
  const clear = useCartStore((s) => s.clear);
  const foodDeliveryLoc = useFoodDeliveryLocationStore((s) => s.selected);

  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [deliveryFieldKey, setDeliveryFieldKey] = useState(0);
  const [deliveryErr, setDeliveryErr] = useState<string | null>(null);
  const [locatingDelivery, setLocatingDelivery] = useState(true);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
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

  const applyDelivery = useCallback((place: GeocodedPlace) => {
    if (!isFiniteCoord(place.coordinates)) {
      setDeliveryErr('Could not read that location. Try another result or pick on the map.');
      return;
    }
    setDeliveryCoords(place.coordinates);
    setLine1(place.line1);
    setDeliveryFieldKey((k) => k + 1);
    setDeliveryErr(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLocatingDelivery(true);
      setLine1('Detecting your location…');
      const permission = await ensureLocationPermission();
      if (permission !== 'granted') {
        if (!cancelled) {
          setLine1('');
          setLocatingDelivery(false);
        }
        return;
      }
      try {
        const c = await withTimeout(getCurrentCoordinates(), 22_000, 'GPS');
        const place = await withTimeout(reverseGeocode(c.lat, c.lng), 12_000, 'address');
        if (!cancelled) applyDelivery(place);
      } catch {
        if (!cancelled) {
          setLine1('');
          setDeliveryCoords(null);
        }
      } finally {
        if (!cancelled) setLocatingDelivery(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyDelivery, foodDeliveryLoc]);

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

  const placeOrder = () => {
    if (!deliveryCoords || !isFiniteCoord(deliveryCoords) || !line1.trim()) {
      setDeliveryErr('Search or choose your delivery location on the map.');
      return;
    }
    mutation.mutate();
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId) throw new Error('No restaurant');
      if (!deliveryCoords || !isFiniteCoord(deliveryCoords)) {
        throw new Error('Delivery location is required');
      }
      const { data } = await api.post<{ id: string }>('/orders', {
        restaurantId,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          ...(i.variantName ? { variantName: i.variantName } : {}),
          ...(i.addOnNames?.length ? { addOnNames: i.addOnNames } : {})})),
        ...(applied?.code ? { couponCode: applied.code } : {}),
        deliveryAddress: {
          label: label.trim() || 'Delivery',
          line1: line1.trim(),
          coordinates: deliveryCoords}});
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

      <Text style={[shared.label, { marginTop: 16 }]}>Delivery location</Text>
      <Text style={shared.hint}>
        Search or pick on the map like ride drop. Coordinates are saved automatically.
      </Text>

      <View style={styles.deliveryBox}>
        {locatingDelivery ? (
          <ActivityIndicator color={colors.primary} size="small" style={styles.deliverySpinner} />
        ) : null}
        <Text style={styles.deliveryLine} numberOfLines={4}>
          {line1 || 'Search or choose delivery location on the map'}
        </Text>
      </View>

      <LocationSearchField
        key={`delivery-${deliveryFieldKey}`}
        label="Search delivery address"
        value={line1}
        placeholder="Search area, street, landmark (e.g. MG Road)"
        onSelect={applyDelivery}
      />
      <Button
        title="Choose delivery location on map"
        variant="ghost"
        onPress={() => setMapPickerOpen(true)}
      />

      <Text style={shared.label}>Address label (optional)</Text>
      <AppTextInput value={label} onChangeText={setLabel} placeholder="Home, Work, Other" />

      {deliveryErr ? <Text style={shared.err}>{deliveryErr}</Text> : null}

      {mutation.error ? (
        <Text style={shared.err}>
          {mutation.error instanceof Error ? mutation.error.message : 'Failed'}
        </Text>
      ) : null}

      <Button
        title={`Place order (COD) · ₹${total.toFixed(2)}`}
        onPress={placeOrder}
        loading={mutation.isPending}
        disabled={items.length === 0}
      />

      {mapPickerOpen ? (
        <LocationPickerModal
          visible
          kind="drop"
          title="Delivery location"
          hint="Tap the map, a place name (POI), or drag the pin. Coordinates are saved when you confirm."
          fallback={deliveryCoords ?? DELIVERY_FALLBACK}
          onClose={() => setMapPickerOpen(false)}
          onConfirm={(place) => {
            applyDelivery(place);
            setMapPickerOpen(false);
          }}
        />
      ) : null}
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
  removeCoupon: { color: colors.lavender, fontWeight: '600', marginBottom: 8 },
  deliveryBox: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    marginBottom: 8,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliverySpinner: { marginRight: 10 },
  deliveryLine: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 22 },
});
