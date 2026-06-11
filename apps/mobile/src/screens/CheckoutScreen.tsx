import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { StackScroll } from '../components/layout/StackScroll';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeStackProps } from '../navigation/types';
import { Button } from '../components/Button';
import { AppTextInput } from '../components/AppTextInput';
import { OfferCouponCard } from '../components/food/OfferCouponCard';
import { LocationSearchField } from '../components/rides/LocationSearchField';
import { LocationPickerModal } from '../components/rides/LocationPickerModal';
import { fetchOrderQuote, createFoodOrder, verifyOrderPayment, type CustomerPriceBreakdown } from '../api/orders';
import { openRazorpayCheckout } from '../services/razorpayCheckout';
import { OrderPriceBreakdown } from '../components/food/OrderPriceBreakdown';
import { useCartStore } from '../store/cartStore';
import { useFoodDeliveryLocationStore } from '../store/foodDeliveryLocationStore';
import { fetchRestaurantOffers } from '../api/customerOffers';
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
  const customerNotes = useCartStore((s) => s.customerNotes);
  const applied = useCartStore((s) => s.appliedCoupon);
  const setAppliedCoupon = useCartStore((s) => s.setAppliedCoupon);
  const clear = useCartStore((s) => s.clear);
  const foodDeliveryLoc = useFoodDeliveryLocationStore((s) => s.selected);

  const [label, setLabel] = useState('Home');
  const [line1, setLine1] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [deliveryErr, setDeliveryErr] = useState<string | null>(null);
  const [locatingDelivery, setLocatingDelivery] = useState(true);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items]
  );

  const quotePayload = useMemo(() => {
    if (!restaurantId || !deliveryCoords || !isFiniteCoord(deliveryCoords)) return null;
    return {
      restaurantId,
      items: items.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        ...(i.variantName ? { variantName: i.variantName } : {}),
        ...(i.addOnNames?.length ? { addOnNames: i.addOnNames } : {}),
      })),
      deliveryAddress: { coordinates: deliveryCoords },
      ...(applied?.code ? { couponCode: applied.code } : {}),
      fulfillment: 'delivery' as const,
    };
  }, [restaurantId, items, deliveryCoords, applied?.code]);

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ['order-quote', quotePayload],
    queryFn: () => fetchOrderQuote(quotePayload!),
    enabled: Boolean(quotePayload),
  });

  const fallbackBreakdown: CustomerPriceBreakdown = {
    food: subtotal,
    foodDiscount: 0,
    deliveryFee: 0,
    deliveryDiscount: 0,
    packageFee: 0,
    packageFeePercent: 5,
    gstAmount: 0,
    gstPercent: 5,
    distanceKm: 0,
    toPay: subtotal,
    fulfillment: 'delivery',
    tagline: 'Set your delivery address to see the full bill.',
  };

  const breakdown = quote?.customer ?? fallbackBreakdown;
  const toPay = breakdown.toPay;

  const applyDelivery = useCallback((place: GeocodedPlace) => {
    if (!isFiniteCoord(place.coordinates)) {
      setDeliveryErr('Could not read that location. Try another result or pick on the map.');
      return;
    }
    setDeliveryCoords(place.coordinates);
    setLine1(place.line1);
    setDeliveryErr(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLocatingDelivery(true);
      const permission = await ensureLocationPermission();
      if (permission !== 'granted') {
        if (!cancelled) {
          setDeliveryErr('Location access denied — search for your address or pick a point on the map.');
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
    enabled: Boolean(restaurantId),
  });

  const previewOffer = useMemo(() => {
    if (offers.length === 0) return null;
    if (applied) {
      return offers.find((o) => o.code === applied.code) ?? offers[0];
    }
    return offers[0];
  }, [offers, applied]);

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
      const order = await createFoodOrder({
        restaurantId,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          ...(i.variantName ? { variantName: i.variantName } : {}),
          ...(i.addOnNames?.length ? { addOnNames: i.addOnNames } : {}),
        })),
        ...(applied?.code ? { couponCode: applied.code } : {}),
        ...(customerNotes.trim() ? { customerNotes: customerNotes.trim() } : {}),
        deliveryAddress: {
          label: label.trim() || 'Delivery',
          line1: line1.trim(),
          coordinates: deliveryCoords,
        },
        fulfillment: 'delivery',
      });

      try {
        const paymentResult = await openRazorpayCheckout(order.payment);
        await verifyOrderPayment(paymentResult);
      } catch (payErr: unknown) {
        const code = (payErr as { code?: number })?.code;
        if (code === 0) {
          throw new Error('Payment cancelled. Your order is saved — pay from order details when ready.');
        }
        throw payErr;
      }
      return order;
    },
    onSuccess: (data) => {
      clear();
      void qc.invalidateQueries({ queryKey: ['orders'] });
      navigation.replace('OrderTrack', { orderId: data.id });
    },
  });

  return (
    <StackScroll keyboardShouldPersistTaps="handled">
      {restaurantName ? (
        <Text style={styles.shopName}>{restaurantName}</Text>
      ) : null}

      <OrderPriceBreakdown
        breakdown={breakdown}
        loading={quoteLoading && Boolean(quotePayload)}
        couponCode={applied?.code ?? quote?.couponCode}
      />

      <Text style={shared.label}>Coupons & offers</Text>
      {offersLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />
      ) : !previewOffer ? (
        <Text style={styles.emptyOffers}>No active offers for this restaurant right now.</Text>
      ) : (
        <View style={styles.offerPreview}>
          <OfferCouponCard
            offer={previewOffer}
            selected={applied?.code === previewOffer.code}
            onPress={() => navigation.navigate('CheckoutCoupons')}
          />
          {offers.length > 1 ? (
            <Pressable
              style={styles.viewAllLink}
              onPress={() => navigation.navigate('CheckoutCoupons')}
            >
              <Text style={styles.viewAllText}>
                View all {offers.length} coupons
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.viewAllLink}
              onPress={() => navigation.navigate('CheckoutCoupons')}
            >
              <Text style={styles.viewAllText}>Browse coupons & apply code</Text>
            </Pressable>
          )}
          {applied ? (
            <Pressable onPress={() => setAppliedCoupon(null)}>
              <Text style={styles.removeCoupon}>Remove coupon</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {customerNotes.trim() ? (
        <>
          <Text style={shared.label}>Cooking request</Text>
          <Text style={styles.cookingNote}>{customerNotes.trim()}</Text>
        </>
      ) : null}

      <Text style={[shared.label, { marginTop: 16 }]}>Delivery address</Text>
      <Text style={shared.hint}>Search your address or pick a point on the map.</Text>

      <View style={styles.deliveryFieldWrap}>
        {locatingDelivery ? (
          <ActivityIndicator color={colors.primary} size="small" style={styles.deliverySpinner} />
        ) : null}
        <View style={styles.deliveryField}>
          <LocationSearchField
            label=""
            value={line1}
            placeholder={
              locatingDelivery
                ? 'Detecting your location…'
                : 'Search area, street, landmark (e.g. MG Road)'
            }
            onSelect={applyDelivery}
          />
        </View>
      </View>
      <Button
        title="Choose on map"
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
        title={
          quoteLoading && quotePayload
            ? 'Calculating total…'
            : `Pay ₹${toPay.toFixed(2)}`
        }
        onPress={placeOrder}
        loading={mutation.isPending}
        disabled={items.length === 0 || (Boolean(quotePayload) && quoteLoading)}
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
  emptyOffers: { color: colors.textMuted, fontSize: 13, marginBottom: 8 },
  offerPreview: { gap: 8, marginBottom: 12 },
  viewAllLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  viewAllText: { color: colors.primaryBright, fontWeight: '700', fontSize: 14 },
  removeCoupon: { color: colors.lavender, fontWeight: '600' },
  cookingNote: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  deliveryFieldWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  deliverySpinner: { marginTop: 14, marginRight: 10 },
  deliveryField: { flex: 1 },
});
