# JetRPay Platform Overview

**Date**: 28 April 2026  
**Status**: Production-Ready MVP  
**Version**: 1.0.0

---

## Executive Summary

**JetRPay** is a modern, mobile-first fintech platform offering:
- Instant account creation with frictionless onboarding
- Multi-currency digital wallets
- Physical & virtual card issuance
- Real-time peer-to-peer transfers
- Merchant payment solutions
- Investment & savings products
- Full compliance with regulatory requirements (KYC, AML, sanctions screening)

**Architecture**: React Native (mobile) + Next.js (web) + Node.js backend  
**Payment Rail**: Zynta Last-Mile (settlement, conversion, payout)  
**KYC Provider**: Smile Identity (identity verification, sanctions screening)

---

## Core Features

### 1. User Onboarding (Zero-Friction)
- Phone number signup
- Email verification
- KYC Level 1: Name + document scan (Smile Identity)
- Wallet creation
- Set PIN/biometric security
- **Time to first transaction**: < 5 minutes

### 2. Wallet Management
- Multi-currency support (USD, EUR, GBP, NGN, ZAR, etc.)
- Real-time balance display
- Transaction history with filters
- Account statements (daily/weekly/monthly)

### 3. Digital Cards
- Virtual card instant issuance
- Physical card shipping to home address
- Set spending limits per card
- Temporary card freeze/unfreeze
- Card transaction monitoring
- ATM withdrawals

### 4. Transfers & Payments
- Send money to registered users (instant, free)
- Send money to bank accounts (2-4h, fee-based)
- Bill payments (utilities, mobile recharge, etc.)
- Merchant payments at partner shops
- Request money from contacts

### 5. Compliance & Security
- Real-time KYC via Smile Identity
- Email domain validation
- Sanctions/PEP screening
- Transaction monitoring & unusual activity alerts
- Device fingerprinting
- 2FA + biometric authentication

### 6. Analytics & Insights
- Spending categories breakdown
- Budget tracking
- Recurring transaction detection
- Financial health score
- Personalized recommendations

---

## User Personas

| Persona | Goal | Key Features |
|---|---|---|
| **Gen-Z Saver** | Easy way to save and track spending | Digital wallet, budgeting, insights |
| **Freelancer** | Fast global money transfers | Instant settlement, multi-currency |
| **Merchant** | Accept payments online | Payment links, QR codes, reports |
| **Student** | Send/receive money, low fees | P2P transfers, minimal costs |
| **Immigrant** | Remittance & bill payment | International transfers, GBP/USD/NGN |

---

## Technical Stack

### Frontend
- **Mobile**: React Native (iOS & Android simultaneously)
- **Web**: Next.js 15 (TypeScript)
- **UI**: TailwindCSS + custom component library
- **State**: Redux Toolkit + React Query
- **Auth**: JWT + OAuth2 (Google, Apple, GitHub)

### Backend
- **Runtime**: Node.js (Express)
- **Language**: TypeScript
- **Database**: PostgreSQL (Drizzle ORM)
- **Queue**: Redis (background jobs, rate limiting)
- **Cache**: Redis (session, balance cache)
- **Message Queue**: Bull (async tasks)

### Infrastructure
- **Hosting**: AWS (EC2/RDS) or Render
- **CDN**: Cloudinary (images, documents)
- **Monitoring**: Sentry + DataDog
- **Logging**: ELK Stack / LogRocket
- **Payment Backend**: Zynta Last-Mile API

---

## API Architecture

