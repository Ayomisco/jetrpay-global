import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/services/auth';
import { cryptoService } from '@/utils/crypto';
import { createError } from '@/middleware/errorHandler';
import { logger, createModuleLogger } from '@/utils/logger';
import redis from '@/utils/redis';
import { z } from 'zod';

const log = createModuleLogger('AuthController');

// Request validation schemas
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const verifyOTPSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

const resendOTPSchema = z.object({
  email: z.string().email('Invalid email address')
});

/**
 * Sign up - create new user and send OTP
 */
export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = signupSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return next(createError.badRequest(errors, 'VALIDATION_ERROR'));
    }

    const { email, firstName, lastName, phone, password } = validationResult.data;

    // Get device fingerprint
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = cryptoService.generateDeviceFingerprint(userAgent);
    const ipAddress = req.ip || '0.0.0.0';

    // Call auth service
    const result = await AuthService.signup({
      email,
      firstName,
      lastName,
      phone,
      password,
      deviceFingerprint,
      userAgent,
      ipAddress
    });

    log.info({
      message: 'Signup successful',
      userId: result.userId,
      email: result.email
    });

    res.status(201).json({
      success: true,
      data: {
        userId: result.userId,
        email: result.email,
        message: 'Signup successful. Check your email for OTP.',
        otpSent: result.otpSent,
        otpExpiresIn: result.expiresIn
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP - confirm email and create session
 */
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = verifyOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return next(createError.badRequest(errors, 'VALIDATION_ERROR'));
    }

    const { email, otp } = validationResult.data;

    // Get device fingerprint
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = cryptoService.generateDeviceFingerprint(userAgent);
    const deviceName = req.body.deviceName || 'Web Browser';

    // Call auth service
    const result = await AuthService.verifyOTP({
      email,
      otp,
      deviceFingerprint,
      deviceName
    });

    log.info({
      message: 'OTP verified',
      userId: result.userId,
      email: result.user.email
    });

    res.status(200).json({
      success: true,
      data: {
        userId: result.userId,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: 'Email verified successfully. Welcome!'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login - authenticate with email and password
 */
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return next(createError.badRequest(errors, 'VALIDATION_ERROR'));
    }

    const { email, password } = validationResult.data;

    // Get device fingerprint
    const userAgent = req.headers['user-agent'] || 'unknown';
    const deviceFingerprint = cryptoService.generateDeviceFingerprint(userAgent);
    const ipAddress = req.ip || '0.0.0.0';
    const deviceName = req.body.deviceName || 'Web Browser';

    // Call auth service
    const result = await AuthService.login({
      email,
      password,
      deviceFingerprint,
      userAgent,
      ipAddress,
      deviceName
    });

    if (result.requiresOTP) {
      log.info({
        message: 'Login requires OTP verification',
        userId: result.userId,
        email
      });

      return res.status(202).json({
        success: true,
        data: {
          userId: result.userId,
          message: 'Email verification required. Check your inbox for OTP.',
          requiresOTP: true,
          otpExpiresIn: result.otpExpiresIn
        },
        timestamp: new Date().toISOString()
      });
    }

    log.info({
      message: 'User logged in',
      userId: result.userId,
      email
    });

    res.status(200).json({
      success: true,
      data: {
        userId: result.userId,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: 'Login successful'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return next(createError.badRequest(errors, 'VALIDATION_ERROR'));
    }

    const { refreshToken: token } = validationResult.data;

    // Call auth service
    const result = await AuthService.refreshToken({
      refreshToken: token
    });

    log.debug('Token refreshed');

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        message: 'Token refreshed successfully'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend OTP
 */
export const resendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = resendOTPSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      return next(createError.badRequest(errors, 'VALIDATION_ERROR'));
    }

    const { email } = validationResult.data;

    // Call auth service
    const result = await AuthService.resendOTP(email);

    log.info({
      message: 'OTP resent',
      email
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'OTP sent successfully. Check your email.',
        otpExpiresIn: result.expiresIn
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user (requires authentication)
 */
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(createError.unauthorized('User not authenticated'));
    }

    res.status(200).json({
      success: true,
      data: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout — blacklist the access token in Redis so it can't be reused.
 * TTL matches the token's remaining lifetime so Redis cleans itself up.
 */
export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.token) {
      return next(createError.unauthorized('User not authenticated'));
    }

    // Blacklist the token in Redis until it expires naturally (self-cleaning)
    const exp = req.user.exp ?? 0;
    const ttlSecs = Math.max(0, exp - Math.floor(Date.now() / 1000));

    if (ttlSecs > 0) {
      await redis.set(`blacklist:${req.token}`, '1', { EX: ttlSecs });
    }

    log.info({ message: 'User logged out, token blacklisted', userId: req.user.userId, ttlSecs });

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};
