import { db } from '@/db';
import { wallets, transactions, users, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createError } from '@/middleware/errorHandler';
import { createModuleLogger } from '@/utils/logger';
import { WalletService } from '@/services/wallet';
import { getZyntaClient } from '@/services/zynta/client';
import { TransactionType, TransactionStatus, CurrencyCode } from '@/types';

const log = createModuleLogger('TransferService');

async function logAuditAction(
  userId: string,
  action: string,
  resourceId: string,
  changes: Record<string, any>
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      resource: 'transaction',
      resourceId,
      changes,
      ipAddress: '',
      userAgent: '',
      status: 'success'
    });
  } catch (err) {
    log.error({ message: 'Failed to write audit log', err });
  }
}

// ────────────────────────────────────────────────────────────
// P2P (internal wallet-to-wallet) transfer
// ────────────────────────────────────────────────────────────

export interface P2PTransferRequest {
  senderUserId: string;
  senderWalletId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientUserId?: string;
  amount: number;         // human-readable (e.g. 50.00)
  currency: CurrencyCode;
  description?: string;
  idempotencyKey: string;
}

export interface P2PTransferResult {
  reference: string;
  debitTransactionId: string;
  creditTransactionId: string;
  amount: number;
  currency: string;
  senderWalletId: string;
  recipientWalletId: string;
  status: string;
  description: string;
  completedAt: Date;
}

// ────────────────────────────────────────────────────────────
// Bank transfer (external via Zynta)
// ────────────────────────────────────────────────────────────

export interface BankTransferRequest {
  userId: string;
  walletId: string;
  amount: number;
  currency: CurrencyCode;
  recipientAccountNumber: string;
  recipientBankCode: string;
  recipientAccountName: string;
  recipientBankName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientCountry?: string;
  recipientCity?: string;
  recipientState?: string;
  recipientDob?: string;
  recipientIdType?: string;
  recipientIdNumber?: string;
  sourceAsset?: 'USDC' | 'USDT';
  sourceChain?: 'TRON' | 'ETHEREUM' | 'BASE' | 'BSC' | 'SOLANA';
  narration?: string;
  idempotencyKey: string;
}

export interface BankTransferResult {
  reference: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
  recipientAccountNumber: string;
  recipientBankCode: string;
  recipientAccountName: string;
  narration: string;
  fees: number;
  zyntaTransferId: string | null;
  destinationAmount: number;
  destinationCurrency: string;
  depositAddress: string | null;
  createdAt: Date;
}

// ────────────────────────────────────────────────────────────
// Bank account validation
// ────────────────────────────────────────────────────────────

export interface ValidateBankAccountRequest {
  bankCode: string;
  accountNumber: string;
  currency?: CurrencyCode;
}

export class TransferService {
  // ──────────────────────────────────────────────────────────
  // P2P Transfer — atomic internal ledger
  // ──────────────────────────────────────────────────────────
  static async sendP2P(req: P2PTransferRequest): Promise<P2PTransferResult> {
    if (!req.amount || req.amount <= 0) {
      throw createError.badRequest('Amount must be greater than zero', 'INVALID_AMOUNT');
    }

    // Idempotency: check if a matching debit transaction already exists
    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, req.idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      const tx = existing[0];
      log.info({ message: 'P2P idempotent replay', idempotencyKey: req.idempotencyKey });
      return {
        reference: tx.reference,
        debitTransactionId: tx.id,
        creditTransactionId: tx.relatedTransactionId ?? '',
        amount: WalletService.fromMinorUnits(tx.amount),
        currency: tx.currency,
        senderWalletId: tx.walletId,
        recipientWalletId: '',
        status: tx.status,
        description: tx.description ?? '',
        completedAt: tx.createdAt
      };
    }

    // Resolve recipient wallet
    const recipientWallet = await TransferService.resolveRecipientWallet(req);

    // Ensure same currency
    const senderWallet = await WalletService.getWallet(req.senderWalletId, req.senderUserId);

    if (senderWallet.currency !== req.currency) {
      throw createError.unprocessableEntity(
        `Sender wallet currency (${senderWallet.currency}) does not match transfer currency (${req.currency})`,
        'CURRENCY_MISMATCH'
      );
    }

    if (recipientWallet.currency !== req.currency) {
      throw createError.unprocessableEntity(
        `Recipient does not have a ${req.currency} wallet. Ask them to create one.`,
        'RECIPIENT_NO_WALLET'
      );
    }

