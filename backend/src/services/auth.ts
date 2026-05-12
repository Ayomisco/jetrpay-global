import { db } from '@/db';
import { users, devices, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { cryptoService } from '@/utils/crypto';
import { jwtService, JWTPayload } from '@/utils/jwt';
import { getPlunkEmailService } from '@/services/email';
import { createError } from '@/middleware/errorHandler';
import { logger, createModuleLogger } from '@/utils/logger';
import redis from '@/utils/redis';
import { User, UserRole, UserStatus } from '@/types';

const log = createModuleLogger('AuthService');

const MAX_OTP_ATTEMPTS = 3;
const OTP_EXPIRY_SECS = 10 * 60; // 10 minutes

interface OTPRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

async function getOTP(email: string): Promise<OTPRecord | null> {
  const raw = await redis.get(`otp:${email}`);
  return raw ? (JSON.parse(raw) as OTPRecord) : null;
}

async function setOTP(email: string, record: OTPRecord): Promise<void> {
  await redis.set(`otp:${email}`, JSON.stringify(record), { EX: OTP_EXPIRY_SECS });
}

async function updateOTP(email: string, record: OTPRecord): Promise<void> {
  await redis.set(`otp:${email}`, JSON.stringify(record), { KEEPTTL: true });
}

async function deleteOTP(email: string): Promise<void> {
  await redis.del(`otp:${email}`);
}

export interface SignupRequest {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  password: string;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress: string;
}

export interface SignupResponse {
  userId: string;
  email: string;
  otpSent: boolean;
  expiresIn: number; // seconds
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
  deviceFingerprint: string;
  deviceName?: string;
}

export interface VerifyOTPResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  user: Omit<User, 'passwordHash'>;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress: string;
  deviceName?: string;
}

export interface LoginResponse {
  userId: string;
  accessToken: string;
  refreshToken: string;
  requiresOTP: boolean;
  otpExpiresIn?: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Sign up new user and send OTP
   */
  static async signup(request: SignupRequest): Promise<SignupResponse> {
    try {
      // Validate email uniqueness
      const existingUser = await db.select().from(users).where(eq(users.email, request.email)).limit(1);

      if (existingUser.length > 0) {
        throw createError.conflict('Email already registered', 'EMAIL_ALREADY_EXISTS');
      }

      // Validate password strength
      const passwordValidation = cryptoService.validatePasswordStrength(request.password);
      if (!passwordValidation.isStrong) {
        throw createError.badRequest(
          `Password is not strong enough: ${passwordValidation.feedback.join(', ')}`,
          'WEAK_PASSWORD'
        );
      }

      // Hash password
      const passwordHash = await cryptoService.hashPassword(request.password);

      // Create user
      const newUser = await db
        .insert(users)
        .values({
          email: request.email,
          phone: request.phone,
          firstName: request.firstName,
          lastName: request.lastName,
          passwordHash,
          role: UserRole.USER,
          status: UserStatus.PENDING,
          emailVerified: false
        })
        .returning();

      const userId = newUser[0].id;

      // Generate and store OTP in Redis
      const otp = cryptoService.generateOTP();
      const expiresAt = Date.now() + OTP_EXPIRY_SECS * 1000;

      await setOTP(request.email, { code: otp, expiresAt, attempts: 0 });

      // Send OTP email
      const emailService = getPlunkEmailService();
      const emailResult = await emailService.sendOTPEmail(request.email, otp, 10);

      if (!emailResult.success) {
        log.warn({
          message: 'Failed to send OTP email',
          email: request.email,
          error: emailResult.error
        });
      }

      // Create device record (skip if fingerprint already exists — e.g. same test agent)
      const deviceFingerprint = cryptoService.generateDeviceFingerprint(request.userAgent);
      await db.insert(devices).values({
        userId,
        fingerprint: deviceFingerprint,
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
        deviceName: 'Unknown Device',
        isVerified: false
      }).onConflictDoNothing();

      // Log signup attempt
      await this.logAuditAction(
        userId,
        'signup_initiated',
        'user',
        userId,
        { email: request.email },
        request.ipAddress,
        request.userAgent,
        'success'
      );

      log.info({
        message: 'User signup initiated',
        userId,
        email: request.email
      });

      return {
        userId,
        email: request.email,
        otpSent: emailResult.success,
        expiresIn: OTP_EXPIRY_SECS
      };
    } catch (error) {
      log.error('Signup failed', error);
      throw error;
    }
  }

  /**
   * Verify OTP and create user session
   */
  static async verifyOTP(request: VerifyOTPRequest): Promise<VerifyOTPResponse> {
    try {
      const otpRecord = await getOTP(request.email);

      if (!otpRecord) {
        throw createError.badRequest('OTP not found or expired', 'OTP_NOT_FOUND');
      }

      if (Date.now() > otpRecord.expiresAt) {
        await deleteOTP(request.email);
        throw createError.badRequest('OTP has expired', 'OTP_EXPIRED');
      }

      if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        await deleteOTP(request.email);
        throw createError.badRequest(
          'Too many OTP attempts. Please request a new code.',
          'OTP_MAX_ATTEMPTS'
        );
      }

      if (request.otp !== otpRecord.code) {
        otpRecord.attempts++;
        await updateOTP(request.email, otpRecord);
        throw createError.badRequest('Invalid OTP', 'INVALID_OTP');
      }

      // OTP verified - clean up
      await deleteOTP(request.email);

      // Get user
      const userRows = await db.select().from(users).where(eq(users.email, request.email)).limit(1);

      if (userRows.length === 0) {
        throw createError.notFound('User not found', 'USER_NOT_FOUND');
      }

      const user = userRows[0];

      // Update user status
      await db
        .update(users)
        .set({
          status: UserStatus.ACTIVE,
          emailVerified: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));

      // Update device verification
      await db
        .update(devices)
        .set({ isVerified: true })
        .where(eq(devices.fingerprint, request.deviceFingerprint));

      // Generate tokens
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role as any,
        deviceId: request.deviceFingerprint
      };

