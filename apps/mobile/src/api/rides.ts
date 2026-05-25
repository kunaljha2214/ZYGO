import { api } from './client';
import type { CreateOrderPayment } from './orders';

export type RidePaymentCheckout = {
  rideId: string;
  fare: number;
  driverEarned: number;
  payment: CreateOrderPayment;
};

export async function checkoutRidePayment(rideId: string) {
  const { data } = await api.post<RidePaymentCheckout>(`/rides/${rideId}/payment/checkout`);
  return data;
}

export async function verifyRidePayment(body: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const { data } = await api.post<{ id: string; paymentStatus: string }>('/rides/payment/verify', body);
  return data;
}
