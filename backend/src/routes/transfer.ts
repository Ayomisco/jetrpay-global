import { Router } from 'express';
import { rateLimit } from '@/middleware/auth';
import { p2pTransfer, bankTransfer, validateBankAccount } from '@/controllers/transfer';

const router: Router = Router();

// All transfer routes require authentication (applied in index.ts)

// POST /api/v1/transfers/p2p           — wallet-to-wallet (instant)
router.post('/p2p', rateLimit(10, 60 * 1000), p2pTransfer);

// POST /api/v1/transfers/bank          — bank payout via Zynta
router.post('/bank', rateLimit(5, 60 * 1000), bankTransfer);

// POST /api/v1/transfers/validate-bank — resolve account name before transfer
// POST /api/v1/transfers/validate-account — resolve account name before transfer
router.post('/validate-account', rateLimit(20, 60 * 1000), validateBankAccount);

export default router;
