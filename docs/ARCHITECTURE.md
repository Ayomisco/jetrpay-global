# JetrPay Architecture & System Design

---

## System Overview

JetrPay is a consumer fintech app (remittance + wallet) built on top of **Zynta Last-Mile** — the B2B payment infrastructure layer that handles crypto-to-fiat conversions, KYC, and bank payouts across Africa.

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERFACES                              │
│   React Native (iOS/Android)  │  Next.js Web  │  Admin UI       │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS/REST
┌─────────────────────▼───────────────────────────────────────────┐
│                  JETRPAY BACKEND  (Node.js / TypeScript)         │
│                                                                  │
│   Auth     Wallet    Transfer    KYC     Notifications           │
│   Service  Service   Service     Service Service                 │
│                                                                  │
│   PostgreSQL (Drizzle ORM)  │  JWT Auth  │  Pino Logger          │
└─────────────────────┬───────────────────────────────────────────┘
                      │ x-api-key: sk_test_... / sk_live_...
┌─────────────────────▼───────────────────────────────────────────┐
│              ZYNTA LAST-MILE API  (Payment Infrastructure)       │
│                                                                  │
│  Recipients  │  Quotes  │  Off-Ramp  │  On-Ramp  │  Webhooks     │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               ZYNTA PROVIDERS (abstracted)               │   │
│  │  Ledig (FX + bank payouts)  │  DFNS (crypto custody)     │   │
│  │  SmileID (KYC/KYB)          │  Mock (sandbox)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## What JetrPay Owns vs What Zynta Owns

| Concern | JetrPay | Zynta |
|---------|---------|-------|
| User authentication | ✅ JWT, bcrypt, OTP | — |
| Internal wallet ledger | ✅ PostgreSQL | — |
| P2P transfers (user→user) | ✅ Internal debit/credit | — |
| Recipient KYC | — | ✅ SmileID Job Type 5 |
| FX rates & quotes | — | ✅ Ledig rates |
| Bank payout to NGN/KES/GHS | — | ✅ Ledig fiat rails |
| Crypto custody (USDC/USDT) | — | ✅ DFNS MPC wallets |
| Pool wallet (pre-funded USDC) | registers with Zynta | ✅ DFNS per partner |
| Webhook delivery | receives events | ✅ dispatches events |

---

## JetrPay Database Schema

```
users                    — accounts (email, phone, hashed password, KYC tier)
user_profiles            — display name, avatar, preferences
wallets                  — per-user, per-currency balance store (NGN/USD/USDC)
cards                    — virtual/physical debit cards (future)
transactions             — every debit/credit with status + metadata
kyc_submissions          — identity doc uploads + Zynta recipient ID mapping
compliance_flags         — sanctions / PEP hits
devices                  — trusted device registry
contacts                 — saved payees (cached Zynta recipient IDs)
audit_logs               — immutable operation trail
merchants                — merchant accounts (future)
payment_links            — shareable payment links (future)
```

Key relation:
```
users → wallets → transactions
users → contacts → zynta_recipient_id (cached from Zynta API)
transactions.metadata → { zyntaTransferId, zyntaQuoteId, zyntaRecipientId }
```

---

## Bank Transfer Flow (Off-Ramp via Zynta)

```
JetrPay User
    │
    │ POST /transfers/bank
    │ { recipientAccountNumber, bankCode, amount: 100 USDC }
    ▼
JetrPay Backend
    │
    ├── 1. Look up or create Zynta recipient
    │      POST /api/v1/recipients/individual
    │      → recipientId (cached in contacts table)
    │
    ├── 2. Get FX quote
    │      POST /api/v1/quotes
    │      { recipientId, sourceAsset: USDC, sourceChain: TRON,
    │        notionalAmount: 100, destinationCurrency: NGN }
    │      → { quoteId, destinationAmount: 159224, rate: 1592.24 }
    │      ← Show user: "Recipient gets ₦159,224"
    │
    ├── 3. User confirms → debit JetrPay internal wallet
    │
    ├── 4. Create Zynta off-ramp
    │      POST /api/v1/off-ramp
    │      { quoteId, recipientId, source: "partner_pool",
    │        clientReference: "BT-uuid" }
    │      → { transferId, status: "SWEEPING" }
    │
    └── 5. Wait for webhook
           POST /webhooks/zynta
           { eventType: "transfer.completed",
             payload: { clientReference: "BT-uuid" } }
           → JetrPay marks transaction COMPLETED


                          ZYNTA (behind the scenes)
    ┌──────────────────────────────────────────────────────┐
    │  JetrPay DFNS pool wallet  ──USDC──▶  Ledig          │
    │                                          │            │
    │                                     converts          │
    │                                          │            │
    │                                     ₦159,224          │
    │                                          │            │
    │                                     recipient's bank  │
    └──────────────────────────────────────────────────────┘
```

---

## P2P Transfer Flow (Internal — No Zynta)

```
Sender (JetrPay user)
    │ POST /transfers/p2p
    │ { recipientEmail, amount: 50, currency: "USDC" }
    ▼
JetrPay Backend
    ├── Resolve recipient's wallet (same DB)
    ├── Atomic ledger: debit sender, credit recipient
    └── status: COMPLETED immediately

No Zynta call. No blockchain. Pure internal ledger.
```

---

## Wallet Architecture

```
JetrPay User Wallet (internal, JetrPay DB)
├── currency: "NGN"    — fiat display balance
├── currency: "USDC"   — stablecoin balance
└── currency: "USDT"   — stablecoin balance

JetrPay Partner Pool (DFNS, managed by Zynta)
├── TRON USDC wallet   — LEDIG_WALLET_ADDRESS_TRON registered here
├── ETH USDC wallet
├── BASE USDC wallet
└── BSC USDC wallet
    ↑ funded by JetrPay periodically
    ↑ drained by off-ramp transfers
    ↑ refilled when on-ramp conversions complete
```

---

## Security Model

| Layer | Implementation |
|-------|---------------|
| Passwords | bcrypt (12 rounds) |
| JWT | HS256, 15-min access + 7-day refresh |
| API keys (Zynta) | `x-api-key` header, stored in env |
| Webhook verification | HMAC-SHA256 with shared secret |
| Sensitive fields | AES-256-GCM encryption at rest |
| SQL injection | Drizzle ORM parameterised queries |
| Rate limiting | Per-IP + per-user (Redis) |
| CORS | Allowlist of JetrPay domains only |

---

## Deployment Architecture

```
Internet → Cloudflare (DDoS, WAF) → Load Balancer
                                          │
                              ┌───────────┴───────────┐
                              │    JetrPay Backend     │
                              │   (Node.js containers) │
                              └───────────┬───────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     ▼                    ▼                     ▼
              PostgreSQL DB         Redis (cache)        Zynta Last-Mile API
              (primary + replica)   (rate limits)        (payment rails)
```
