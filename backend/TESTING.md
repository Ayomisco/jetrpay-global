# JetRPay Backend Testing

This project uses Jest and Supertest for backend API tests.

## Test Suites

- tests/auth.test.ts
- tests/wallet.test.ts
- tests/transfer.test.ts

## Run Tests

Run all suites:
- pnpm test

Run a single suite:
- NODE_OPTIONS=--experimental-vm-modules ./node_modules/.bin/jest --forceExit --testPathPattern="wallet.test"

Watch mode:
- pnpm test:watch

Coverage:
- pnpm test:cov

## Test Environment Notes

- tests/setup.ts loads .env and sets NODE_ENV=test.
- Rate limiting is bypassed in test mode.
- OTP store is in-memory and exposed for test flows.

## Common Failure Causes

- DATABASE_URL missing or invalid
- ZYNTA_API_KEY missing for transfer flows that hit provider integration
- Environment mismatch between shell and tests

## Quick Debug Command

- NODE_OPTIONS=--experimental-vm-modules ./node_modules/.bin/jest --forceExit --runInBand --testPathPattern="transfer.test"
