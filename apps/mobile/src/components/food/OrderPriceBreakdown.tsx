import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CustomerPriceBreakdown } from '../../api/orders';
import { colors, radii } from '../../theme';

type Props = {
  breakdown: CustomerPriceBreakdown;
  loading?: boolean;
  couponCode?: string;
};

function money(n: number) {
  return `₹${n.toFixed(2)}`;
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: 'discount';
  muted?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, muted && styles.labelMuted]}>{label}</Text>
      <Text
        style={[
          styles.value,
          accent === 'discount' && styles.discountValue,
          muted && styles.labelMuted,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function OrderPriceBreakdown({ breakdown, loading, couponCode }: Props) {
  const showDelivery = breakdown.fulfillment === 'delivery';
  const placeholder = loading ? '…' : null;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Bill details</Text>
      <Text style={styles.tagline}>{breakdown.tagline}</Text>

      <Row
        label="Food (menu price)"
        value={placeholder ?? money(breakdown.food)}
      />

      {breakdown.foodDiscount > 0 ? (
        <Row
          label={`Coupon${couponCode ? ` (${couponCode})` : ''}`}
          value={placeholder ?? `−${money(breakdown.foodDiscount)}`}
          accent="discount"
        />
      ) : null}

      {showDelivery ? (
        <>
          <Row
            label={
              breakdown.distanceKm > 0
                ? `Delivery (${breakdown.distanceKm.toFixed(1)} km)`
                : 'Delivery'
            }
            value={placeholder ?? money(breakdown.deliveryFee)}
          />
          {breakdown.deliveryDiscount > 0 ? (
            <Row
              label="Delivery off (coupon)"
              value={placeholder ?? `−${money(breakdown.deliveryDiscount)}`}
              accent="discount"
            />
          ) : null}
        </>
      ) : null}

      <Row
        label={`Package fee (${breakdown.packageFeePercent}%)`}
        value={placeholder ?? money(breakdown.packageFee)}
        muted
      />
      <Row
        label={`GST (${breakdown.gstPercent}%)`}
        value={placeholder ?? money(breakdown.gstAmount)}
        muted
      />

      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.toPayLabel}>To pay</Text>
        <Text style={styles.toPayValue}>{placeholder ?? money(breakdown.toPay)}</Text>
      </View>
      <Text style={styles.footer}>
        Every charge is listed above — no hidden fees.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 8,
    gap: 6,
  },
  heading: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 2,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  label: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
  },
  labelMuted: {
    color: colors.textMuted,
  },
  value: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  discountValue: {
    color: '#4ade80',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardBorder,
    marginVertical: 6,
  },
  toPayLabel: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  toPayValue: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 18,
  },
  footer: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
});
