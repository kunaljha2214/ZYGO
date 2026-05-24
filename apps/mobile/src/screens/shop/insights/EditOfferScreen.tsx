import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../../alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator} from 'react-native';
import { StackScroll } from '../../../components/layout/StackScroll';
import { spacing } from '../../../theme/spacing';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '../../../components/Button';
import {
  createShopOffer,
  fetchAllShopOffers,
  updateShopOffer,
  type CreateOfferPayload} from '../../../api/shopOffers';
import type { ShopCampaignType, ShopOfferType } from '../../../types/shopInsights';
import type { ShopInsightsStackParamList } from '../../../navigation/types';
import { colors, radii, placeholderColor } from '../../../theme';

type R = RouteProp<ShopInsightsStackParamList, 'EditOffer'>;

const OFFER_TYPES: { id: ShopOfferType; label: string }[] = [
  { id: 'flat', label: 'Flat ₹ off' },
  { id: 'percentage', label: '% discount' },
  { id: 'free_delivery', label: 'Free delivery' },
  { id: 'combo', label: 'Combo offer' },
];

const CAMPAIGNS: { id: ShopCampaignType; label: string }[] = [
  { id: 'standard', label: 'Standard' },
  { id: 'happy_hour', label: 'Happy hour' },
  { id: 'festival', label: 'Festival' },
];

const VALIDITY_PRESETS = [7, 14, 30, 60, 90] as const;

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endDateFromDays(start: Date, days: number): Date {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  end.setHours(23, 59, 59, 999);
  return end;
}

