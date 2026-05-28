import crypto from 'node:crypto';

export function generateOtp4(): string {
  const n = crypto.randomInt(0, 10000);
  return String(n).padStart(4, '0');
}

export function randomSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hashOtp(otp: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

