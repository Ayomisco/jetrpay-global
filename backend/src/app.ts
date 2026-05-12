import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import authRoutes from '@/routes/auth';
import walletRoutes from '@/routes/wallet';
import transferRoutes from '@/routes/transfer';
import webhookRoutes from '@/routes/webhooks';
import { authenticate } from '@/middleware/auth';
import { setupSwagger } from '@/swagger';

const app: Application = express();

// ============================================
// Middleware
// ============================================

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
}));

// Webhook signature verification depends on the raw request body.
// Mount this before express.json() so req.body is a Buffer for webhook routes.
app.use('/webhooks', express.raw({ type: 'application/json', limit: '2mb' }), webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.path, ip: req.ip });
  next();
});

// ============================================
// Health Check
// ============================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// ============================================
// API Routes
// ============================================

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/wallets', authenticate, walletRoutes);
app.use('/api/v1/transfers', authenticate, transferRoutes);

// ============================================
// Swagger
// ============================================

setupSwagger(app);

// ============================================
// 404 Handler
// ============================================

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path, method: req.method });
});

// ============================================
// Error Handler (must be last)
// ============================================

app.use(errorHandler);

export default app;
