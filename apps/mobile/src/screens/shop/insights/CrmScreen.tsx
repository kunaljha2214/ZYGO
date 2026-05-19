import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator} from 'react-native';
import { StackScroll } from '../../../components/layout/StackScroll';
import { spacing } from '../../../theme/spacing';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  fetchCrmCustomers,
  fetchCrmOverview,
  fetchCrmReviews,
  fetchPersonalizedOffers} from '../../../api/shopCrm';
import type { CrmCustomer, CrmOverview, CrmReview, PersonalizedOffer } from '../../../types/shopInsights';
import type { ShopInsightsStackParamList } from '../../../navigation/types';
import { MetricCard } from '../../../components/dashboard/MetricCard';
import { colors, radii } from '../../../theme';

type Nav = NativeStackNavigationProp<ShopInsightsStackParamList, 'Crm'>;

export function CrmScreen() {
  const navigation = useNavigation<Nav>();
  const [overview, setOverview] = useState<CrmOverview | null>(null);
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [reviews, setReviews] = useState<CrmReview[]>([]);
  const [offers, setOffers] = useState<PersonalizedOffer[]>([]);
  const [aiNote, setAiNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'customers' | 'reviews' | 'offers'>('customers');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, c, r, p] = await Promise.all([
        fetchCrmOverview(),
        fetchCrmCustomers(),
        fetchCrmReviews(),
        fetchPersonalizedOffers(),
      ]);
      setOverview(o);
      setCustomers(c);
      setReviews(r.reviews);
      setOffers(p.personalizedOffers);
      setAiNote(p.aiNote);
    } catch {
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading && !overview) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primaryBright} size="large" />
      </View>
    );
  }

  return (
    <StackScroll
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      {overview ? (
        <View style={styles.metricsRow}>
          <MetricCard label="Customers" value={String(overview.totalCustomers)} />
          <MetricCard
            label="Repeat"
            value={`${overview.repeatRate}%`}
            accent={colors.primaryBright}
          />
        </View>
      ) : null}
      {overview ? (
        <View style={styles.metricsRow}>
          <MetricCard label="Loyalty pts" value={String(overview.totalLoyaltyPoints)} />
          <MetricCard
            label="Rating"
            value={overview.averageRating ? `${overview.averageRating}★` : '—'}
          />
        </View>
      ) : null}

      <View style={styles.chips}>
        {(['customers', 'reviews', 'offers'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, tab === t && styles.chipOn]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.chipText, tab === t && styles.chipTextOn]}>
              {t === 'customers' ? 'Customers' : t === 'reviews' ? 'Reviews' : 'Offers'}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'customers' ? (
        customers.length === 0 ? (
          <Text style={styles.empty}>No customer history yet</Text>
        ) : (
          customers.map((c) => (
            <Pressable
              key={c.userId}
              style={styles.card}
              onPress={() => navigation.navigate('CustomerDetail', { userId: c.userId })}
            >
              <View style={styles.cardTop}>
                <Text style={styles.name}>{c.name}</Text>
                {c.isRepeat ? <Text style={styles.repeatBadge}>Repeat</Text> : null}
              </View>
              <Text style={styles.meta}>
                {c.totalOrders} orders · ₹{c.totalSpent} · {c.loyaltyPoints} pts
              </Text>
            </Pressable>
          ))
        )
      ) : null}

      {tab === 'reviews' ? (
        reviews.length === 0 ? (
          <Text style={styles.empty}>No reviews yet</Text>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.card}>
              <Text style={styles.name}>
                {'★'.repeat(r.rating)}
                {'☆'.repeat(5 - r.rating)} · {r.customerName}
              </Text>
              {r.comment ? <Text style={styles.meta}>{r.comment}</Text> : null}
            </View>
          ))
        )
      ) : null}

      {tab === 'offers' ? (
        <>
          {aiNote ? <Text style={styles.aiNote}>{aiNote}</Text> : null}
          {offers.length === 0 ? (
            <Text style={styles.empty}>Personalized offers appear for repeat customers</Text>
          ) : (
            offers.map((o) => (
              <View key={o.userId} style={styles.card}>
                <Text style={styles.name}>{o.customerName}</Text>
                <Text style={styles.offerTitle}>{o.suggestedOffer.title}</Text>
                <Text style={styles.meta}>{o.suggestedOffer.reason}</Text>
              </View>
            ))
          )}
        </>
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  metricsRow: { flexDirection: 'row', gap: spacing.md },
  chips: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chipBorder,
    alignItems: 'center'},
  chipOn: { backgroundColor: colors.chipActiveBg },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextOn: { color: colors.lavender },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder},
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  repeatBadge: {
    color: colors.primaryBright,
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: colors.badge,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill},
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  offerTitle: { color: colors.lavender, fontWeight: '700', marginTop: 4 },
  aiNote: { color: colors.textSecondary, fontSize: 12, marginBottom: 10, fontStyle: 'italic' },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 }});
