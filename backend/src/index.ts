import dotenv from 'dotenv';
dotenv.config();

// ── Startup guards ────────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be set and at least 32 characters');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  console.error('FATAL: FRONTEND_URL must be set in production');
  process.exit(1);
}

if (!process.env.REDIS_URL) {
  console.error('FATAL: REDIS_URL must be set');
  process.exit(1);
}
// ─────────────────────────────────────────────────────────────

import { logger } from '@/utils/logger';
import { testConnection } from '@/db';
import { connectRedis, disconnectRedis } from '@/utils/redis';
import { startTransferExpiryJob } from '@/jobs/transferExpiry';
import app from '@/app';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  // Connect Redis before accepting requests
  await connectRedis();

  const server = app.listen(PORT, async () => {
    const dbConnected = await testConnection();

    startTransferExpiryJob();

    logger.info(`
    🚀 JetRPay Backend Started

    Environment: ${process.env.NODE_ENV}
    Port: ${PORT}
    API URL: ${process.env.API_URL || `http://localhost:${PORT}`}

    Database: ${dbConnected ? '✅ Connected' : '❌ Failed'}
    Redis: ✅ Connected
    Email Service: ${process.env.EMAIL_SERVICE || '⚠️  Not configured'}
    Zynta Mode: ${process.env.ZYNTA_MODE || '⚠️  Not configured'}

    📚 API Documentation:
    - Health Check: GET http://localhost:${PORT}/health
    - Auth Endpoints: POST http://localhost:${PORT}/api/v1/auth/*

    Available Endpoints:
    - POST   /api/v1/auth/signup       - Create account
    - POST   /api/v1/auth/verify-otp   - Verify email with OTP
    - POST   /api/v1/auth/login        - Login
    - POST   /api/v1/auth/refresh      - Refresh token
    - POST   /api/v1/auth/resend-otp   - Resend OTP
    - GET    /api/v1/auth/me           - Get current user
    - POST   /api/v1/auth/logout       - Logout
  `);
  });

  const shutdown = async (signal: string) => {
    logger.warn(`${signal} received. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectRedis();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
