function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const v = process.env[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

export function getRazorpayConfig() {
  const keyId = readEnv('RAZORPAY_KEY_ID');
  const keySecret = readEnv('RAZORPAY_KEY_SECRET');
  const webhookSecret = readEnv('RAZORPAY_WEBHOOK_SECRET');
  return { keyId, keySecret, webhookSecret, enabled: Boolean(keyId && keySecret) };
}
