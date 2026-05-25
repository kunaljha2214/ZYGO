import { api } from './client';
import type { CreateOrderPayment } from './orders';

export type SubscriptionPlan = {
  key: string;
  amountInr: number;
  label: string;
  description: string;
};

export type SubscriptionHistoryItem = {
  id: string;
  amountInr: number;
  planKey: string;
  periodStart: string;
  periodEnd: string;
  paidAt?: string;
};

export type PartnerAccessReason =
  | 'first_order_free'
  | 'grace_waiver'
  | 'paid_subscription'
  | 'inactive';

export type PartnerSubscriptionStatus = {
  plan: SubscriptionPlan;
  active: boolean;
  accessReason: PartnerAccessReason;
  renewalDate: string | null;
  graceExpiresAt: string | null;
  firstOrderCompleted: boolean;
  currentPlanKey: string | null;
  history: SubscriptionHistoryItem[];
};

export async function fetchPartnerSubscription() {
  const { data } = await api.get<PartnerSubscriptionStatus>('/partner/subscription');
  return data;
}

export async function checkoutPartnerSubscription() {
  const { data } = await api.post<{
    paymentId: string;
    payment: CreateOrderPayment;
  }>('/partner/subscription/checkout');
  return data;
}

export async function verifyPartnerSubscriptionPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const { data } = await api.post<PartnerSubscriptionStatus>(
    '/partner/subscription/verify',
    body
  );
  return data;
}
