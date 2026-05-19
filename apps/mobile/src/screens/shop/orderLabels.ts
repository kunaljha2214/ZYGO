import { colors } from '../../theme';
import type { ShopOrderStatus } from '../../types/shopOrders';

export const STATUS_LABELS: Record<ShopOrderStatus, string> = {
  placed: 'Order received',
  confirmed: 'Accepted',
  preparing: 'Preparing',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Rejected',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ShopOrderStatus] ?? status.replace(/_/g, ' ');
}

export function statusColor(status: string): string {
  if (status === 'placed') return colors.primaryBright;
  if (status === 'cancelled') return colors.error;
  if (status === 'delivered') return '#4ade80';
  if (status === 'ready_for_pickup') return '#fbbf24';
  return colors.lavender;
}

export function advanceButtonLabel(next: string | null): string {
  if (!next) return '';
  const map: Record<string, string> = {
    preparing: 'Start preparing',
    ready_for_pickup: 'Mark ready for pickup',
    out_for_delivery: 'Hand off for delivery',
    delivered: 'Mark delivered',
  };
  return map[next] ?? `Move to ${statusLabel(next)}`;
}