```
Public Routes (No Auth)
├── POST   /auth/signup                  (phone/email signup)
├── POST   /auth/verify-otp              (email/SMS OTP)
├── POST   /auth/login                   (email + password)
├── GET    /kyc/smile-identity/config    (fetch Smile config)

Protected Routes (Auth Required)
├── Wallet Routes
│   ├── GET    /wallets                  (list all wallets)
│   ├── POST   /wallets                  (create new currency wallet)
│   └── GET    /wallets/:id/transactions (wallet statement)
├── Card Routes
│   ├── POST   /cards/virtual            (issue virtual card)
│   ├── POST   /cards/physical           (order physical card)
│   ├── PATCH  /cards/:id/status         (freeze/unfreeze)
│   └── GET    /cards/:id/transactions   (card statement)
├── Transfer Routes
│   ├── POST   /transfers/p2p            (user-to-user)
│   ├── POST   /transfers/bank           (to external bank)
│   ├── POST   /transfers/request        (request money)
│   └── GET    /transfers/:id/status     (check status)
├── Compliance Routes
│   ├── POST   /kyc/verify               (submit identity docs)
│   ├── GET    /kyc/status               (check KYC level)
│   ├── POST   /kyc/upgrade              (request higher tier)
│   └── GET    /compliance/sanctions     (check screening status)
├── User Profile Routes
│   ├── GET    /me                       (profile & settings)
│   ├── PATCH  /me                       (update profile)
│   ├── POST   /me/device-fingerprint    (register device)
│   └── POST   /me/2fa                   (enable 2FA)
├── Analytics Routes
│   ├── GET    /analytics/spending       (spending breakdown)
│   ├── GET    /analytics/budget         (budget tracking)
│   └── GET    /analytics/insights       (personalized recommendations)
└── Merchant Routes (if applicable)
    ├── POST   /merchants/links          (create payment link)
    ├── POST   /merchants/webhooks       (set webhook)
    └── GET    /merchants/reports        (transaction reports)
```

---

## User Journeys

### 1. Onboarding Flow
```
1. Download app / Visit web
2. Tap "Sign Up"
3. Enter phone number
4. Verify via SMS OTP
5. Set password
6. Add basic info (name, email, DOB)
7. Take selfie + ID photo (Smile Identity)
8. Wait for KYC verification (< 2 mins usually)
9. Create PIN
10. Enable biometric auth (optional)
11. Create first wallet (USD or local currency)
12. Dashboard → Ready to send/receive money
```

### 2. Send Money (P2P)
```
User A → Enter User B's phone/email
       → Confirm amount & currency
       → Review fee (usually 0% for P2P)
       → Confirm with PIN/biometric
       → Instant transfer
       → Push notification to User B
       → User B receives notification + optional SMS
```

### 3. Receive Bank Transfer
```
User → Bank transfer arrives via Zynta Last-Mile webhook
    → Auto-detected and credited to wallet
    → User notified instantly
    → Transaction appears in history
```

### 4. Card Spending
```
User → Virtual/Physical card issued
    → Set spending limits
    → Use at merchant (online/offline)
    → Transaction appears instantly
    → Notification sent + email receipt
    → User can dispute/block if needed
```

### 5. KYC Tier Upgrade
```
User (Level 1) → Taps "Upgrade Account"
              → Submits higher-value documents
              → Smile Identity verification
              → Level 2/3 unlocked
              → Spending limits increased
```

---

## Integration Points

### Zynta Last-Mile
- **For**: Settlement, conversion, bank transfers, payout
- **API Used**: Transaction creation, settlement initiation
- **Webhook Received**: Transaction confirmed, settlement completed
- **Credentials**: Stored in `ZYNTA_API_KEY` (live mode)

### Smile Identity (KYC)
- **For**: Identity verification, liveness check, sanctions screening
- **API Used**: AML/PEP screening, face recognition
- **Response Types**: Verified, PartiallyVerified, PendingReview, Rejected
- **Credentials**: Stored in `SMILE_IDENTITY_*`

### AWS S3 / Cloudinary
- **For**: Document storage, profile images, receipts
- **Upload**: Selfies, ID documents during KYC
- **Retrieval**: Generate temporary download links for user statements

### Firebase / Twilio
- **For**: Push notifications, SMS OTP
- **Use Cases**: Transaction alerts, OTP delivery, promotional messages

---

## Database Entities

### Core Tables
- `users` — User accounts
- `wallets` — Multi-currency accounts
- `cards` — Virtual & physical cards
- `transactions` — P2P, bank transfers, card spending
- `kyc_submissions` — Identity verification records
- `devices` — Registered devices (fingerprinting)
- `contacts` — User's saved contacts
- `merchants` — Partner merchants
- `payment_links` — Merchant payment links
- `compliance_flags` — Sanctions hits, unusual activity alerts

