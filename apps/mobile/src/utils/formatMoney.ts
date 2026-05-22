/** Indian rupee display with exactly two decimal places. */
export function formatInr(amount: number | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '₹0.00';
  return `₹${n.toFixed(2)}`;
}
