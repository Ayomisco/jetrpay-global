import jwt from 'jsonwebtoken';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'merchant' | 'admin';
  deviceId?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_EXPIRE = process.env.JWT_REFRESH_EXPIRE || '30d';

export const jwtService = {
  /**
   * Generate access token
   */
  generateAccessToken: (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRE as any,
        algorithm: 'HS256'
      });
    } catch (error) {
      logger.error('Failed to generate access token', error);
      throw createError.internalError('Failed to generate access token');
    }
  },

  /**
   * Generate refresh token
   */
  generateRefreshToken: (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRE as any,
        algorithm: 'HS256'
      });
    } catch (error) {
      logger.error('Failed to generate refresh token', error);
      throw createError.internalError('Failed to generate refresh token');
    }
  },

  /**
   * Generate both access and refresh tokens
   */
  generateTokenPair: (payload: Omit<JWTPayload, 'iat' | 'exp'>) => {
    return {
      accessToken: jwtService.generateAccessToken(payload),
      refreshToken: jwtService.generateRefreshToken(payload)
    };
  },

  /**
   * Verify and decode token
   */
  verifyToken: (token: string): JWTPayload => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw createError.unauthorized('Token expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError.unauthorized('Invalid token', 'INVALID_TOKEN');
      }
      throw createError.unauthorized('Token verification failed', 'TOKEN_VERIFICATION_FAILED');
    }
  },

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken: (token: string): JWTPayload | null => {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      return null;
    }
  },

  /**
   * Get expiry time in seconds
   */
  getTokenExpiry: (token: string): number | null => {
    const decoded = jwtService.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    return decoded.exp - Math.floor(Date.now() / 1000);
  },

  /**
   * Check if token is expired
   */
  isTokenExpired: (token: string): boolean => {
    const expiry = jwtService.getTokenExpiry(token);
    return expiry === null || expiry <= 0;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
};
