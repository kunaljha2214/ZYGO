import { FoodOrder } from '../models/FoodOrder';

const RETRY_INTERVAL_MS = Number(process.env.DELIVERY_DISPATCH_RETRY_MS || 120_000);

const retryTimers = new Map<string, NodeJS.Timeout>();

export function getDispatchRetryIntervalMs(): number {
  return RETRY_INTERVAL_MS;
}

export function clearDispatchRetry(orderId: string): void {
  const timer = retryTimers.get(orderId);
  if (timer) clearTimeout(timer);
  retryTimers.delete(orderId);
}

export function scheduleDispatchRetry(orderId: string): Date {
  clearDispatchRetry(orderId);
  const retryAt = new Date(Date.now() + RETRY_INTERVAL_MS);
  const timer = setTimeout(() => {
    retryTimers.delete(orderId);
    void retryDeliveryDispatch(orderId);
  }, RETRY_INTERVAL_MS);
  retryTimers.set(orderId, timer);
  return retryAt;
}

export async function retryDeliveryDispatch(orderId: string): Promise<void> {
  const order = await FoodOrder.findById(orderId);
  if (!order) return;
  if (order.status !== 'ready_for_pickup') return;
  if (order.deliveryPartnerId) return;
  if (order.assignmentState === 'assigned') return;

  order.rejectedPartnerIds = [];
  order.assignmentState = 'none';
  await order.save();

  const { startDeliveryDispatch } = await import('./deliveryAssignmentEngine');
  await startDeliveryDispatch(orderId, { isRetry: true });
}

/** Resume retries for orders stuck without a rider after API restart. */
export async function restorePendingDispatchRetries(): Promise<void> {
  const stuck = await FoodOrder.find({
    status: 'ready_for_pickup',
    deliveryPartnerId: null,
    assignmentState: { $in: ['failed', 'none', 'dispatching'] },
  })
    .select('_id assignmentState')
    .lean();

  for (const row of stuck) {
    const id = row._id.toString();
    if (row.assignmentState === 'dispatching') {
      await FoodOrder.findByIdAndUpdate(id, { assignmentState: 'failed' });
    }
    scheduleDispatchRetry(id);
  }

  if (stuck.length > 0) {
    console.log(`[delivery] Scheduled rider search retries for ${stuck.length} ready order(s)`);
  }
}
