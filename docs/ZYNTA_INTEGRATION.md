# JetrPay ↔ Zynta Last-Mile Integration Guide

---

## Overview

JetrPay uses **Zynta Last-Mile API** as its payment rails for crypto-to-fiat conversions and bank payouts across Africa.

| What Zynta provides | JetrPay use case |
|---------------------|-----------------|
| Off-ramp (USDC/USDT → NGN/KES/GHS) | User sends money to a recipient's bank account |
| On-ramp (NGN/KES/GHS → USDC/USDT) | User receives crypto from fiat payment |
| Recipient KYC (SmileID) | Verify recipient identity before payout |
| FX quotes with embedded fees | Show user exchange rate before they confirm |
| DFNS partner pool wallet | JetrPay pre-funds USDC for instant payouts |
| Webhooks | Real-time transfer status updates |

**JetrPay's role in Zynta's model:** JetrPay is a **Partner**. It authenticates with an API key (`sk_test_...` / `sk_live_...`) and manages its own recipients, quotes, and transfers via the partner execution API.

---

## Authentication

```
Header: x-api-key: sk_test_...    ← sandbox
Header: x-api-key: sk_live_...    ← production
```

**NOT** `Authorization: Bearer`. Zynta uses `x-api-key`.

```typescript
// Correct
headers: { 'x-api-key': process.env.ZYNTA_API_KEY }

// Wrong (old code)
headers: { 'Authorization': `Bearer ${apiKey}` }
```

---

## Environments

| Environment | Base URL | Key prefix |
|-------------|----------|------------|
| Sandbox | `https://zynta-lastmile-infrastructure-api-staging.up.railway.app/api/v1` | `sk_test_` |
| Production | `https://api.zynta.io/api/v1` | `sk_live_` |

---

## Core Flow: Bank Payout (Off-Ramp)

When a JetrPay user sends money to a recipient's bank account:

```
Step 1 — Register recipient (once per person, idempotent)
POST /api/v1/recipients/individual
{
  clientReference: "jetrpay-user123-0123456789",  ← stable ID for this person
  firstName, lastName, email, phoneNumber, dateOfBirth,
  country: "NG",
  idType: "BVN", idNumber: "...",
  address: { street, city, state, postalCode, country },
  bankAccount: {
    accountName, accountNumber, bankCode, bankName,
    currency: "NGN", country: "NG"
  }
}

Response:
{ recipientId: "uuid", kycStatus: "APPROVED", walletAddress: "..." }
```

```
Step 2 — Get FX quote (rate locked for 15 minutes)
POST /api/v1/quotes
{
  recipientId: "uuid",
  direction: "OFF_RAMP",
  sourceAsset: "USDC",
  sourceChain: "TRON",
  notionalAmount: 100,            ← amount of USDC to send
  destinationCurrency: "NGN",
  destinationCountry: "NG",
  deliveryRail: "BANK_TRANSFER"
}

Response:
{
  quoteId: "uuid",
  sourceAmount: 100,
  destinationAmount: 159224,      ← NGN recipient gets (fees ALREADY deducted)
  rate: 1592.24,                  ← effective rate with fees embedded
  expiresAt: "2026-05-05T12:00:00Z"
}

NOTE: There is NO separate fees field. Fees are embedded in the rate.
Show `destinationAmount` exactly as returned — that's what recipient gets.
```

```
Step 3 — Create off-ramp transfer
POST /api/v1/off-ramp
{
  quoteId: "uuid",
  recipientId: "uuid",
  clientReference: "BT-jetrpay-ref",  ← your reference (used in webhooks)
  source: "partner_pool"               ← use JetrPay's pre-funded DFNS pool
}

Response:
{
  transferId: "uuid",
  status: "SWEEPING",           ← partner_pool: immediate sweep, no deposit needed
  message: "Sweep initiated from partner pool wallet...",
  destinationAmount: 159224,
  destinationCurrency: "NGN"
}

With source: "external" (user sends their own USDC):
{
  transferId: "uuid",
  status: "AWAITING_DEPOSIT",
  fundingInstructions: {
    depositAddress: "T...",     ← user sends USDC here
    network: "TRON",
    asset: "USDC",
    amount: 100,
    expiresAt: "..."
  }
}
```

```
Step 4 — Wait for webhook
POST /webhooks/zynta
{
  eventType: "transfer.completed",
  payload: {
    transferId: "uuid",
    clientReference: "BT-jetrpay-ref",  ← match to your transaction
    partnerId: "...",
    status: "COMPLETED",
    environment: "live"
  }
}

→ JetrPay marks transaction as COMPLETED
```

---

## Source Options for Off-Ramp

| source | What it means | When to use |
|--------|--------------|-------------|
| `partner_pool` | Draw from JetrPay's pre-funded DFNS pool wallet | Default — fastest, no user action needed |
| `external` | User sends USDC themselves to a deposit address | When user holds their own crypto |
| `custody` | Draw from recipient's Zynta custody balance | When recipient has been accumulating custody balance |
| `fiat` | Pay from JetrPay's NGN fiat balance on Zynta | Direct fiat payout, no crypto movement |

