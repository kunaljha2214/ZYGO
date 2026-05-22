import { randomInt, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import createError from 'http-errors';
import type { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { User } from '../models/User';
import type { RegistrationAccountType } from '../models/VerificationSession';
import { VerificationSession } from '../models/VerificationSession';
import { JWT_EXPIRES_DAYS } from '../config/app';
import { sendVerificationOtp } from '../utils/email';
import { maskEmail } from '../utils/mask';
import { normalizePhone } from '../utils/phone';
import {
  applyReferralOnSignup,
  ensureUserReferralCode,
  findReferrerByCode,
  normalizeReferralCode,
  validateReferralForSignup,
} from '../services/referralService';

const OTP_EXPIRY_MS = 15 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

export async function registerStart(
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
    const body = req.body as {
      phone: string;
      password: string;
      name: string;
      email: string;
      accountType: RegistrationAccountType;
      driverVehicleType?: 'bike' | 'auto' | 'car';
      referralCode?: string;
    };

    const email = body.email.trim().toLowerCase();
    const phone = normalizePhone(body.phone.trim());
    if (phone.length !== 10) {
      next(createError(400, 'Enter a valid 10-digit mobile number'));
      return;
    }

    const dupPhone = await User.findOne({ phone });
    if (dupPhone) {
      next(createError(409, 'Phone already registered'));
      return;
    }
    const dupEmail = await User.findOne({ email });
    if (dupEmail) {
      next(createError(409, 'Email already registered'));
      return;
    }

    const referralNormalized = normalizeReferralCode(body.referralCode);
    const referralCheck = await validateReferralForSignup(referralNormalized, phone);
    if (!referralCheck.valid) {
      next(createError(400, referralCheck.message ?? 'Invalid referral code'));
      return;
    }

    await VerificationSession.deleteMany({
      $or: [{ phone }, { email }],
    });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const otp = String(randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    const driverVehicleType: 'bike' | 'auto' | 'car' | null =
      body.accountType === 'driver'
        ? body.driverVehicleType ?? null
        : null;

    await VerificationSession.create({
      sessionId,
      email,
      phone,
      passwordHash,
      name: body.name.trim(),
      accountType: body.accountType,
      driverVehicleType,
      otpHash,
      expiresAt,
      attempts: 0,
      referralCode: referralNormalized,
    });

    await sendVerificationOtp(email, otp, body.name.trim());

    res.status(201).json({
      sessionId,
      emailMask: maskEmail(email),
      message: 'Verification code sent to your email.',
    });
  } catch (e) {
    next(e);
  }
}

export async function registerVerify(
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
    const { sessionId, otp } = req.body as { sessionId: string; otp: string };
    const session = await VerificationSession.findOne({ sessionId });
    if (!session) {
      next(createError(404, 'Session expired or invalid. Start registration again.'));
      return;
    }
    if (session.expiresAt.getTime() < Date.now()) {
      await VerificationSession.deleteOne({ _id: session._id });
      next(createError(410, 'Code expired. Start registration again.'));
      return;
    }

    const plain = otp.trim().replace(/\s/g, '');
    const ok = await bcrypt.compare(plain, session.otpHash);
    if (!ok) {
      session.attempts += 1;
      await session.save();
      if (session.attempts >= MAX_OTP_ATTEMPTS) {
        await VerificationSession.deleteOne({ _id: session._id });
        next(createError(429, 'Too many incorrect codes. Please register again.'));
        return;
      }
      next(createError(400, 'Invalid verification code'));
      return;
    }

    const dupPhone = await User.findOne({ phone: session.phone });
    const dupEmail = await User.findOne({ email: session.email });
    if (dupPhone || dupEmail) {
      await VerificationSession.deleteOne({ _id: session._id });
      next(createError(409, 'Phone or email was registered while you verified. Start again.'));
      return;
    }

    const driverVehicleType =
      session.accountType === 'driver' ? session.driverVehicleType : null;

    const user = await User.create({
      phone: session.phone,
      email: session.email,
      emailVerified: true,
      passwordHash: session.passwordHash,
      name: session.name,
      role: session.accountType,
      driverVehicleType,
      savedAddresses: [],
      isCaptainAvailable:
        session.accountType === 'driver' || session.accountType === 'delivery_partner'
          ? true
          : false,
      referralWalletBalance: 0,
      referralCount: 0,
    });

    await ensureUserReferralCode(user);

    let referralBonus: { credited: boolean; amount: number } | null = null;
    const sessionReferral = normalizeReferralCode(session.referralCode);
    if (sessionReferral) {
      const referrer = await findReferrerByCode(sessionReferral);
      if (referrer && referrer._id.toString() !== user._id.toString()) {
        referralBonus = await applyReferralOnSignup(referrer, user);
      }
    }

    await VerificationSession.deleteOne({ _id: session._id });

    const token = signToken(user.id, user.role);
    res.status(201).json({
      accessToken: token,
      user: sanitizeUser(user),
      referralBonus,
    });
  } catch (e) {
    next(e);
  }
}

export async function registerResendOtp(
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
    const { sessionId } = req.body as { sessionId: string };
    const session = await VerificationSession.findOne({ sessionId });
    if (!session) {
      next(createError(404, 'Session expired or invalid. Start registration again.'));
      return;
    }
    if (session.expiresAt.getTime() < Date.now()) {
      await VerificationSession.deleteOne({ _id: session._id });
      next(createError(410, 'Session expired. Start registration again.'));
      return;
    }

    const otp = String(randomInt(100000, 1000000));
    session.otpHash = await bcrypt.hash(otp, 10);
    session.expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    session.attempts = 0;
    await session.save();

    await sendVerificationOtp(session.email, otp, session.name);

    res.json({
      emailMask: maskEmail(session.email),
      message: 'A new code was sent to your email.',
    });
  } catch (e) {
    next(e);
  }
}

