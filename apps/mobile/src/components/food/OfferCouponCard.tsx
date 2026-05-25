import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { CustomerOffer } from '../../api/customerOffers';
import { colors, radii } from '../../theme';

type Props = {
  offer: CustomerOffer;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export function OfferCouponCard({ offer, selected, onPress, disabled }: Props) {
  return (
    <Pressable
      style={[styles.card, selected && styles.cardOn]}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      <Text style={styles.code}>{offer.code}</Text>
      <Text style={styles.title}>{offer.title}</Text>
      <Text style={styles.meta}>
        {offer.summary}
        {offer.minOrderAmount > 0 ? ` · min ₹${offer.minOrderAmount}` : ''}
      </Text>
      {offer.offerType === 'combo' && (offer.comboItemNames?.length ?? 0) > 0 ? (
        <Text style={styles.hint}>Add to cart: {(offer.comboItemNames ?? []).join(' + ')}</Text>
      ) : null}
      {offer.campaignType === 'happy_hour' && offer.happyHourStart ? (
        <Text style={styles.hint}>
          Happy hour {offer.happyHourStart}–{offer.happyHourEnd}
        </Text>
      ) : null}
      {selected ? (
        <View style={styles.appliedBadge}>
          <Text style={styles.appliedText}>Applied</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.chipBorder,
  },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  code: { color: colors.primaryBright, fontWeight: '900', fontSize: 15 },
  title: { color: colors.text, fontWeight: '700', marginTop: 4 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  hint: { color: colors.lavender, fontSize: 11, marginTop: 4 },
  appliedBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  appliedText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