      const { accessToken, refreshToken } = jwtService.generateTokenPair(payload);

      // Log verification
      await this.logAuditAction(
        user.id,
        'email_verified',
        'user',
        user.id,
        { method: 'otp' },
        '',
        request.deviceFingerprint,
        'success'
      );

      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;

      log.info({
        message: 'OTP verified successfully',
        userId: user.id,
        email: user.email
      });

      return {
        userId: user.id,
        accessToken,
        refreshToken,
        user: userWithoutPassword as any
      };
    } catch (error) {
      log.error('OTP verification failed', error);
      throw error;
    }
  }

  /**
   * Login with email and password
   */
  static async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user
      const userRows = await db.select().from(users).where(eq(users.email, request.email)).limit(1);

      if (userRows.length === 0) {
        throw createError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      const user = userRows[0];

      // Check account status
      if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
        throw createError.forbidden('Account is suspended or deactivated', 'ACCOUNT_INACTIVE');
      }

      // Verify password
      const isPasswordValid = await cryptoService.comparePassword(request.password, user.passwordHash);

      if (!isPasswordValid) {
        log.warn({
          message: 'Invalid password attempt',
          email: request.email,
          ipAddress: request.ipAddress
        });
        throw createError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        // Send new OTP for verification
        const otp = cryptoService.generateOTP();
        const expiresAt = Date.now() + OTP_EXPIRY_SECS * 1000;

        await setOTP(request.email, { code: otp, expiresAt, attempts: 0 });

        // Send OTP email
        const emailService = getPlunkEmailService();
        await emailService.sendOTPEmail(request.email, otp, 10);

        log.info({
          message: 'Login requires OTP verification',
          userId: user.id,
          email: request.email
        });

        return {
          userId: user.id,
          accessToken: '',
          refreshToken: '',
          requiresOTP: true,
          otpExpiresIn: OTP_EXPIRY_SECS
        };
      }

      // Generate tokens
      const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: user.id,
        email: user.email,
        role: user.role as any,
        deviceId: request.deviceFingerprint
      };

      const { accessToken, refreshToken } = jwtService.generateTokenPair(payload);

      // Create or update device
      const existingDevice = await db
        .select()
        .from(devices)
        .where(eq(devices.fingerprint, request.deviceFingerprint))
        .limit(1);

      if (existingDevice.length > 0) {
        await db
          .update(devices)
          .set({
            lastUsedAt: new Date()
          })
          .where(eq(devices.fingerprint, request.deviceFingerprint));
      } else {
        await db.insert(devices).values({
          userId: user.id,
          fingerprint: request.deviceFingerprint,
          userAgent: request.userAgent,
          ipAddress: request.ipAddress,
          deviceName: request.deviceName || 'Unknown Device',
          isVerified: true
        });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Log login
      await this.logAuditAction(
        user.id,
        'login',
        'user',
        user.id,
        { deviceName: request.deviceName },
        request.ipAddress,
        request.userAgent,
        'success'
      );

      log.info({
        message: 'User logged in',
        userId: user.id,
        email: request.email
      });

      return {
        userId: user.id,
        accessToken,
        refreshToken,
        requiresOTP: false
      };
    } catch (error) {
      log.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const payload = jwtService.verifyToken(request.refreshToken);

      // Generate new token pair
      const newPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        deviceId: payload.deviceId
      };

      const { accessToken, refreshToken } = jwtService.generateTokenPair(newPayload);

      log.debug({
        message: 'Token refreshed',
        userId: payload.userId
      });

      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      log.error('Token refresh failed', error);
      throw error;
    }
  }

  /**
   * Resend OTP
   */
  static async resendOTP(email: string): Promise<{ expiresIn: number }> {
    try {
      // Check if user exists
      const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (userRows.length === 0) {
        throw createError.notFound('User not found', 'USER_NOT_FOUND');
      }

      // Generate new OTP
      const otp = cryptoService.generateOTP();

      await setOTP(email, {
        code: otp,
        expiresAt: Date.now() + OTP_EXPIRY_SECS * 1000,
        attempts: 0
      });

      // Send OTP email
      const emailService = getPlunkEmailService();
      await emailService.sendOTPEmail(email, otp, 10);

      log.info({
        message: 'OTP resent',
        email
      });

      return { expiresIn: OTP_EXPIRY_SECS };
    } catch (error) {
      log.error('OTP resend failed', error);
      throw error;
    }
  }

  /**
   * Log audit action
   */
  private static async logAuditAction(
    userId: string,
    action: string,
    resource: string,
    resourceId: string,
    changes: Record<string, any>,
    ipAddress: string,
    userAgent: string,
    status: 'success' | 'failure'
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId,
        action,
        resource,
        resourceId,
        changes,
        ipAddress,
        userAgent,
        status
      });
    } catch (error) {
      log.error('Failed to log audit action', error);
      // Don't throw - audit logging should not fail the main operation
    }
  }
}