export async function login(
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
    const { phone, email, password } = req.body as {
      phone?: string;
      email?: string;
      password: string;
    };

    const phoneTrim = phone?.trim() ? normalizePhone(phone.trim()) : undefined;
    const emailTrim = email?.trim().toLowerCase();

    let user = null as InstanceType<typeof User> | null;
    if (phoneTrim) {
      if (phoneTrim.length !== 10) {
        next(createError(400, 'Enter a valid 10-digit mobile number'));
        return;
      }
      user = await User.findOne({ phone: phoneTrim });
    }
    if (!user && emailTrim) {
      user = await User.findOne({ email: emailTrim });
    }

    if (!user) {
      next(createError(401, 'Invalid credentials'));
      return;
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      next(createError(401, 'Invalid credentials'));
      return;
    }

    if (user.email && user.emailVerified !== true) {
      next(createError(403, 'Please verify your email before signing in.'));
      return;
    }

    const token = signToken(user.id, user.role);
    res.json({
      accessToken: token,
      user: sanitizeUser(user),
    });
  } catch (e) {
    next(e);
  }
}

export async function me(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(createError(401));
      return;
    }
    const user = await User.findById(req.user.sub);
    if (!user) {
      next(createError(404, 'User not found'));
      return;
    }
    res.json(sanitizeUser(user));
  } catch (e) {
    next(e);
  }
}

function signToken(userId: string, role: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw createError(500, 'JWT_SECRET not configured');
  }
  return jwt.sign({ sub: userId, role }, secret, {
    expiresIn: `${JWT_EXPIRES_DAYS}d`,
  });
}

export function sanitizeUser(doc: InstanceType<typeof User>) {
  return {
    id: doc.id,
    phone: doc.phone,
    email: doc.email ?? undefined,
    emailVerified: Boolean(doc.emailVerified),
    name: doc.name,
    role: doc.role,
    driverVehicleType: doc.driverVehicleType ?? undefined,
    savedAddresses: doc.savedAddresses,
  };
}