function daysBetweenInclusive(start: Date, end: Date): number {
  const startMs = new Date(start).setHours(0, 0, 0, 0);
  const endMs = new Date(end).setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((endMs - startMs) / 86400000));
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EditOfferScreen() {
  const { offerId } = useRoute<R>().params;
  const navigation = useNavigation();
  const [loading, setLoading] = useState(!!offerId);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [offerType, setOfferType] = useState<ShopOfferType>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrder, setMinOrder] = useState('199');
  const [comboItems, setComboItems] = useState('');
  const [campaignType, setCampaignType] = useState<ShopCampaignType>('standard');
  const [festivalName, setFestivalName] = useState('');
  const [happyStart, setHappyStart] = useState('15:00');
  const [happyEnd, setHappyEnd] = useState('18:00');
  const [validityDays, setValidityDays] = useState('30');
  const [validityStart, setValidityStart] = useState<Date>(() => startOfToday());

  const load = useCallback(async () => {
    if (!offerId) return;
    setLoading(true);
    try {
      const offers = await fetchAllShopOffers();
      const o = offers.find((x) => x.id === offerId);
      if (!o) {
        AppAlert.alert('Not found', 'Offer missing');
        navigation.goBack();
        return;
      }
      setTitle(o.title);
      setCode(o.code);
      setOfferType(o.offerType);
      setDiscountValue(String(o.discountValue));
      setMinOrder(String(o.minOrderAmount));
      setComboItems(o.comboItemNames.join(', '));
      setCampaignType(o.campaignType);
      setFestivalName(o.festivalName ?? '');
      setHappyStart(o.happyHourStart ?? '15:00');
      setHappyEnd(o.happyHourEnd ?? '18:00');
      const start = new Date(o.startDate);
      const end = new Date(o.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const startDay = new Date(start);
        startDay.setHours(0, 0, 0, 0);
        setValidityStart(startDay);
        setValidityDays(String(daysBetweenInclusive(startDay, end)));
      } else {
        setValidityStart(startOfToday());
        setValidityDays('30');
      }
    } finally {
      setLoading(false);
    }
  }, [offerId, navigation]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const parsedValidityDays = Math.min(365, Math.max(1, parseInt(validityDays, 10) || 30));
  const validityEnd = endDateFromDays(validityStart, parsedValidityDays);

  const buildPayload = (): CreateOfferPayload => {
    const start = new Date(validityStart);
    start.setHours(0, 0, 0, 0);
    const end = endDateFromDays(start, parsedValidityDays);
    return {
      title: title.trim(),
      code: code.trim().toUpperCase(),
      offerType,
      discountValue: Number(discountValue) || 0,
      minOrderAmount: Number(minOrder) || 0,
      comboItemNames: comboItems
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      campaignType,
      festivalName: campaignType === 'festival' ? festivalName.trim() : undefined,
      happyHourStart: campaignType === 'happy_hour' ? happyStart : undefined,
      happyHourEnd: campaignType === 'happy_hour' ? happyEnd : undefined};
  };

  const save = async () => {
    if (!title.trim() || !code.trim()) {
      AppAlert.alert('Required', 'Title and coupon code are required');
      return;
    }
    if (parsedValidityDays < 1 || parsedValidityDays > 365) {
      AppAlert.alert('Invalid dates', 'Coupon must be valid for 1 to 365 days');
      return;
    }
    setBusy(true);
    try {
      const payload = buildPayload();
      if (offerId) {
        await updateShopOffer(offerId, payload);
      } else {
        await createShopOffer(payload);
      }
      navigation.goBack();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  return (
    <StackScroll keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={placeholderColor} />

      <Text style={styles.label}>Coupon code</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        placeholderTextColor={placeholderColor}
      />

      <Text style={styles.label}>Offer type</Text>
      <View style={styles.row}>
        {OFFER_TYPES.map((t) => (
          <Pressable
            key={t.id}
            style={[styles.chip, offerType === t.id && styles.chipOn]}
            onPress={() => setOfferType(t.id)}
          >
            <Text style={[styles.chipText, offerType === t.id && styles.chipTextOn]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {offerType !== 'free_delivery' ? (
        <>
          <Text style={styles.label}>{offerType === 'flat' ? 'Discount (₹)' : 'Discount (%)'}</Text>
          <TextInput
            style={styles.input}
            value={discountValue}
            onChangeText={setDiscountValue}
            keyboardType="number-pad"
            placeholderTextColor={placeholderColor}
          />
        </>
      ) : null}

      <Text style={styles.label}>Min order (₹)</Text>
      <TextInput
        style={styles.input}
        value={minOrder}
        onChangeText={setMinOrder}
        keyboardType="number-pad"
        placeholderTextColor={placeholderColor}
      />

      {offerType === 'combo' ? (
        <>
          <Text style={styles.label}>Combo items (comma-separated)</Text>
          <TextInput
            style={styles.input}
            value={comboItems}
            onChangeText={setComboItems}
            placeholder="Item A, Item B"
            placeholderTextColor={placeholderColor}
          />
        </>
      ) : null}

      <Text style={styles.label}>Campaign</Text>
      <View style={styles.row}>
        {CAMPAIGNS.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.chip, campaignType === c.id && styles.chipOn]}
            onPress={() => setCampaignType(c.id)}
          >
            <Text style={[styles.chipText, campaignType === c.id && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {campaignType === 'festival' ? (
        <>
          <Text style={styles.label}>Festival name</Text>
          <TextInput
            style={styles.input}
            value={festivalName}
            onChangeText={setFestivalName}
            placeholder="Diwali, Holi…"
            placeholderTextColor={placeholderColor}
          />
        </>
      ) : null}

      {campaignType === 'happy_hour' ? (
        <>
          <Text style={styles.label}>Happy hour (HH:mm)</Text>
          <Text style={styles.hint}>Daily time window while the coupon is valid (see dates below).</Text>
          <View style={styles.timeRow}>
            <TextInput style={[styles.input, styles.timeInput]} value={happyStart} onChangeText={setHappyStart} />
            <Text style={styles.to}>to</Text>
            <TextInput style={[styles.input, styles.timeInput]} value={happyEnd} onChangeText={setHappyEnd} />
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Valid for (days)</Text>
      <Text style={styles.hint}>
        Applies to standard, happy hour, and festival coupons — how long customers can use this code.
      </Text>
      <View style={styles.row}>
        {VALIDITY_PRESETS.map((days) => {
          const on = String(days) === validityDays;
          return (
            <Pressable
              key={days}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setValidityDays(String(days))}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{days}d</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>Or custom days</Text>
      <TextInput
        style={styles.input}
        value={validityDays}
        onChangeText={(t) => setValidityDays(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        placeholder="30"
        placeholderTextColor={placeholderColor}
      />
      <View style={styles.validityCard}>
        <Text style={styles.validityTitle}>Validity period</Text>
        <Text style={styles.validityLine}>
          From {formatShortDate(validityStart)} to {formatShortDate(validityEnd)}
        </Text>
        <Text style={styles.validityMeta}>{parsedValidityDays} day{parsedValidityDays === 1 ? '' : 's'}</Text>
      </View>

      <Button title={offerId ? 'Save changes' : 'Create coupon'} onPress={() => void save()} loading={busy} />
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { color: colors.textSecondary, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    padding: 12,
    color: colors.text},
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    backgroundColor: colors.chip},
  chipOn: { backgroundColor: colors.chipActiveBg },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: colors.lavender },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: { flex: 1 },
  to: { color: colors.textMuted },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 8, lineHeight: 18 },
  validityCard: {
    marginTop: 8,
    padding: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft},
  validityTitle: { color: colors.lavender, fontWeight: '700', fontSize: 12, marginBottom: 6 },
  validityLine: { color: colors.text, fontWeight: '600' },
  validityMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 }});