    const amountMinor = WalletService.toMinorUnits(req.amount);
    const reference = `P2P-${crypto.randomUUID()}`;
    const description = req.description || `Transfer to ${recipientWallet.accountName || 'user'}`;

    // Debit sender
    const debitRef = `${reference}-DEBIT`;
    await WalletService.debitWallet(
      req.senderWalletId,
      amountMinor,
      description,
      TransactionType.P2P_SEND,
      debitRef,
      req.idempotencyKey
    );

    // Credit recipient
    const creditRef = `${reference}-CREDIT`;
    await WalletService.creditWallet(
      recipientWallet.id,
      amountMinor,
      description,
      TransactionType.P2P_RECEIVE,
      creditRef,
      debitRef
    );

    // Fetch created transaction IDs
    const [debitTx] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.reference, debitRef))
      .limit(1);

    const [creditTx] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.reference, creditRef))
      .limit(1);

    // Backfill relatedTransactionId on debit record
    if (creditTx?.id) {
      await db
        .update(transactions)
        .set({ relatedTransactionId: creditTx.id })
        .where(eq(transactions.reference, debitRef));
    }

    log.info({
      message: 'P2P transfer completed',
      senderWalletId: req.senderWalletId,
      recipientWalletId: recipientWallet.id,
      amount: req.amount,
      currency: req.currency,
      reference
    });

    await logAuditAction(req.senderUserId, 'p2p_transfer', debitTx?.id ?? reference, {
      reference,
      amount: req.amount,
      currency: req.currency,
      recipientWalletId: recipientWallet.id,
      idempotencyKey: req.idempotencyKey
    });

    return {
      reference,
      debitTransactionId: debitTx?.id ?? '',
      creditTransactionId: creditTx?.id ?? '',
      amount: req.amount,
      currency: req.currency,
      senderWalletId: req.senderWalletId,
      recipientWalletId: recipientWallet.id,
      status: TransactionStatus.COMPLETED,
      description,
      completedAt: new Date()
    };
  }

  // ──────────────────────────────────────────────────────────
  // Bank Transfer — off-ramp via Zynta Last-Mile
  //
  // Flow:
  //   1. Register recipient on Zynta (once, idempotent by clientReference)
  //   2. Get FX quote (rate + locked amount)
  //   3. Create off-ramp transfer (source: partner_pool draws from JetrPay DFNS pool)
  //   4. Debit user's internal wallet
  //   5. Webhook transfer.completed → finalise (handled in webhooks.ts)
  // ──────────────────────────────────────────────────────────
  static async sendBankTransfer(req: BankTransferRequest): Promise<BankTransferResult> {
    if (!req.amount || req.amount <= 0) {
      throw createError.badRequest('Amount must be greater than zero', 'INVALID_AMOUNT');
    }

    // Idempotency check
    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.idempotencyKey, req.idempotencyKey))
      .limit(1);

    if (existing.length > 0) {
      const tx = existing[0];
      log.info({ message: 'Bank transfer idempotent replay', idempotencyKey: req.idempotencyKey });
      const meta = tx.metadata as any;
      return {
        reference: tx.reference,
        transactionId: tx.id,
        amount: WalletService.fromMinorUnits(tx.amount),
        currency: tx.currency,
        status: tx.status,
        recipientAccountNumber: meta?.recipientAccountNumber ?? '',
        recipientBankCode: meta?.recipientBankCode ?? '',
        recipientAccountName: meta?.recipientAccountName ?? '',
        narration: tx.description ?? '',
        fees: 0,
        zyntaTransferId: meta?.zyntaTransferId ?? null,
        destinationAmount: meta?.destinationAmount ?? 0,
        destinationCurrency: meta?.destinationCurrency ?? '',
        depositAddress: meta?.depositAddress ?? null,
        createdAt: tx.createdAt,
      };
    }

    await WalletService.getWallet(req.walletId, req.userId);

    const zynta = getZyntaClient();
    const reference = `BT-${crypto.randomUUID()}`;
    const narration = req.narration || 'Bank transfer';

    // ── Step 1: Register recipient on Zynta (idempotent) ─────────────────────
    let zyntaRecipientId: string;
    try {
      const recipientRef = `jetrpay-${req.userId}-${req.recipientAccountNumber}`;
      const recipient = await zynta.createRecipient(
        {
          clientReference: recipientRef,
          firstName:       req.recipientAccountName.split(' ')[0] ?? req.recipientAccountName,
          lastName:        req.recipientAccountName.split(' ').slice(1).join(' ') || req.recipientAccountName,
          email:           req.recipientEmail || `${req.recipientAccountNumber}@jetrpay.placeholder`,
          phoneNumber:     req.recipientPhone || '+2340000000000',
          dateOfBirth:     req.recipientDob || '1990-01-01',
          country:         req.recipientCountry || 'NG',
          idType:          req.recipientIdType || 'BVN',
          idNumber:        req.recipientIdNumber || req.recipientAccountNumber,
          address: {
            street: '1 Main St',
            city: req.recipientCity || 'Lagos',
            state: req.recipientState || 'Lagos',
            postalCode: '100001',
            country: req.recipientCountry || 'NG',
          },
          bankAccount: {
            accountName:   req.recipientAccountName,
            accountNumber: req.recipientAccountNumber,
            bankName:      req.recipientBankName || 'Bank',
            bankCode:      req.recipientBankCode,
            currency:      req.currency,
            country:       req.recipientCountry || 'NG',
          },
        },
        `recip-${recipientRef}`,
      );
      zyntaRecipientId = recipient.recipientId;
    } catch (err: any) {
      log.error({ message: 'Zynta recipient registration failed', error: err.message });
      throw createError.serviceUnavailable('Could not register recipient. Please try again.', 'RECIPIENT_ERROR');
    }

    // ── Step 2: Get FX quote ──────────────────────────────────────────────────
    let quote: Awaited<ReturnType<typeof zynta.createQuote>>;
    try {
      quote = await zynta.createQuote(
        {
          recipientId:         zyntaRecipientId,
          direction:           'OFF_RAMP',
          sourceAsset:         (req.sourceAsset ?? 'USDC') as any,
          sourceChain:         (req.sourceChain ?? 'TRON') as any,
          notionalAmount:      req.amount,
          destinationCurrency: req.currency as any,
          destinationCountry:  req.recipientCountry || 'NG',
          deliveryRail:        'BANK_TRANSFER',
        },
        `quote-${reference}`,
      );
    } catch (err: any) {
      log.error({ message: 'Zynta quote failed', error: err.message });
      throw createError.serviceUnavailable('Could not get exchange rate. Please try again.', 'QUOTE_ERROR');
    }

    // ── Step 3: Debit user's internal wallet ──────────────────────────────────
    const amountMinor = WalletService.toMinorUnits(req.amount);
    await WalletService.debitWallet(
      req.walletId,
      amountMinor,
      narration,
      TransactionType.BANK_TRANSFER_SEND,
      reference,
      req.idempotencyKey,
    );

    // ── Step 4: Create Zynta off-ramp transfer ────────────────────────────────
    let zyntaTransferId: string | null = null;
    let depositAddress: string | null = null;
    let finalStatus = TransactionStatus.PENDING;

    try {
      const transfer = await zynta.createOffRamp(
        {
          quoteId:         quote.quoteId,
          recipientId:     zyntaRecipientId,
          clientReference: reference,
          source:          'partner_pool', // draw from JetrPay's DFNS pool wallet
        },
        `offramp-${reference}`,
      );

      zyntaTransferId  = transfer.transferId;
      depositAddress   = transfer.fundingInstructions?.depositAddress ?? null;
      finalStatus      = TransactionStatus.PENDING; // completes via webhook
    } catch (err: any) {
      log.error({ message: 'Zynta off-ramp failed', error: err.message, reference });
      // Refund the debit — transfer never reached Zynta
      await WalletService.creditWallet(
        req.walletId,
        amountMinor,
        `Refund: off-ramp failed (${reference})`,
        TransactionType.REVERSAL,
        `REFUND-${reference}`,
        reference,
      );
      throw createError.serviceUnavailable('Bank transfer could not be initiated. Your balance has been refunded.', 'OFFRAMP_ERROR');
    }

    // ── Step 5: Persist metadata ──────────────────────────────────────────────
    const [txRow] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, reference))
      .limit(1);

    await db.update(transactions).set({
      status: finalStatus,
      metadata: {
        recipientAccountNumber: req.recipientAccountNumber,
        recipientBankCode:      req.recipientBankCode,
        recipientAccountName:   req.recipientAccountName,
        zyntaTransferId,
        zyntaRecipientId,
        zyntaQuoteId:           quote.quoteId,
        depositAddress,
        destinationAmount:      quote.destinationAmount,
        destinationCurrency:    quote.destinationCurrency,
        exchangeRate:           quote.rate,
      },
      updatedAt: new Date(),
    }).where(eq(transactions.reference, reference));

    log.info({
      message: 'Bank transfer initiated via Zynta',
      walletId: req.walletId,
      amount: req.amount,
      reference,
      zyntaTransferId,
      destinationAmount: quote.destinationAmount,
      destinationCurrency: quote.destinationCurrency,
    });

    await logAuditAction(req.userId, 'bank_transfer_initiated', txRow?.id ?? reference, {
      reference,
      amount: req.amount,
      currency: req.currency,
      recipientAccountNumber: req.recipientAccountNumber,
      recipientBankCode: req.recipientBankCode,
      zyntaTransferId,
      idempotencyKey: req.idempotencyKey
    });

    return {
      reference,
      transactionId:          txRow?.id ?? '',
      amount:                 req.amount,
      currency:               req.currency,
      status:                 finalStatus,
      recipientAccountNumber: req.recipientAccountNumber,
      recipientBankCode:      req.recipientBankCode,
      recipientAccountName:   req.recipientAccountName,
      narration,
      fees:                   0,        // fees embedded in rate (Yellow Card model)
      zyntaTransferId,
      destinationAmount:      quote.destinationAmount,
      destinationCurrency:    quote.destinationCurrency,
      depositAddress,
      createdAt: new Date(),
    };
  }

  // ──────────────────────────────────────────────────────────
  // Validate bank account
  // ──────────────────────────────────────────────────────────
  static async validateBankAccount(req: ValidateBankAccountRequest) {
    // Zynta doesn't have a standalone bank account validation endpoint.
    // Validation happens implicitly during recipient KYC.
    // For now, return a basic format check.
    const accountNumber = req.accountNumber.trim();
    if (!accountNumber || accountNumber.length < 10) {
      return { accountName: null, accountNumber, isValid: false };
    }
    return { accountName: null, accountNumber, isValid: true };
  }

  // ──────────────────────────────────────────────────────────
  // Private: resolve recipient wallet from email/phone/userId
  // ──────────────────────────────────────────────────────────
  private static async resolveRecipientWallet(
    req: P2PTransferRequest
  ): Promise<{ id: string; currency: string; accountName: string | null }> {
    let recipientUserId = req.recipientUserId;

    if (!recipientUserId) {
      // Resolve by email or phone
      const conditions = [];
      if (req.recipientEmail) conditions.push(eq(users.email, req.recipientEmail));
      else if (req.recipientPhone) conditions.push(eq(users.phone, req.recipientPhone));
      else throw createError.badRequest('Provide recipientEmail, recipientPhone, or recipientUserId', 'MISSING_RECIPIENT');

      const userRows = await db.select({ id: users.id }).from(users).where(conditions[0]).limit(1);
      if (userRows.length === 0) throw createError.notFound('Recipient not found', 'RECIPIENT_NOT_FOUND');
      recipientUserId = userRows[0].id;
    }

    if (recipientUserId === req.senderUserId) {
      throw createError.badRequest('Cannot transfer to your own wallet', 'SELF_TRANSFER');
    }

    const walletRows = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.userId, recipientUserId), eq(wallets.currency, req.currency)))
      .limit(1);

    if (walletRows.length === 0) {
      throw createError.unprocessableEntity(
        `Recipient does not have a ${req.currency} wallet`,
        'RECIPIENT_NO_WALLET'
      );
    }

    return {
      id: walletRows[0].id,
      currency: walletRows[0].currency,
      accountName: walletRows[0].accountName
    };
  }

  // ──────────────────────────────────────────────────────────
  // Fee schedule (bigint arithmetic)
  // ──────────────────────────────────────────────────────────
  private static calculateBankTransferFee(amountMinor: number): number {
    // 1% fee, min 50 units (₦0.50), max 5000 units (₦50.00)
    const fee = Math.floor(amountMinor / 100);
    if (fee < 50) return 50;
    if (fee > 5000) return 5000;
    return fee;
  }
}
