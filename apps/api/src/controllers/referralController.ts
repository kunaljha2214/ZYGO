import createError from 'http-errors';
import { validationResult } from 'express-validator';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { ReferralEvent } from '../models/ReferralEvent';
import { REFERRAL_REWARD_INR } from '../config/referral';
import {
  buildShareMessage,
  ensureUserReferralCode,
  findReferrerByCode,
  getReferralWalletBalance,
  normalizeReferralCode,
} from '../services/referralService';

export async function getMyReferral(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const user = await User.findById(req.user.sub);
    if (!user) {
      next(createError(404));
      return;
    }

    const code = await ensureUserReferralCode(user);
    const walletBalance = await getReferralWalletBalance(user);
    const events = await ReferralEvent.find({ referrerId: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      referralCode: code,
      rewardAmount: REFERRAL_REWARD_INR,
      walletBalance,
      totalReferrals: user.referralCount ?? events.length,
      shareMessage: buildShareMessage(code, REFERRAL_REWARD_INR),
      history: events.map((e) => ({
        id: e._id.toString(),
        referredName: e.referredName,
        referredPhone: e.referredPhone,
        amount: e.rewardAmount,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
}

export async function validateReferralCode(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      next(createError(400, errors.array()[0].msg));
      return;
    }
    const code = normalizeReferralCode((req.query.code as string) ?? '');
    if (!code) {
      res.json({ valid: false, message: 'Enter a referral code' });
      return;
    }
    const referrer = await findReferrerByCode(code);
    if (!referrer) {
      res.json({ valid: false, message: 'Invalid referral code' });
      return;
    }
    res.json({
      valid: true,
      referrerName: referrer.name.split(' ')[0],
      rewardAmount: REFERRAL_REWARD_INR,
    });
  } catch (e) {
    next(e);
  }
}