---

## Fee Model (Yellow Card / Embedded)

Zynta embeds all fees (provider fee + Zynta fee) into the exchange rate. There is **no separate fee field**.

```
What Ledig offers:   1 USDC = 1600 NGN
JetrPay pays Zynta:  fees embedded
User sees:           1 USDC = 1592.24 NGN  ← destinationAmount / sourceAmount

Show the user: destinationAmount
Do NOT try to add/subtract fees manually.
```

Default fee schedule (BPS = basis points, 1 BPS = 0.01%):

| Corridor | Provider | Zynta | Total |
|----------|---------|-------|-------|
| USDT → NGN | 0.51% | 0.50% | 1.01% |
| USDC → NGN | 0.71% | 0.50% | 1.21% |
| USDT → KES | 1.09% | 0.50% | 1.59% |
| USDC → KES | 1.29% | 0.50% | 1.79% |
| USDT → GHS | 1.53% | 0.50% | 2.03% |
| USDC → GHS | 1.70% | 0.50% | 2.20% |

---

## Webhook Events

Register your webhook endpoint in **Zynta Dashboard → Webhook Subscriptions**.

| Event | When it fires | JetrPay action |
|-------|--------------|----------------|
| `transfer.created` | Transfer initiated | Log, update status to PENDING |
| `transfer.completed` | Fiat paid to recipient bank | Mark COMPLETED |
| `transfer.failed` | Transfer could not be processed | Mark FAILED, refund user |
| `transfer.expired` | Deposit window timed out | Mark FAILED, refund user |
| `balance.topup_received` | Zynta fiat balance topped up | Update internal balance |
| `balance.low` | Pool balance below threshold | Alert ops to replenish |

### Webhook payload shape

```json
{
  "eventType": "transfer.completed",
  "payload": {
    "transferId": "uuid",
    "clientReference": "BT-jetrpay-ref",
    "partnerId": "jetrpay-partner-id",
    "direction": "OFF_RAMP",
    "status": "COMPLETED",
    "environment": "live"
  }
}
```

### Signature verification

```typescript
const rawBody = req.body.toString('utf8');
const signature = req.headers['x-zynta-signature'] as string;
const isValid = zyntaClient.verifyWebhookSignature(rawBody, signature);
if (!isValid) return res.status(401).json({ error: 'Invalid signature' });
```

---

## Supported Chains & Assets

| Chain | Supported assets |
|-------|-----------------|
| TRON | USDC, USDT |
| Ethereum | USDC, USDT |
| BASE | USDC, USDT |
| BSC | USDC, USDT |
| SOLANA | USDC, USDT |

**Recommended default:** TRON + USDT (cheapest gas, most liquid in Africa)

---

## JetrPay's DFNS Pool Wallet

For `source: "partner_pool"` to work, JetrPay must:

1. Have its KYC/KYB approved on Zynta
2. Have DFNS pool wallets provisioned (automatic on approval)
3. Pre-fund the pool with USDC/USDT

**How to fund:**
- Find the wallet address in Zynta Dashboard → Wallets
- Send USDC/USDT from exchange or external wallet to that address
- JetrPay's `LM_PartnerCryptoBalance` updates automatically via webhook

**Minimum float recommended:** enough USDC to cover 1-2 hours of peak volume

---

## Recipient KYC

Recipients must pass KYC before a transfer can be executed.

| Status | Meaning |
|--------|---------|
| `PENDING` | KYC submitted, Zynta/SmileID processing |
| `IN_PROGRESS` | Verification in progress |
| `APPROVED` | Ready for transfers |
| `REJECTED` | Cannot receive transfers — user must contact support |

Quotes and transfers will fail with `422` if recipient's `kycStatus !== APPROVED`.

**Tip:** Register recipients and pre-warm their KYC before the user confirms a transfer, so there's no delay at checkout.

---

## Error Codes

| HTTP | Zynta code | Meaning |
|------|-----------|---------|
| 400 | `validation_error` | Invalid request fields |
| 401 | `unauthorized` | Bad or missing API key |
| 403 | `forbidden` | KYC not approved / scope missing |
| 404 | `not_found` | Quote/transfer not found |
| 409 | `conflict` | Duplicate idempotency key |
| 422 | `unprocessable` | Business rule violation (e.g. recipient not approved) |
| 429 | `rate_limit_exceeded` | Too many requests |
| 500 | `internal_error` | Zynta server error — retry |

---

## Idempotency

All mutating requests must include `Idempotency-Key` header. Use a stable UUID per operation.

```typescript
headers: {
  'x-api-key': apiKey,
  'Idempotency-Key': 'BT-jetrpay-ref-unique-uuid'
}
```

Zynta returns the same response for duplicate keys within 60 minutes.

---

## Testing in Sandbox

```bash
# Use sk_test_ key — no real money, no real KYC
ZYNTA_API_KEY=sk_test_your_key

# Simulate a top-up to your sandbox fiat balance
POST /api/v1/sandbox/simulate/topup
{ "currency": "NGN", "amount": 1000000 }

# All other endpoints work identically to production
```
