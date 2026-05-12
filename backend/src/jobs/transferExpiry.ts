import Bull from 'bull';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { TransactionType, TransactionStatus } from '@/types';
import { WalletService } from '@/services/wallet';
import { createModuleLogger } from '@/utils/logger';

const log = createModuleLogger('TransferExpiryJob');

const EXPIRY_HOURS = 72;
const EXPIRY_MS = EXPIRY_HOURS * 60 * 60 * 1000;

export const transferExpiryQueue = new Bull('transfer-expiry', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379'
});

transferExpiryQueue.process(async () => {
  const cutoff = new Date(Date.now() - EXPIRY_MS);

  const expiredTxs = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.status, TransactionStatus.PENDING),
        lt(transactions.createdAt, cutoff)
      )
    );

  let expired = 0;

  for (const tx of expiredTxs) {
    try {
      await db
        .update(transactions)
        .set({ status: TransactionStatus.FAILED, updatedAt: new Date() })
        .where(eq(transactions.id, tx.id));

      if (tx.walletId && tx.amount > 0) {
        await WalletService.creditWallet(
          tx.walletId,
          tx.amount,
          `Auto-refund: transfer expired after ${EXPIRY_HOURS}h (${tx.reference})`,
          TransactionType.REVERSAL,
          `EXPIRE-${tx.reference}`
        );
      }

      expired++;
      log.info({ message: 'Transfer expired and refunded', txId: tx.id, reference: tx.reference });
    } catch (err) {
      log.error({ message: 'Failed to expire transaction', txId: tx.id, error: err });
    }
  }

  log.info({ message: 'Transfer expiry job complete', expired, checked: expiredTxs.length });
});

export function startTransferExpiryJob(): void {
  transferExpiryQueue.add({}, { repeat: { cron: '0 * * * *' }, removeOnComplete: 10 });
  log.info('Transfer expiry job scheduled (hourly)');
}
