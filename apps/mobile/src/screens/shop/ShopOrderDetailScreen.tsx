import React, { useCallback, useEffect, useState } from 'react';
import { AppAlert } from '../../alert';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ActivityIndicator} from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TripContactCard } from '../../components/trip/TripContactCard';
import { callShopOrderCustomer } from '../../utils/placePeerCall';
import {
  acceptShopOrder,
  advanceShopOrderStatus,
  retryShopOrderRiderDispatch,
  confirmShopOrderHandoff,
  fetchShopOrder,
  printShopInvoice,
  rejectShopOrder,
  updateShopOrderNotes} from '../../api/shopOrders';
import type { ShopOrder } from '../../types/shopOrders';
import type { ShopOrdersStackParamList } from '../../navigation/types';
import { colors, radii, placeholderColor } from '../../theme';
import { advanceButtonLabel, statusColor, statusLabel } from './orderLabels';
import { shared } from '../../theme/styles';
import { StackScroll } from '../../components/layout/StackScroll';
import { spacing } from '../../theme/spacing';

type R = RouteProp<ShopOrdersStackParamList, 'ShopOrderDetail'>;

const PREP_OPTIONS = [10, 15, 20, 25, 30, 45];

const CUSTOMER_CONTACT_STATUSES = new Set([
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'rider_assigned',
  'out_for_delivery',
  'delivered',
]);

const FLOW = [
  'placed',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
] as const;

