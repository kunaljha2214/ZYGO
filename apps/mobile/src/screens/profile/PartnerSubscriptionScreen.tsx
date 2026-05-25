import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StackScroll } from '../../components/layout/StackScroll';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import {
  checkoutPartnerSubscription,
  fetchPartnerSubscription,
  verifyPartnerSubscriptionPayment,
  type PartnerSubscriptionStatus,
} from '../../api/partnerSubscription';
import { openRazorpayCheckout } from '../../services/razorpayCheckout';
import { colors, radii } from '../../theme';
import { shared } from '../../theme/styles';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function accessStatusLabel(reason: PartnerSubscriptionStatus['accessReason']) {
  switch (reason) {
    case 'first_order_free':
      return 'First order free';
    case 'grace_waiver':
      return '1-day waiver active';
    case 'paid_subscription':
      return 'Paid plan active';
    default:
      return 'Inactive';
  }
}

function accessHint(data: PartnerSubscriptionStatus) {
  if (data.accessReason === 'first_order_free') {
    return 'Your first order or request does not need a subscription. After that you get 1 free day, then a paid monthly plan is required.';
  }
  if (data.accessReason === 'grace_waiver') {
    return `Waiver ends ${formatDateTime(data.graceExpiresAt)}. Subscribe before then to keep accepting orders.`;
  }
  if (data.accessReason === 'paid_subscription') {
    return `Paid subscription renews on ${formatDate(data.renewalDate)}.`;
  }
  return 'Your waiver has ended. Pay the monthly plan to accept new orders and requests.';
}

export function PartnerSubscriptionScreen() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['partner-subscription'],
    queryFn: fetchPartnerSubscription,
  });

  const payMutation = useMutation({
    mutationFn: async () => {
      const checkout = await checkoutPartnerSubscription();
      try {
        const result = await openRazorpayCheckout(checkout.payment);
        await verifyPartnerSubscriptionPayment(result);
      } catch (payErr: unknown) {
        const code = (payErr as { code?: number })?.code;
        if (code === 0) throw new Error('Payment cancelled');
        throw payErr;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partner-subscription'] });
    },
  });

  if (isLoading) {
    return (
      <View style={shared.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={shared.center}>
        <Text style={shared.muted}>
          {error instanceof Error ? error.message : 'Could not load subscription'}
        </Text>
        <Button title="Retry" onPress={() => void refetch()} />
      </View>
    );
  }

  return (
    <StackScroll>
      <Card>
        <Text style={styles.planTitle}>{data.plan.label}</Text>
        <Text style={styles.planMeta}>{data.plan.description}</Text>
        <Text style={styles.planPrice}>₹{data.plan.amountInr}/month</Text>

        <View style={[styles.badge, data.active ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={styles.badgeText}>{accessStatusLabel(data.accessReason)}</Text>
        </View>

        <Text style={styles.hint}>{accessHint(data)}</Text>

        {data.accessReason === 'grace_waiver' ? (
          <>
            <Text style={styles.renewLabel}>Waiver ends</Text>
            <Text style={styles.renewValue}>{formatDateTime(data.graceExpiresAt)}</Text>
          </>
        ) : null}

        {data.accessReason === 'paid_subscription' ? (
          <>
            <Text style={styles.renewLabel}>Next renewal date</Text>
            <Text style={styles.renewValue}>{formatDate(data.renewalDate)}</Text>
          </>
        ) : null}

        {data.accessReason === 'inactive' || data.accessReason === 'grace_waiver' ? (
          <Button
            title={`Pay ₹${data.plan.amountInr} — 1 month`}
            onPress={() => payMutation.mutate()}
            loading={payMutation.isPending}
            style={{ marginTop: 16 }}
          />
        ) : null}

        {payMutation.error ? (
          <Text style={shared.err}>
            {payMutation.error instanceof Error
              ? payMutation.error.message
              : 'Payment failed'}
          </Text>
        ) : null}
      </Card>

      <Text style={shared.label}>Payment history</Text>
      {data.history.length === 0 ? (
        <Text style={shared.muted}>No subscription payments yet.</Text>
      ) : (
        data.history.map((h) => (
          <Card key={h.id} style={styles.historyCard}>
            <View style={styles.historyRow}>
              <Text style={styles.historyAmount}>₹{h.amountInr}</Text>
              <Text style={styles.historyDate}>{formatDate(h.paidAt ?? h.periodStart)}</Text>
            </View>
            <Text style={styles.historyPeriod}>
              {formatDate(h.periodStart)} → {formatDate(h.periodEnd)}
            </Text>
          </Card>
        ))
      )}

      <Text style={styles.footer}>
        Payments go to Zygo. Your subscription must stay active to accept new orders and
        requests. Payouts to your wallet are settled separately on a weekly basis.
      </Text>
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  planTitle: { color: colors.text, fontWeight: '800', fontSize: 18 },
  planMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  planPrice: { color: colors.primary, fontWeight: '800', fontSize: 22, marginTop: 12 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  badgeActive: { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
  badgeInactive: { backgroundColor: 'rgba(251, 191, 36, 0.2)' },
  badgeText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  renewLabel: { color: colors.textMuted, fontSize: 12, marginTop: 14 },
  renewValue: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 4 },
  historyCard: { marginBottom: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  historyAmount: { color: colors.text, fontWeight: '700' },
  historyDate: { color: colors.textMuted, fontSize: 13 },
  historyPeriod: { color: colors.textSecondary, fontSize: 12, marginTop: 6 },
  footer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 24,
  },
});
