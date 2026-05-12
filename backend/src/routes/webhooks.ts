import { Router, Request, Response, NextFunction } from 'express';
import { db } from '@/db';
import { transactions, wallets } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getZyntaClient } from '@/services/zynta/client';
import { createModuleLogger } from '@/utils/logger';
import { TransactionStatus, TransactionType } from '@/types';
import { WalletService } from '@/services/wallet';

const log = createModuleLogger('ZyntaWebhook');
const router: Router = Router();

// ── Raw body capture (needed for HMAC verification) ───────────
// This router is mounted BEFORE express.json() in index.ts,
// so req.body is a Buffer. We parse manually below.

async function handleZyntaWebhook(req: Request, res: Response, next: NextFunction) {
  const signature = req.headers['x-zynta-signature'] as string;

  // Collect raw body (may already be string or Buffer depending on mount)
  const rawBody: string =
    req.body instanceof Buffer
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body);

  // Verify HMAC signature
  try {
    const zynta = getZyntaClient();
    const valid = zynta.verifyWebhookSignature(rawBody, signature ?? '');
    if (!valid) {
      log.warn({ message: 'Invalid webhook signature' });
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    log.error({ message: 'Signature check error', error: (err as Error).message });
    return res.status(401).json({ error: 'Signature check failed' });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  log.info({ message: 'Webhook received', eventType: event?.eventType, transferId: event?.payload?.transferId });

  // Acknowledge immediately — process async
  res.status(200).json({ received: true });

  dispatchEvent(event).catch((err) =>
    log.error({ message: 'Webhook dispatch error', error: err.message })
  );
}

// ── Event dispatcher ─────────────────────────────────────────
// Zynta webhook events: https://docs.zynta.io/webhooks
//   transfer.created    — off-ramp/on-ramp initiated
//   transfer.completed  — payout settled to recipient bank
//   transfer.failed     — transfer failed (refund user)
//   transfer.expired    — transfer timed out (refund user)
//   balance.topup_received — JetrPay's Zynta fiat balance was topped up
//   balance.low         — JetrPay fiat balance below threshold

async function dispatchEvent(event: any) {
  const { eventType, payload } = event;

  switch (eventType) {
    case 'transfer.completed':
      await onTransferCompleted(payload);
      break;
    case 'transfer.failed':
      await onTransferFailed(payload);
      break;
    case 'transfer.expired':
      await onTransferFailed(payload); // same refund logic
      break;
    case 'transfer.created':
      log.info({ message: 'transfer.created received', transferId: payload?.transferId });
      break;
    case 'balance.topup_received':
      log.info({ message: 'JetrPay Zynta balance topped up', amount: payload?.amount, currency: payload?.currency });
      break;
    case 'balance.low':
      log.warn({ message: 'JetrPay Zynta balance low — replenish DFNS pool', currency: payload?.currency });
      break;
    default:
      log.info({ message: 'Unhandled Zynta event', eventType });
  }
}

// ── Event handlers ────────────────────────────────────────────

/**
 * Transfer completed — mark JetrPay transaction as completed.
 * Zynta payload: { transferId, clientReference, partnerId, status, environment }
 */
async function onTransferCompleted(payload: any) {
  const clientReference = payload?.clientReference;
  if (!clientReference) {
    log.warn({ message: 'transfer.completed missing clientReference', payload });
    return;
  }

  await db
    .update(transactions)
    .set({ status: TransactionStatus.COMPLETED, updatedAt: new Date() })
    .where(eq(transactions.reference, clientReference));

  log.info({ message: 'Transfer completed', clientReference, transferId: payload?.transferId });
}

/**
 * Transfer failed or expired — mark failed and refund the user's wallet.
 * Zynta payload: { transferId, clientReference, failureReason, partnerId, environment }
 */
async function onTransferFailed(payload: any) {
  const clientReference = payload?.clientReference;
  if (!clientReference) {
    log.warn({ message: 'transfer.failed missing clientReference', payload });
    return;
  }

  const [tx] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.reference, clientReference))
    .limit(1);

  if (!tx) {
    log.warn({ message: 'transfer.failed: transaction not found', clientReference });
    return;
  }

  if (tx.status === TransactionStatus.FAILED || tx.status === TransactionStatus.COMPLETED) {
    log.info({ message: 'Already in terminal state, skipping', clientReference, status: tx.status });
    return;
  }

  await db
    .update(transactions)
    .set({
      status: TransactionStatus.FAILED,
      metadata: { ...(tx.metadata as any), failureReason: payload?.failureReason ?? 'Transfer failed' },
      updatedAt: new Date(),
    })
    .where(eq(transactions.reference, clientReference));

  // Refund the debited amount back to wallet
  await WalletService.creditWallet(
    tx.walletId,
    Number(tx.amount),
    `Refund: transfer failed (${clientReference})`,
    TransactionType.REVERSAL,
    `REFUND-${clientReference}`,
    tx.id,
  );

  log.info({ message: 'Transfer failed — funds refunded', clientReference, walletId: tx.walletId });
}

// ── Route ─────────────────────────────────────────────────────

router.post('/zynta', handleZyntaWebhook);

export default router;
