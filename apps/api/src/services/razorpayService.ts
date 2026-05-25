import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import createError from 'http-errors';
import { getRazorpayConfig } from '../config/razorpay';

let client: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret, enabled } = getRazorpayConfig();
  if (!enabled) {
    throw createError(503, 'Razorpay is not configured on the server');
  }
  if (!client) {
    client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return client;
}

export function getRazorpayKeyId(): string {
  const { keyId, enabled } = getRazorpayConfig();
  if (!enabled || !keyId) {
    throw createError(503, 'Razorpay is not configured on the server');
  }
  return keyId;
}

/** Amount in INR → paise for Razorpay. */
export function toPaise(amountInr: number): number {
  return Math.max(1, Math.round(amountInr * 100));
}

export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const rz = getRazorpayClient();
  const order = await rz.orders.create({
    amount: toPaise(params.amountInr),
    currency: 'INR',
    receipt: params.receipt.slice(0, 40),
    notes: params.notes,
  });
  return order;
}

export async function createRazorpayRefund(params: {
  paymentId: string;
  amountInr: number;
  notes?: Record<string, string>;
}) {
  const rz = getRazorpayClient();
  const refund = await rz.payments.refund(params.paymentId, {
    amount: toPaise(params.amountInr),
    speed: 'normal',
    notes: params.notes,
  });
  return refund;
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) return false;
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpaySignature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) return false;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
