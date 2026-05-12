import { db } from '@/db';
import { wallets, transactions, users } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createModuleLogger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { CurrencyCode, WalletStatus, TransactionType, TransactionStatus } from '@/types';

const log = createModuleLogger('WalletService');

export interface CreateWalletRequest {
  userId: string;
  currency: CurrencyCode;
}

export interface WalletSummary {
  id: string;
  currency: string;
  balance: number;       // human-readable (e.g. 100.00)
  availableBalance: number;
  reservedBalance: number;
  status: string;
  accountNumber: string | null;
  accountName: string | null;
  bankCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionListOptions {
  walletId: string;
  userId: string;   // for ownership check
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
}

export class WalletService {
  // --------------------------------------------------------
  // Internal: unit helpers  (store amounts in minor units)
  // --------------------------------------------------------
  static toMinorUnits(amount: number): number {
    return Math.round(amount * 100);
  }

  static fromMinorUnits(amount: number): number {
    return Number(amount) / 100;
  }

  // --------------------------------------------------------
  // Get all wallets for a user
  // --------------------------------------------------------
  static async getUserWallets(userId: string): Promise<WalletSummary[]> {
    const rows = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, userId), eq(wallets.status, 'active')));

    return rows.map(WalletService.formatWallet);
  }

  // --------------------------------------------------------
  // Get a single wallet (with ownership check)
  // --------------------------------------------------------
  static async getWallet(walletId: string, userId: string): Promise<WalletSummary> {
    const rows = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)))
      .limit(1);

    if (rows.length === 0) {
      throw createError.notFound('Wallet not found', 'WALLET_NOT_FOUND');
    }

    return WalletService.formatWallet(rows[0]);
  }

  // --------------------------------------------------------
  // Create a wallet for a currency (one per user per currency)
  // --------------------------------------------------------
  static async createWallet(req: CreateWalletRequest): Promise<WalletSummary> {
    // Validate user exists
    const userRows = await db.select({ id: users.id }).from(users).where(eq(users.id, req.userId)).limit(1);
    if (userRows.length === 0) {
      throw createError.notFound('User not found', 'USER_NOT_FOUND');
    }

    // Check for duplicate
    const existing = await db
      .select({ id: wallets.id })
      .from(wallets)
      .where(and(eq(wallets.userId, req.userId), eq(wallets.currency, req.currency)))
      .limit(1);

    if (existing.length > 0) {
      throw createError.conflict(`You already have a ${req.currency} wallet`, 'WALLET_ALREADY_EXISTS');
    }

    const rows = await db
      .insert(wallets)
      .values({
        userId: req.userId,
        currency: req.currency,
        balance: 0,
        availableBalance: 0,
        reservedBalance: 0,
        status: WalletStatus.ACTIVE
      })
      .returning();

    log.info({ message: 'Wallet created', userId: req.userId, currency: req.currency });

    return WalletService.formatWallet(rows[0]);
  }

  // --------------------------------------------------------
  // Freeze / unfreeze
  // --------------------------------------------------------
  static async setWalletStatus(
    walletId: string,
    userId: string,
    status: WalletStatus.ACTIVE | WalletStatus.FROZEN
  ): Promise<WalletSummary> {
    await WalletService.getWallet(walletId, userId); // ownership check

    const rows = await db
      .update(wallets)
      .set({ status, updatedAt: new Date() })
      .where(eq(wallets.id, walletId))
      .returning();

    log.info({ message: `Wallet ${status}`, walletId, userId });

    return WalletService.formatWallet(rows[0]);
  }

  // --------------------------------------------------------
  // Credit wallet (internal — used by P2P, webhooks)
  // --------------------------------------------------------
  static async creditWallet(
    walletId: string,
    amountMinor: number,
    description: string,
    type: TransactionType,
    reference: string,
    relatedTransactionId?: string
  ): Promise<void> {
    const walletRows = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (walletRows.length === 0) throw createError.notFound('Wallet not found');

    const wallet = walletRows[0];
    if (wallet.status === WalletStatus.FROZEN) {
      throw createError.forbidden('Wallet is frozen', 'WALLET_FROZEN');
    }

    const newBalance = Number(wallet.balance) + amountMinor;
    const newAvailable = Number(wallet.availableBalance) + amountMinor;

    // Update balance
    await db
      .update(wallets)
      .set({
        balance: newBalance,
        availableBalance: newAvailable,
        updatedAt: new Date()
      })
      .where(eq(wallets.id, walletId));

    // Record transaction
    await db.insert(transactions).values({
      walletId,
      type,
      amount: amountMinor,
      currency: wallet.currency,
      status: TransactionStatus.COMPLETED,
      description,
      reference,
      relatedTransactionId: relatedTransactionId ?? null
    });

    log.info({ message: 'Wallet credited', walletId, amount: amountMinor.toString() });
  }

  // --------------------------------------------------------
  // Debit wallet (internal — validates sufficient funds)
  // --------------------------------------------------------
  static async debitWallet(
    walletId: string,
    amountMinor: number,
    description: string,
    type: TransactionType,
    reference: string,
    idempotencyKey?: string,
    relatedTransactionId?: string
  ): Promise<void> {
    const walletRows = await db.select().from(wallets).where(eq(wallets.id, walletId)).limit(1);
    if (walletRows.length === 0) throw createError.notFound('Wallet not found');

    const wallet = walletRows[0];

    if (wallet.status === WalletStatus.FROZEN) {
      throw createError.forbidden('Wallet is frozen', 'WALLET_FROZEN');
    }

    const available = Number(wallet.availableBalance);
    if (available < amountMinor) {
      throw createError.unprocessableEntity('Insufficient funds', 'INSUFFICIENT_FUNDS');
    }

    const newBalance = Number(wallet.balance) - amountMinor;
    const newAvailable = available - amountMinor;

    await db
      .update(wallets)
      .set({
        balance: newBalance,
        availableBalance: newAvailable,
        updatedAt: new Date()
      })
      .where(eq(wallets.id, walletId));

    // Record transaction
    await db.insert(transactions).values({
      walletId,
      type,
      amount: amountMinor,
      currency: wallet.currency,
      status: TransactionStatus.COMPLETED,
      description,
      reference,
      idempotencyKey: idempotencyKey ?? null,
      relatedTransactionId: relatedTransactionId ?? null
    });

    log.info({ message: 'Wallet debited', walletId, amount: amountMinor.toString() });
  }

  // --------------------------------------------------------
  // Get transaction history for a wallet
  // --------------------------------------------------------
  static async getTransactions(opts: TransactionListOptions) {
    // Ownership check
    await WalletService.getWallet(opts.walletId, opts.userId);

    const page = opts.page ?? 1;
    const pageSize = Math.min(opts.pageSize ?? 20, 100);
    const offset = (page - 1) * pageSize;

    const conditions = [eq(transactions.walletId, opts.walletId)];
    if (opts.type) conditions.push(eq(transactions.type, opts.type));
    if (opts.status) conditions.push(eq(transactions.status, opts.status));

    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(and(...conditions));

    const total = countRows[0]?.count ?? 0;

    return {
      data: rows.map(WalletService.formatTransaction),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  // --------------------------------------------------------
  // Get a single transaction
  // --------------------------------------------------------
  static async getTransaction(transactionId: string, userId: string) {
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (rows.length === 0) throw createError.notFound('Transaction not found', 'TRANSACTION_NOT_FOUND');

    const tx = rows[0];

    // Verify ownership via wallet
    await WalletService.getWallet(tx.walletId, userId);

    return WalletService.formatTransaction(tx);
  }

  // --------------------------------------------------------
  // Formatters
  // --------------------------------------------------------
  static formatWallet(row: any): WalletSummary {
    return {
      id: row.id,
      currency: row.currency,
      balance: WalletService.fromMinorUnits(row.balance),
      availableBalance: WalletService.fromMinorUnits(row.availableBalance),
      reservedBalance: WalletService.fromMinorUnits(row.reservedBalance),
      status: row.status,
      accountNumber: row.accountNumber,
      accountName: row.accountName,
      bankCode: row.bankCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  static formatTransaction(row: any) {
    return {
      id: row.id,
      walletId: row.walletId,
      type: row.type,
      amount: WalletService.fromMinorUnits(row.amount),
      currency: row.currency,
      status: row.status,
      description: row.description,
      reference: row.reference,
      fees: row.fees,
      metadata: row.metadata,
      relatedTransactionId: row.relatedTransactionId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
