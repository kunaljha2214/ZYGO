export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain || !local) {
    return '***';
  }
  const head = local.slice(0, Math.min(2, local.length));
  const hidden = local.length > 2 ? '***' : '';
  return `${head}${hidden}@${domain}`;
}
