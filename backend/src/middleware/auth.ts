import { Request, Response, NextFunction } from 'express';
import { jwtService, extractTokenFromHeader, JWTPayload } from '@/utils/jwt';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import redis from '@/utils/redis';

/**
 * Extend Express Request to include authenticated user data
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      token?: string;
    }
  }
}

/**
 * Authentication middleware — validates JWT and checks token blacklist (Redis).
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw createError.unauthorized('No token provided', 'NO_TOKEN');
    }

    const payload = jwtService.verifyToken(token);

    // Reject tokens that have been explicitly revoked (logout)
    const blacklisted = await redis.get(`blacklist:${token}`);
    if (blacklisted) {
      throw createError.unauthorized('Token has been revoked. Please log in again.', 'TOKEN_REVOKED');
    }

    req.user = payload;
    req.token = token;

    next();
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      next(error);
    } else {
      next(createError.unauthorized('Authentication failed'));
    }
  }
};

/**
 * Authorization middleware - checks user role
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError.unauthorized('User not authenticated'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn({
        message: 'Authorization failed',
        userId: req.user.userId,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      return next(createError.forbidden('Insufficient permissions'));
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token, but validates if present
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    if (token) {
      const payload = jwtService.verifyToken(token);
      req.user = payload;
      req.token = token;
    }
  } catch (error) {
    // Silently ignore auth errors for optional auth
    logger.debug('Optional auth failed, continuing without user context');
  }

  next();
};

/**
 * Rate limiting middleware — Redis-backed, distributed-safe.
 */
export const rateLimit = (maxRequests: number = 100, windowMs: number = 900000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'test') return next();

    try {
      const key = `rl:${req.user?.userId || req.ip || 'unknown'}:${req.path}`;

      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pExpire(key, windowMs);
      }

      const ttlMs = await redis.pTTL(key);

      if (count > maxRequests) {
        const retryAfter = Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / 1000);
        res.set('Retry-After', retryAfter.toString());
        return next(
          createError.tooManyRequests(
            `Rate limit exceeded. Try again in ${retryAfter} seconds`,
            'RATE_LIMIT_EXCEEDED'
          )
        );
      }

      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', Math.max(0, maxRequests - count).toString());
      res.set('X-RateLimit-Reset', (Date.now() + (ttlMs > 0 ? ttlMs : windowMs)).toString());

      next();
    } catch (err) {
      // Fail open — don't block requests if Redis is temporarily unavailable
      logger.error({ message: 'Rate limit check failed, failing open', err });
      next();
    }
  };
};

/**
 * Idempotency middleware — Redis-backed, prevents duplicate processing.
 */
export const idempotencyKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!['POST', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const key = req.headers['x-idempotency-key'] as string;
  if (!key) return next();

  (async () => {
    try {
      const cached = await redis.get(`idem:${key}`);

      if (cached) {
        logger.info({ message: 'Returning cached idempotent response', key });
        return res.status(200).json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);

      res.json = function (data: any) {
        // Cache asynchronously — don't block the response
        redis
          .set(`idem:${key}`, JSON.stringify(data), { EX: 86400 })
          .catch((err) => logger.error({ message: 'Failed to cache idempotent response', err }));
        return originalJson(data);
      };

      next();
    } catch (err) {
      // Fail open — proceed without idempotency protection rather than blocking
      logger.error({ message: 'Idempotency check failed, failing open', err });
      next();
    }
  })();
};
