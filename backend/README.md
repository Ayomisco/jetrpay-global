# JetRPay Backend

JetRPay backend is a TypeScript and Express API for authentication, wallets, transfers, and settlement webhooks.

## Current Scope

Implemented now:
- Auth: signup, verify OTP, login, refresh, resend OTP, me, logout
- Wallets: create, list, detail, balance, transactions, freeze, unfreeze
- Transfers: p2p, bank transfer, bank account validation
- Webhooks: Zynta settlement and incoming transfer events
- Swagger docs: /api/docs and /api/docs.json

Not yet in this backend scope:
- Cards
- KYC endpoints
- Custody balance endpoint

## Tech Stack

- Node.js 18+
- Express 4
- TypeScript
- Drizzle ORM
- PostgreSQL
- Jest + Supertest

## Quick Start

1. Install dependencies
   pnpm install

2. Create env file
   cp .env.example .env

3. Push schema
   pnpm db:push

4. Start server
   pnpm dev

Base URL: http://localhost:3000

## API Endpoints

Health:
- GET /health

Auth:
- POST /api/v1/auth/signup
- POST /api/v1/auth/verify-otp
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/resend-otp
- GET /api/v1/auth/me
- POST /api/v1/auth/logout

Wallets:
- GET /api/v1/wallets
- POST /api/v1/wallets
- GET /api/v1/wallets/:id
- GET /api/v1/wallets/:id/balance
- GET /api/v1/wallets/:id/transactions
- GET /api/v1/wallets/:id/transactions/:txId
- PATCH /api/v1/wallets/:id/freeze
- PATCH /api/v1/wallets/:id/unfreeze

Transfers:
- POST /api/v1/transfers/p2p
- POST /api/v1/transfers/bank
- POST /api/v1/transfers/validate-account

Webhooks:
- POST /webhooks/zynta

## Environment Variables

Required for runtime:
- NODE_ENV
- PORT
- API_URL
- FRONTEND_URL
- LOG_LEVEL
- DATABASE_URL
- DATABASE_POOL_SIZE
- JWT_SECRET
- JWT_EXPIRE
- JWT_REFRESH_EXPIRE
- BCRYPT_ROUNDS
- ENCRYPTION_KEY
- PLUNK_API_KEY
- EMAIL_FROM
- EMAIL_REPLY_TO
- ZYNTA_API_KEY
- ZYNTA_API_URL
- ZYNTA_MODE
- ZYNTA_WEBHOOK_SECRET

Optional in current implementation:
- REDIS_URL
- EMAIL_SERVICE

## Response Envelope

Most successful responses are returned as:
- success
- data
- message
- timestamp

## Commands

- pnpm dev
- pnpm build
- pnpm start
- pnpm db:push
- pnpm db:generate
- pnpm db:migrate
- pnpm test
- pnpm test:watch
- pnpm test:cov
- pnpm type-check

## Testing

See TESTING.md for test commands and debugging notes.

## Production Readiness Checklist

- Set NODE_ENV=production
- Use a strong JWT_SECRET
- Use production database credentials
- Set ZYNTA_MODE=production with live ZYNTA_API_KEY
- Set ZYNTA_WEBHOOK_SECRET and verify webhook delivery signatures
- Set PLUNK_API_KEY and sender addresses
- Set ENCRYPTION_KEY correctly as 64 hex chars
- Restrict FRONTEND_URL to trusted production domains
- Replace in-memory rate limiting and OTP storage with Redis-backed implementations
