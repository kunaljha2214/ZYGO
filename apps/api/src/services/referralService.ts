import { randomInt } from 'node:crypto';
import createError from 'http-errors';
import { Types } from 'mongoose';
import { User, type IUser } from '../models/User';
import { ReferralEvent } from '../models/ReferralEvent';
import { DriverProfile } from '../models/DriverProfile';
import { DeliveryPartnerProfile } from '../models/DeliveryPartnerProfile';
import { REFERRAL_REWARD_INR } from '../config/referral';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeReferralCode(raw: string | undefined | null): string | null {
  if (!raw?.trim()) return null;
  return raw.trim().toUpperCase().replace(/\s/g, '');
}

export async function ensureUserReferralCode(user: IUser): Promise<string> {
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 12; attempt++) {
    let code = 'ZYGO';
    for (let i = 0; i < 6; i++) {
      code += CODE_CHARS[randomInt(0, CODE_CHARS.length)];
    }
    const exists = await User.findOne({ referralCode: code }).select('_id').lean();
    if (!exists) {
      user.referralCode = code;
      await user.save();
      return code;
    }
  }
  throw createError(500, 'Could not generate referral code');
}

export async function findReferrerByCode(code: string): Promise<IUser | null> {
  const normalized = normalizeReferralCode(code);
  if (!normalized || normalized.length < 6) return null;
  return User.findOne({ referralCode: normalized });
}

export async function validateReferralForSignup(
  code: string | null | undefined,
  signupPhone: string
): Promise<{ valid: boolean; message?: string }> {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return { valid: true };
  const referrer = await findReferrerByCode(normalized);
  if (!referrer) {
    return { valid: false, message: 'Invalid referral code' };
  }
  if (referrer.phone === signupPhone) {
    return { valid: false, message: 'You cannot use your own referral code' };
  }
  return { valid: true };
}

async function creditPartnerWallet(
  userId: Types.ObjectId,
  role: string,
  amount: number
): Promise<void> {
  if (role === 'driver') {
    await DriverProfile.findOneAndUpdate(
      { driverId: userId },
      { $inc: { walletPending: amount, walletTotalEarned: amount } },
      { upsert: true }
    );
    return;
  }
  if (role === 'delivery_partner') {
    await DeliveryPartnerProfile.findOneAndUpdate(
      { partnerId: userId },
      { $inc: { walletPending: amount, walletTotalEarned: amount } },
      { upsert: true }
    );
    return;
  }
  await User.findByIdAndUpdate(userId, { $inc: { referralWalletBalance: amount } });
}

export async function getReferralWalletBalance(user: IUser): Promise<number> {
  if (user.role === 'driver') {
    const p = await DriverProfile.findOne({ driverId: user._id }).lean();
    return p?.walletPending ?? 0;
  }
  if (user.role === 'delivery_partner') {
    const p = await DeliveryPartnerProfile.findOne({ partnerId: user._id }).lean();
    return p?.walletPending ?? 0;
  }
  return user.referralWalletBalance ?? 0;
}

export async function applyReferralOnSignup(
  referrer: IUser,
  newUser: IUser
): Promise<{ credited: boolean; amount: number }> {
  const existing = await ReferralEvent.findOne({ referredUserId: newUser._id });
  if (existing) {
    return { credited: false, amount: 0 };
  }

  const amount = REFERRAL_REWARD_INR;
  await creditPartnerWallet(referrer._id, referrer.role, amount);
  newUser.referredByUserId = referrer._id;
  await newUser.save();

  await ReferralEvent.create({
    referrerId: referrer._id,
    referredUserId: newUser._id,
    referralCode: referrer.referralCode!,
    rewardAmount: amount,
    referredName: newUser.name,
    referredPhone: newUser.phone,
  });

  await User.findByIdAndUpdate(referrer._id, { $inc: { referralCount: 1 } });

  return { credited: true, amount };
}

export function buildShareMessage(code: string, reward: number): string {
  return (
    `Join Zygo with my referral code ${code} and start rides & food delivery. ` +
    `I'll earn ₹${reward} when you sign up! Download the Zygo app and enter this code during registration.`
  );
}
