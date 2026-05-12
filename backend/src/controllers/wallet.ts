import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { WalletService } from '@/services/wallet';
import { createError } from '@/middleware/errorHandler';
import { CurrencyCode, WalletStatus } from '@/types';
export async function freezeWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await WalletService.setWalletStatus(req.params.id, req.user!.userId, WalletStatus.FROZEN);
    ok(res, { wallet }, 'Wallet frozen');
  } catch (err) {
    next(err);
  }
}

export async function unfreezeWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await WalletService.setWalletStatus(req.params.id, req.user!.userId, WalletStatus.ACTIVE);
    ok(res, { wallet }, 'Wallet unfrozen');
  } catch (err) {
    next(err);
  }
}


// ── Zod schemas ──────────────────────────────────────────────

const createWalletSchema = z.object({
  currency: z.nativeEnum(CurrencyCode)
});

const listTransactionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  status: z.string().optional()
});

// ── Controller helpers ────────────────────────────────────────

function ok(res: Response, data: unknown, message?: string) {
  return res.status(200).json({ success: true, message: message ?? 'OK', data, timestamp: new Date().toISOString() });
}

function created(res: Response, data: unknown, message?: string) {
  return res.status(201).json({ success: true, message: message ?? 'Created', data, timestamp: new Date().toISOString() });
}

// ── Handlers ──────────────────────────────────────────────────

export async function listWallets(req: Request, res: Response, next: NextFunction) {
  try {
    const wallets = await WalletService.getUserWallets(req.user!.userId);
    ok(res, { wallets });
  } catch (err) {
    next(err);
  }
}

export async function getWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await WalletService.getWallet(req.params.id, req.user!.userId);
    ok(res, { wallet });
  } catch (err) {
    next(err);
  }
}

export async function getWalletBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const wallet = await WalletService.getWallet(req.params.id, req.user!.userId);
    ok(res, {
      walletId: wallet.id,
      currency: wallet.currency,
      balance: wallet.balance,
      availableBalance: wallet.availableBalance,
      reservedBalance: wallet.reservedBalance
    });
  } catch (err) {
    next(err);
  }
}

export async function createWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const body = createWalletSchema.parse(req.body);
    const wallet = await WalletService.createWallet({ userId: req.user!.userId, currency: body.currency });
    created(res, { wallet }, 'Wallet created');
  } catch (err) {
    next(err);
  }
}

export async function listWalletTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listTransactionsSchema.parse(req.query);
    const result = await WalletService.getTransactions({
      walletId: req.params.id,
      userId: req.user!.userId,
      ...query
    });
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const tx = await WalletService.getTransaction(req.params.txId, req.user!.userId);
    ok(res, { transaction: tx });
  } catch (err) {
    next(err);
  }
}
