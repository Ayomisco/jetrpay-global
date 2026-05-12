import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TransferService } from '@/services/transfer';
import { WalletService } from '@/services/wallet';
import { CurrencyCode } from '@/types';
import { createError } from '@/middleware/errorHandler';

// ── Schemas ───────────────────────────────────────────────────

const p2pSchema = z.object({
  senderWalletId: z.string().uuid('Invalid wallet ID'),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  recipientUserId: z.string().uuid().optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.nativeEnum(CurrencyCode),
  description: z.string().max(255).optional()
}).refine(
  (d) => d.recipientEmail ?? d.recipientPhone ?? d.recipientUserId,
  { message: 'Provide recipientEmail, recipientPhone, or recipientUserId' }
);

const bankTransferSchema = z.object({
  walletId: z.string().uuid('Invalid wallet ID'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.nativeEnum(CurrencyCode),
  recipientAccountNumber: z.string().min(10).max(20),
  recipientBankCode: z.string().min(3).max(10),
  recipientAccountName: z.string().min(2).max(100),
  narration: z.string().max(100).optional()
});

const validateBankSchema = z.object({
  bankCode: z.string().min(3).max(10),
  accountNumber: z.string().min(10).max(20)
});

// ── Helpers ───────────────────────────────────────────────────

function ok(res: Response, data: unknown, message?: string) {
  return res.status(200).json({ success: true, message: message ?? 'OK', data, timestamp: new Date().toISOString() });
}

// ── Handlers ──────────────────────────────────────────────────

export async function p2pTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) throw createError.badRequest('X-Idempotency-Key header is required', 'MISSING_IDEMPOTENCY_KEY');

    const body = p2pSchema.parse(req.body);

    const result = await TransferService.sendP2P({
      senderUserId: req.user!.userId,
      senderWalletId: body.senderWalletId,
      recipientEmail: body.recipientEmail,
      recipientPhone: body.recipientPhone,
      recipientUserId: body.recipientUserId,
      amount: body.amount,
      currency: body.currency,
      description: body.description,
      idempotencyKey
    });

    ok(res, { transfer: result }, 'Transfer completed');
  } catch (err) {
    next(err);
  }
}

export async function bankTransfer(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] as string;
    if (!idempotencyKey) throw createError.badRequest('X-Idempotency-Key header is required', 'MISSING_IDEMPOTENCY_KEY');

    const body = bankTransferSchema.parse(req.body);

    const result = await TransferService.sendBankTransfer({
      userId: req.user!.userId,
      walletId: body.walletId,
      amount: body.amount,
      currency: body.currency,
      recipientAccountNumber: body.recipientAccountNumber,
      recipientBankCode: body.recipientBankCode,
      recipientAccountName: body.recipientAccountName,
      narration: body.narration,
      idempotencyKey
    });

    ok(res, { transfer: result }, 'Bank transfer initiated');
  } catch (err) {
    next(err);
  }
}

export async function validateBankAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const body = validateBankSchema.parse(req.body);
    const result = await TransferService.validateBankAccount(body);
    ok(res, { account: result }, 'Account validated');
  } catch (err) {
    next(err);
  }
}
