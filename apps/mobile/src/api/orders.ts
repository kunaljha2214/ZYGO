import { api } from './client';

export type CustomerPriceBreakdown = {
  food: number;
  foodDiscount: number;
  deliveryFee: number;
  deliveryDiscount: number;
  packageFee: number;
  packageFeePercent: number;
  gstAmount: number;
  gstPercent: number;
  distanceKm: number;
  toPay: number;
  fulfillment: 'delivery' | 'pickup';
  tagline: string;
};

export type CreateOrderPayment = {
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
};

export type CreatedFoodOrder = {
  id: string;
  orderNumber: string;
  total: number;
  paymentStatus: string;
  status: string;
  payment: CreateOrderPayment;
};

export type OrderQuote = {
  customer: CustomerPriceBreakdown;
  couponCode?: string;
};

export type OrderQuotePayload = {
  restaurantId: string;
  items: {
    menuItemId: string;
    quantity: number;
    variantName?: string;
    addOnNames?: string[];
  }[];
  deliveryAddress: { coordinates: { lat: number; lng: number } };
  couponCode?: string;
  fulfillment?: 'delivery' | 'pickup';
};

export async function fetchOrderQuote(payload: OrderQuotePayload) {
  const { data } = await api.post<OrderQuote>('/orders/quote', payload);
  return data;
}

export type CreateOrderPayload = OrderQuotePayload & {
  deliveryAddress: {
    label: string;
    line1: string;
    coordinates: { lat: number; lng: number };
  };
  customerNotes?: string;
};

export async function createFoodOrder(payload: CreateOrderPayload) {
  const { data } = await api.post<CreatedFoodOrder>('/orders', payload);
  return data;
}

export async function verifyOrderPayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const { data } = await api.post<{ id: string }>('/orders/payment/verify', body);
  return data;
}
