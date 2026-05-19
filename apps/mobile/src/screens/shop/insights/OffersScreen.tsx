import React, { useCallback, useState } from 'react';
import { AppAlert } from '../../../alert';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  deleteShopOffer,
  fetchAiCouponTargeting,
  fetchOfferCampaigns,
  fetchShopOffers,
  toggleShopOffer} from '../../../api/shopOffers';
import type { OfferCampaign, ShopOffer } from '../../../types/shopInsights';
import type { ShopInsightsStackParamList } from '../../../navigation/types';
import { colors, radii, spacing } from '../../../theme';
import { useAppInsets } from '../../../hooks/useAppInsets';

type Nav = NativeStackNavigationProp<ShopInsightsStackParamList, 'Offers'>;

function offerLabel(o: ShopOffer): string {
  if (o.offerType === 'flat') return `₹${o.discountValue} off`;
  if (o.offerType === 'percentage') return `${o.discountValue}% off`;
  if (o.offerType === 'free_delivery') return 'Free delivery';
  return `Combo · ${o.discountValue}%`;
}

function formatOfferDates(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
  return `${fmt(s)} – ${fmt(e)}`;
}

export function OffersScreen() {
  const navigation = useNavigation<Nav>();
  const inset = useAppInsets({ header: true });
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [campaigns, setCampaigns] = useState<OfferCampaign[]>([]);
  const [aiNote, setAiNote] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, ai] = await Promise.all([
        fetchShopOffers(),
        fetchOfferCampaigns(),
        fetchAiCouponTargeting(),
      ]);
      setOffers(o);
      setCampaigns(c);
      setAiNote(ai.aiNote);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onToggle = async (id: string) => {
    try {
      await toggleShopOffer(id);
      await load();
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  const onDelete = (id: string, title: string) => {
    AppAlert.alert('Delete offer', `Remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await deleteShopOffer(id);
              await load();
            } catch (e) {
              AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
            }
          })();
        },
      },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.addBtn, { marginHorizontal: inset.horizontal, marginTop: inset.top }]}
        onPress={() => navigation.navigate('EditOffer', {})}
      >
        <Text style={styles.addBtnText}>+ Create coupon</Text>
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: inset.horizontal, paddingBottom: inset.bottom }]}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />
        }
      >
        {loading && offers.length === 0 ? (
          <ActivityIndicator color={colors.primaryBright} style={{ marginTop: 24 }} />
        ) : null}

        {campaigns.length > 0 ? (
          <>
            <Text style={styles.section}>Campaigns</Text>
            {campaigns.map((c) => (
              <View key={c.id} style={styles.campaignCard}>
                <Text style={styles.campaignType}>
                  {c.campaignType === 'festival' ? `🎉 ${c.festivalName}` : '⏰ Happy hour'}
                </Text>
                <Text style={styles.code}>{c.code}</Text>
                <Text style={styles.meta}>
                  {c.title}
                  {c.happyHourStart ? ` · ${c.happyHourStart}–${c.happyHourEnd}` : ''}
                </Text>
                <Text style={styles.dates}>Valid {formatOfferDates(c.startDate, c.endDate)}</Text>
              </View>
            ))}
          </>
        ) : null}

        {aiNote ? (
          <>
            <Text style={styles.section}>AI coupon targeting</Text>
            <Text style={styles.aiNote}>{aiNote}</Text>
          </>
        ) : null}

        <Text style={styles.section}>All offers</Text>
        {offers.length === 0 ? (
          <Text style={styles.empty}>No coupons yet. Create your first offer.</Text>
        ) : (
          offers.map((o) => (
            <View key={o.id} style={[styles.card, !o.isActive && styles.cardOff]}>
              <Pressable onPress={() => navigation.navigate('EditOffer', { offerId: o.id })}>
                <View style={styles.cardTop}>
                  <Text style={styles.code}>{o.code}</Text>
                  <Text style={[styles.status, o.isActive ? styles.active : styles.inactive]}>
                    {o.isActive ? 'Active' : 'Paused'}
                  </Text>
                </View>
                <Text style={styles.title}>{o.title}</Text>
                <Text style={styles.meta}>
                  {offerLabel(o)} · min ₹{o.minOrderAmount}
                  {o.campaignType !== 'standard' ? ` · ${o.campaignType}` : ''}
                </Text>
                <Text style={styles.dates}>
                  Valid {formatOfferDates(o.startDate, o.endDate)}
                </Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable onPress={() => void onToggle(o.id)}>
                  <Text style={styles.actionText}>{o.isActive ? 'Pause' : 'Activate'}</Text>
                </Pressable>
                <Pressable onPress={() => onDelete(o.id, o.title)}>
                  <Text style={[styles.actionText, styles.delete]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.background },
  addBtn: {
    marginBottom: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center'},
  addBtnText: { color: colors.text, fontWeight: '800' },
  scroll: { gap: spacing.stackGap },
  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.lavender,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 8},
  campaignCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderRadius: radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary},
  campaignType: { color: colors.primaryBright, fontWeight: '800' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder},
  cardOff: { opacity: 0.65 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  code: { color: colors.primaryBright, fontWeight: '900', fontSize: 16 },
  status: { fontSize: 11, fontWeight: '700' },
  active: { color: '#4ade80' },
  inactive: { color: colors.textMuted },
  title: { color: colors.text, fontWeight: '700', marginTop: 6 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  dates: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionText: { color: colors.lavender, fontWeight: '700' },
  delete: { color: colors.error },
  aiNote: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 20 }});
