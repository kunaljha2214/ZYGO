import { api } from './client';

export type ReferralSummary = {
  referralCode: string;
  rewardAmount: number;
  walletBalance: number;
  totalReferrals: number;
  shareMessage: string;
  history: {
    id: string;
    referredName: string;
    referredPhone: string;
    amount: number;
    createdAt: string;
  }[];
};

export async function fetchMyReferral() {
  const { data } = await api.get<ReferralSummary>('/referrals/me');
  return data;
}

export async function validateReferralCode(code: string) {
  const { data } = await api.get<{ valid: boolean; message?: string; referrerName?: string }>(
    '/referrals/validate',
    { params: { code: code.trim().toUpperCase() } }
  );
  return data;
}
