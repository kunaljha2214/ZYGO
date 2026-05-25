import RazorpayCheckout from 'react-native-razorpay';
import type { CreateOrderPayment } from '../api/orders';

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function openRazorpayCheckout(payment: CreateOrderPayment): Promise<RazorpaySuccess> {
  const result = await RazorpayCheckout.open({
    key: payment.keyId,
    amount: String(payment.amount),
    currency: payment.currency,
    name: payment.name,
    description: payment.description,
    order_id: payment.razorpayOrderId,
    prefill: {
      name: payment.prefill.name,
      email: payment.prefill.email,
      contact: payment.prefill.contact,
    },
    theme: { color: '#7c3aed' },
  });

  return {
    razorpay_order_id: result.razorpay_order_id,
    razorpay_payment_id: result.razorpay_payment_id,
    razorpay_signature: result.razorpay_signature,
  };
}