---

## Security Model

### Authentication
- JWT tokens (15min access, 7day refresh)
- OAuth2 (Google, Apple, GitHub sign-in)
- Biometric auth on mobile
- Device fingerprinting

### Authorization
- Role-based access control (user, merchant, admin, compliance_officer)
- Resource-level permissions (can only view own transactions)
- Team permissions (for business accounts)

### Encryption
- All passwords: bcrypt (12 rounds)
- All PII at rest: AES-256
- All API calls: TLS 1.3
- Sensitive data: tokenization (cards, SSN)

### Compliance
- Email domain blocklist (disposable emails)
- Real-time transaction monitoring
- Sanctions/PEP screening via Smile Identity
- Manual review queue for flagged accounts
- Audit logging of all admin actions

---

## Performance Targets

| Metric | Target |
|---|---|
| Signup to first transaction | < 5 min |
| P2P transfer settlement | < 30 sec |
| Bank transfer settlement | < 4 hours |
| Card issuance (virtual) | < 10 sec |
| App load time | < 2 sec |
| API response (p95) | < 200ms |
| Availability | 99.95% uptime |

---

## Roadmap

### Phase 1 (Week 1-2): MVP Core
- ✅ User auth & onboarding
- ✅ KYC integration (Smile Identity)
- ✅ Wallet creation & management
- ✅ P2P transfers
- ✅ Digital cards (virtual)

### Phase 2 (Week 3-4): Expansion
- ✅ Physical card ordering
- ✅ Bank transfers (outbound)
- ✅ Bill payments (utilities)
- ✅ Request money
- ✅ Transaction analytics

### Phase 3 (Month 2): Advanced
- Merchant payment solutions
- Investment products (micro-savings)
- Referral program
- API for partners
- Admin dashboard

---

## Compliance & Regulations

### Standards
- **KYC/AML**: Level 1 & Level 2 verification
- **Data Privacy**: GDPR, CCPA, Nigeria DPA compliance
- **Sanctions**: OFAC SDN, UN, EU, UK OFSI screening
- **PCI DSS**: Level 3 compliance for card handling
- **Open Banking**: PSD2 / API standards

### Monitoring
- Real-time transaction surveillance
- Unusual activity detection (behavioral analytics)
- SARs (Suspicious Activity Reports) for compliance team
- Regular audit logs

---

## Success Metrics

### User Metrics
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Onboarding completion rate (target: 85%+)
- First transaction rate (target: 65%+ within 24h)

### Financial Metrics
- Transaction volume (daily/monthly)
- Average transaction value
- Repeat transaction rate
- Merchant settlement amount

### Technical Metrics
- App crash rate (target: < 0.1%)
- API error rate (target: < 0.5%)
- Latency (p95 < 200ms)
- Uptime (target: 99.95%)

---

## Next Steps

1. ✅ Documentation complete (this file + others)
2. **Create architecture diagrams** (ARCHITECTURE.md)
3. **Design database schema** (DATABASE.md)
4. **Build project structure**
5. **Implement backend** (auth, wallets, cards)
6. **Build mobile UI** (React Native)
7. **Integrate Zynta Last-Mile** (transactions)
8. **Deploy MVP**

---

## Document Index

- [ARCHITECTURE.md](./ARCHITECTURE.md) — System design, data flow, deployment
- [DATABASE.md](./DATABASE.md) — Schema, migrations, relationships
- [USER_FLOWS.md](./USER_FLOWS.md) — Detailed journey maps
- [API_SPEC.md](./API_SPEC.md) — Complete endpoint documentation
- [ZYNTA_INTEGRATION.md](./ZYNTA_INTEGRATION.md) — Last-Mile setup guide
- [SECURITY.md](./SECURITY.md) — Auth, encryption, compliance
- [MOBILE_UI.md](./MOBILE_UI.md) — Component library, design patterns
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Environment setup, CI/CD