export function ShopOrderDetailScreen() {
  const { orderId } = useRoute<R>().params;
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const o = await fetchShopOrder(orderId);
      setOrder(o);
      setNotes(o.shopNotes ?? '');
    } catch (e) {
      AppAlert.alert('Order', e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    if (order?.status !== 'ready_for_pickup' || order.assignmentState === 'assigned') return;
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
  }, [order?.status, order?.assignmentState, load]);

  const run = async (fn: () => Promise<ShopOrder>) => {
    setBusy(true);
    try {
      const o = await fn();
      setOrder(o);
      if (o.shouldPrintInvoice) {
        await printShopInvoice(orderId);
        AppAlert.alert('Invoice', 'Invoice sent to printer (demo)');
      }
    } catch (e) {
      AppAlert.alert('Error', e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !order) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primaryBright} />
      </View>
    );
  }

  const flowIdx = FLOW.indexOf(order.status as (typeof FLOW)[number]);
  const next = order.nextAction;

  return (
    <StackScroll>
      <Text style={shared.orderNum}>{order.orderNumber}</Text>
      <Text style={[styles.status, { color: statusColor(order.status) }]}>
        {statusLabel(order.status)}
      </Text>

      <View style={styles.pipeline}>
        {FLOW.map((step, i) => {
          const done = flowIdx > i;
          const current = order.status === step;
          return (
            <View key={step} style={styles.pipeStep}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                  order.status === 'cancelled' && styles.dotCancelled,
                ]}
              />
              <Text style={[styles.pipeLabel, (done || current) && styles.pipeLabelOn]} numberOfLines={2}>
                {statusLabel(step)}
              </Text>
            </View>
          );
        })}
      </View>

      {order.riderDispatchMessage ? (
        <View
          style={[
            styles.riderBanner,
            order.assignmentState === 'failed' ? styles.riderBannerWarn : styles.riderBannerInfo,
          ]}
        >
          <Text style={styles.riderBannerText}>{order.riderDispatchMessage}</Text>
          {order.status === 'ready_for_pickup' && order.assignmentState === 'failed' ? (
            <Button
              title="Search for rider now"
              variant="ghost"
              onPress={() => void run(() => retryShopOrderRiderDispatch(orderId))}
              loading={busy}
              style={{ marginTop: 8 }}
            />
          ) : null}
        </View>
      ) : null}

      {order.status === 'ready_for_pickup' && !order.handoffConfirmedAt ? (
        <Button
          title="Handed to rider"
          variant="ghost"
          onPress={() => void run(() => confirmShopOrderHandoff(orderId))}
          loading={busy}
          style={{ marginTop: 0 }}
        />
      ) : null}

      {order.customer && CUSTOMER_CONTACT_STATUSES.has(order.status) ? (
        <TripContactCard
          title="Customer"
          name={order.customer.name}
          onCall={() => callShopOrderCustomer(orderId)}
        />
      ) : null}

      <Card glow style={shared.block}>
        <Text style={shared.h}>Items</Text>
        {order.items.map((it, i) => (
          <Text key={i} style={shared.line}>
            {it.name} × {it.quantity} — ₹{(it.price * it.quantity).toFixed(2)}
          </Text>
        ))}
        <Text style={shared.total}>Total ₹{order.total.toFixed(2)}</Text>
      </Card>

      <Card style={shared.block}>
        <Text style={shared.h}>Deliver to</Text>
        <Text style={shared.line}>
          {order.deliveryAddress.label}: {order.deliveryAddress.line1}
        </Text>
      </Card>

      {order.customerNotes ? (
        <Card style={shared.block}>
          <Text style={shared.h}>Customer notes</Text>
          <Text style={shared.line}>{order.customerNotes}</Text>
        </Card>
      ) : null}

      {order.kitchenStation ? (
        <Text style={styles.meta}>Auto-routed · {order.kitchenStation} station</Text>
      ) : null}
      {order.estimatedPrepMinutes ? (
        <Text style={styles.meta}>Est. prep: {order.estimatedPrepMinutes} min</Text>
      ) : null}
      {order.delayRiskMinutes && order.delayRiskMinutes > 0 ? (
        <Text style={styles.delay}>Delay risk: ~{order.delayRiskMinutes} min</Text>
      ) : null}

      <Text style={styles.label}>Kitchen / shop notes</Text>
      <TextInput
        style={styles.input}
        value={notes}
        onChangeText={setNotes}
        placeholder="Allergies, packaging, etc."
        placeholderTextColor={placeholderColor}
        multiline
      />
      <Button
        title="Save notes"
        variant="ghost"
        onPress={() => void run(() => updateShopOrderNotes(orderId, notes))}
        loading={busy}
        style={shared.block}
      />

      {order.status === 'placed' ? (
        <>
          <Text style={styles.acceptDeadline}>
            Accept within 3 minutes or the order is cancelled automatically.
          </Text>
          <Text style={styles.label}>Estimated prep (minutes)</Text>
          <View style={styles.prepRow}>
            {PREP_OPTIONS.map((m) => (
              <Button
                key={m}
                title={`${m}m`}
                variant="ghost"
                onPress={() => void run(() => acceptShopOrder(orderId, m))}
                loading={busy}
                style={styles.prepBtn}
              />
            ))}
          </View>
          <Button title="Accept (default prep)" onPress={() => void run(() => acceptShopOrder(orderId))} loading={busy} />

          <Text style={[styles.label, { marginTop: 16 }]}>Reject reason</Text>
          <TextInput
            style={styles.input}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Out of stock, closing soon…"
            placeholderTextColor={placeholderColor}
          />
          <Button
            title="Reject order"
            variant="ghost"
            onPress={() => {
              if (!rejectReason.trim()) {
                AppAlert.alert('Reason required', 'Enter why you are rejecting this order.');
                return;
              }
              void run(() => rejectShopOrder(orderId, rejectReason.trim()));
            }}
            loading={busy}
          />
        </>
      ) : null}

      {order.status !== 'placed' && order.status !== 'cancelled' && order.status !== 'delivered' && next ? (
        <Button
          title={advanceButtonLabel(next)}
          onPress={() => void run(() => advanceShopOrderStatus(orderId, next))}
          loading={busy}
          style={{ marginTop: 12 }}
        />
      ) : null}

      {order.shouldPrintInvoice ? (
        <Button
          title="Print invoice"
          variant="ghost"
          onPress={() => void run(() => printShopInvoice(orderId))}
          loading={busy}
          style={{ marginTop: 8 }}
        />
      ) : null}

      {order.rejectReason ? (
        <Text style={styles.reject}>Rejected: {order.rejectReason}</Text>
      ) : null}
    </StackScroll>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  status: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pipeline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6},
  pipeStep: { alignItems: 'center', width: '15%', minWidth: 48 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.stepInactive,
    marginBottom: 4},
  dotDone: { backgroundColor: colors.stepDone },
  dotCurrent: { backgroundColor: colors.primary, transform: [{ scale: 1.2 }] },
  dotCancelled: { backgroundColor: colors.error },
  pipeLabel: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  pipeLabelOn: { color: colors.text, fontWeight: '600' },
  meta: { color: colors.textSecondary, marginBottom: 4 },
  delay: { color: '#fbbf24', marginBottom: 8 },
  acceptDeadline: { color: colors.primaryBright, fontWeight: '600', marginBottom: 12 },
  label: { color: colors.textSecondary, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    padding: 12,
    color: colors.text,
    minHeight: 44},
  prepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  prepBtn: { minWidth: 56 },
  reject: { color: colors.error, marginTop: 16, fontWeight: '600' },
  riderBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  riderBannerInfo: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  riderBannerWarn: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  riderBannerText: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
