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
  reactivateShopOffer,
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

function OfferCard({
  offer,
  history,
  onToggle,
  onDelete,
  onReactivate,
}: {
  offer: ShopOffer;
  history?: boolean;
  onToggle?: () => void;
  onDelete: () => void;
  onReactivate?: () => void;
}) {
  const navigation = useNavigation<Nav>();
  const statusLabel = history ? 'Expired' : offer.isActive ? 'Active' : 'Paused';
  const statusStyle = history ? styles.expired : offer.isActive ? styles.active : styles.inactive;

  return (
    <View style={[styles.card, history && styles.cardHistory, !history && !offer.isActive && styles.cardOff]}>
      <Pressable onPress={() => navigation.navigate('EditOffer', { offerId: offer.id })}>
        <View style={styles.cardTop}>
          <Text style={styles.code}>{offer.code}</Text>
          <Text style={[styles.status, statusStyle]}>{statusLabel}</Text>
        </View>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.meta}>
          {offerLabel(offer)} · min ₹{offer.minOrderAmount}
          {offer.campaignType !== 'standard' ? ` · ${offer.campaignType}` : ''}
        </Text>
        {offer.offerType === 'combo' && (offer.comboItemNames?.length ?? 0) > 0 ? (
          <Text style={styles.comboHint}>Items: {(offer.comboItemNames ?? []).join(', ')}</Text>
        ) : null}
        <Text style={styles.dates}>
          {history ? 'Ended' : 'Valid'} {formatOfferDates(offer.startDate, offer.endDate)}
        </Text>
      </Pressable>
      <View style={styles.actions}>
        {history ? (
          <Pressable onPress={onReactivate}>
            <Text style={[styles.actionText, styles.reactivate]}>Extend & reactivate</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onToggle}>
            <Text style={styles.actionText}>{offer.isActive ? 'Pause' : 'Activate'}</Text>
          </Pressable>
        )}
        <Pressable onPress={onDelete}>
          <Text style={[styles.actionText, styles.delete]}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function OffersScreen() {
  const navigation = useNavigation<Nav>();
  const inset = useAppInsets({ header: true });
  const [activeOffers, setActiveOffers] = useState<ShopOffer[]>([]);
  const [historyOffers, setHistoryOffers] = useState<ShopOffer[]>([]);
  const [campaigns, setCampaigns] = useState<OfferCampaign[]>([]);
  const [aiNote, setAiNote] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [offers, c, ai] = await Promise.all([
        fetchShopOffers(),
        fetchOfferCampaigns(),
        fetchAiCouponTargeting(),
      ]);
      setActiveOffers(offers.activeOffers ?? []);
      setHistoryOffers(offers.historyOffers ?? []);
      setCampaigns(c);
      setAiNote(ai.aiNote);
    } catch {
      setActiveOffers([]);
      setHistoryOffers([]);
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

  const reactivateWithDays = async (offer: ShopOffer, days: number) => {
    try {
      await reactivateShopOffer(offer.id, days);
      await load();
      AppAlert.alert('Reactivated', `${offer.code} is live again for ${days} days.`);
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Failed');
    }
  };

  const onReactivate = (offer: ShopOffer) => {
    AppAlert.alert(
      'Extend & reactivate',
      `Bring back "${offer.title}" (${offer.code}) with the same details. Default extension is 30 days, or set custom dates in the editor.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Custom dates',
          onPress: () => navigation.navigate('EditOffer', { offerId: offer.id }),
        },
        {
          text: '30 days',
          onPress: () => {
            void reactivateWithDays(offer, 30);
          },
        },
      ]
    );
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

  const hasOffers = activeOffers.length > 0 || historyOffers.length > 0;

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
        {loading && !hasOffers ? (
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

        <Text style={styles.section}>Active offers</Text>
        {activeOffers.length === 0 ? (
          <Text style={styles.emptyHint}>No live coupons. Create one or reactivate from history below.</Text>
        ) : (
          activeOffers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              onToggle={() => void onToggle(o.id)}
              onDelete={() => onDelete(o.id, o.title)}
            />
          ))
        )}

        <Text style={styles.section}>Offer history</Text>
        {historyOffers.length === 0 ? (
          <Text style={styles.emptyHint}>Expired offers will appear here so you can extend and run them again.</Text>
        ) : (
          historyOffers.map((o) => (
            <OfferCard
              key={o.id}
              offer={o}
              history
              onReactivate={() => onReactivate(o)}
              onDelete={() => onDelete(o.id, o.title)}
            />
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
  cardHistory: { opacity: 0.85, borderColor: colors.chipBorder },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  code: { color: colors.primaryBright, fontWeight: '900', fontSize: 16 },
  status: { fontSize: 11, fontWeight: '700' },
  active: { color: '#4ade80' },
  inactive: { color: colors.textMuted },
  expired: { color: colors.error },
  title: { color: colors.text, fontWeight: '700', marginTop: 6 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  comboHint: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  dates: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 16, marginTop: 12 },
  actionText: { color: colors.lavender, fontWeight: '700' },
  reactivate: { color: colors.primaryBright },
  delete: { color: colors.error },
  aiNote: { color: colors.textSecondary, fontSize: 12, marginBottom: 8 },
  emptyHint: { color: colors.textMuted, fontSize: 13, marginBottom: 8, lineHeight: 18 },
});
