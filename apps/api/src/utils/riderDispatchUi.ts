/** Customer/shop copy for rider search while order is ready_for_pickup. */
export function riderDispatchUiMessage(
  status: string,
  assignmentState?: string | null
): string | null {
  if (status === 'rider_assigned' || status === 'out_for_delivery' || status === 'delivered') {
    return null;
  }
  if (status !== 'ready_for_pickup') return null;
  if (assignmentState === 'dispatching') {
    return 'Finding a delivery partner…';
  }
  if (assignmentState === 'failed') {
    return 'No rider has accepted yet. We are searching again automatically.';
  }
  return null;
}
