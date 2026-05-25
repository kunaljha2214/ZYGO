import { FoodOrder } from '../models/FoodOrder';
import { emitToUser } from '../socket/io';
import { refundPaidFoodOrder } from './orderRefund';

export const RESTAURANT_ACCEPT_TIMEOUT_MS = 3 * 60 * 1000;

export const ACCEPT_TIMEOUT_REJECT_REASON =
  'Restaurant did not accept within 3 minutes';

type AcceptTimerState = {
  timeout?: NodeJS.Timeout;
};

const acceptTimers = new Map<string, AcceptTimerState>();

export function clearRestaurantAcceptTimeout(orderId: string): void {
  const state = acceptTimers.get(orderId);
  if (state?.timeout) clearTimeout(state.timeout);
  acceptTimers.delete(orderId);
}

function ensureAcceptTimer(orderId: string, delayMs: number): void {
  let state = acceptTimers.get(orderId);
  if (!state) {
    state = {};
    acceptTimers.set(orderId, state);
  }
  if (state.timeout) clearTimeout(state.timeout);
  state.timeout = setTimeout(() => {
    void cancelOrderIfAcceptTimedOut(orderId);
  }, delayMs);
}

/** Start or refresh the 3-minute window for a newly placed (paid) order. */
export async function scheduleRestaurantAcceptTimeout(orderId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + RESTAURANT_ACCEPT_TIMEOUT_MS);
  const order = await FoodOrder.findOneAndUpdate(
    { _id: orderId, status: 'placed' },
    { acceptExpiresAt: expiresAt },
    { new: true }
  );
  if (!order) return;

  ensureAcceptTimer(orderId, RESTAURANT_ACCEPT_TIMEOUT_MS);
}

export async function cancelOrderIfAcceptTimedOut(orderId: string): Promise<boolean> {
  clearRestaurantAcceptTimeout(orderId);

  const order = await FoodOrder.findOneAndUpdate(
    { _id: orderId, status: 'placed' },
    {
      status: 'cancelled',
      rejectReason: ACCEPT_TIMEOUT_REJECT_REASON,
      acceptExpiresAt: null,
    },
    { new: true }
  );

  if (!order) return false;

  await refundPaidFoodOrder(orderId);
  return true;
}

function acceptDeadlineFromOrder(row: {
  acceptExpiresAt?: Date | null;
  paidAt?: Date | null;
  createdAt?: Date;
}): number {
  if (row.acceptExpiresAt) return row.acceptExpiresAt.getTime();
  const base = row.paidAt ?? row.createdAt ?? new Date();
  return base.getTime() + RESTAURANT_ACCEPT_TIMEOUT_MS;
}

/** Re-arm timers after API restart for orders still awaiting acceptance. */
export async function restoreRestaurantAcceptTimeouts(): Promise<void> {
  const now = Date.now();
  const pending = await FoodOrder.find({ status: 'placed' })
    .select('_id acceptExpiresAt paidAt createdAt')
    .lean();

  for (const row of pending) {
    const orderId = row._id.toString();
    const expires = acceptDeadlineFromOrder(row);
    const remaining = expires - now;
    if (remaining <= 0) {
      await cancelOrderIfAcceptTimedOut(orderId);
    } else {
      if (!row.acceptExpiresAt) {
        await FoodOrder.updateOne(
          { _id: row._id, status: 'placed' },
          { acceptExpiresAt: new Date(expires) }
        );
      }
      ensureAcceptTimer(orderId, remaining);
    }
  }
}
