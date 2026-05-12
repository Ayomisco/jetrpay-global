import { Router } from 'express';
import { rateLimit } from '@/middleware/auth';
import { validateUUID } from '@/middleware/validate';
import {
  listWallets,
  getWallet,
  getWalletBalance,
  createWallet,
  listWalletTransactions,
  getTransaction,
  freezeWallet,
  unfreezeWallet
} from '@/controllers/wallet';

const router: Router = Router();

// All wallet routes require authentication (applied in index.ts)

// GET  /api/v1/wallets             — list my wallets
router.get('/', listWallets);

// POST /api/v1/wallets             — create a wallet for a currency
router.post('/', rateLimit(15, 5 * 60 * 1000), createWallet);

// GET  /api/v1/wallets/:id         — wallet details
router.get('/:id', validateUUID('id'), getWallet);

// GET  /api/v1/wallets/:id/balance — balance snapshot
router.get('/:id/balance', validateUUID('id'), getWalletBalance);

// GET  /api/v1/wallets/:id/transactions — transaction history (paginated)
router.get('/:id/transactions', validateUUID('id'), listWalletTransactions);

// GET  /api/v1/wallets/:id/transactions/:txId — single transaction
router.get('/:id/transactions/:txId', validateUUID('id', 'txId'), getTransaction);

// PATCH /api/v1/wallets/:id/freeze   — freeze wallet
router.patch('/:id/freeze', validateUUID('id'), freezeWallet);

// PATCH /api/v1/wallets/:id/unfreeze — unfreeze wallet
router.patch('/:id/unfreeze', validateUUID('id'), unfreezeWallet);

export default router;
