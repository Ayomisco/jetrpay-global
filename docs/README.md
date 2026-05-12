# JetrPay Platform - Complete Documentation

**The first dapp on Zynta infrastructure — a mobile-first remittance and wallet platform for Africa.**

---

## 📋 Quick Links

### Core Documentation
- **[Platform Overview](./PLATFORM_OVERVIEW.md)** — Features, tech stack, user personas
- **[Architecture & System Design](./ARCHITECTURE.md)** — System layout, data flows, deployments
- **[Database Schema](./DATABASE.md)** — Complete data models, relationships, migrations
- **[User Flows & Journeys](./USER_FLOWS.md)** — Detailed flow diagrams for every feature
- **[Mobile UI & Components](./MOBILE_UI.md)** — Design system, components, responsive layouts
- **[Zynta Integration](./ZYNTA_INTEGRATION.md)** — Payment settlement, bank transfers, webhooks
- **[Implementation Roadmap](./IMPLEMENTATION_ROADMAP.md)** — 8-week build plan with milestones

---

## 🚀 What is JetRPay?

**JetRPay** is a production-ready fintech platform offering:

✅ **Instant onboarding** (< 5 minutes to first transaction)  
✅ **Multi-currency wallets** (USD, EUR, GBP, NGN, ZAR, etc.)  
✅ **Digital & physical cards** (virtual instant, physical in 7-14 days)  
✅ **P2P transfers** (instant, free between users)  
✅ **Bank transfers** (2-4 hours, fee-based)  
✅ **Full KYC/AML compliance** (Smile Identity + sanctions screening)  
✅ **Transaction monitoring** (real-time fraud detection)  
✅ **Responsive mobile-first UI** (iOS, Android, Web)  
✅ **Enterprise-grade security** (AES-256, JWT, device fingerprinting)  

---

## 🏗️ Architecture at a Glance

```
┌──────────────────────────────────────────────────┐
│ USER APPS (Mobile + Web)                         │
├──────────────────────────────────────────────────┤
│  React Native (iOS/Android)  │  Next.js (Web)    │
└────────────────┬─────────────────────────────────┘
                 │
         (REST API / HTTPS)
                 │
┌────────────────▼──────────────────────────────────┐
│ API BACKEND (Node.js + Express + TypeScript)      │
├────────────────────────────────────────────────────┤
│ Auth │ Wallets │ Cards │ Transfers │ KYC │ Admin  │
└────────────────┬───────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
  ┌─▼────┐  ┌───▼──┐  ┌──────▼─┐
  │ DB   │  │Redis │  │Zynta   │
  │ (PG) │  │Cache │  │API     │
  └──────┘  └──────┘  └────────┘
```

**Key Integrations**:
- **Zynta Last-Mile**: Settlement, bank transfers, conversion
- **Smile Identity**: KYC verification, sanctions screening, liveness checks
- **Firebase/Twilio**: Push notifications, SMS OTP delivery
- **SendGrid/Office365**: Email notifications, receipts
- **Cloudinary/S3**: Document storage, profile images

---

## 📱 Core Features

### 1. User Onboarding (0-5 minutes)
```
Sign up → Verify email/phone → Enter info → KYC (Smile) → Set PIN → Ready!
```
- Phone/email signup
- OTP verification (SMS)
- Full name, DOB, nationality
- Self-sovereign identity (SSI) with Smile Identity
- Automatic sanctions/PEP screening
- Biometric support (optional)

### 2. Wallet Management
- Create multiple currency wallets (USD, EUR, NGN, etc.)
- Real-time balance display
- Set daily/monthly spending limits
- Transaction history with filters
- Account statements

### 3. P2P Transfers
- Send money to other JetRPay users
- Free, instant (< 1 second)
- No fees
- Real-time notifications
- Transaction receipt & proof

### 4. Bank Transfers (via Zynta)
- Withdraw to any bank account
- 2-4 hour settlement
- Competitive fees (0.5%)
- Name verification
- Receipt & tracking

### 5. Digital & Physical Cards
- Virtual card issued instantly (< 10 sec)
- Spending limits per card
- Card freeze/unfreeze
- Physical card shipped to home
- ATM withdrawals

### 6. Compliance & Security
- Real-time KYC via Smile Identity
- Email domain validation (blocklist)
- Sanctions/PEP screening
- Device fingerprinting
- 2FA + biometric auth
- Transaction monitoring
- Manual review queue

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Drizzle (PostgreSQL)
- **Database**: PostgreSQL 14+
- **Cache**: Redis
- **Queue**: Bull (job processing)
- **Auth**: JWT + OAuth2

### Frontend (Mobile)
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State**: Zustand + React Query
- **Styling**: TailwindCSS + Expo StyleSheet
- **Biometric**: React Native Keychain

### Frontend (Web)
- **Framework**: Next.js 15
- **Styling**: TailwindCSS
- **UI Components**: Custom component library
- **State**: Redux Toolkit + React Query

### Infrastructure
- **Hosting**: AWS ECS / Render (containerized)
- **Database**: AWS RDS (PostgreSQL)
- **Cache**: ElastiCache (Redis)
- **Storage**: S3 / Cloudinary
- **Monitoring**: Sentry + DataDog
- **Logging**: ELK Stack

---

## 💾 Database Overview

**11 Core Tables**:
1. `users` — User accounts & profiles
2. `wallets` — Multi-currency accounts
3. `cards` — Virtual & physical cards
4. `transactions` — All movements (P2P, bank, card)
5. `kyc_submissions` — Identity documents & verification
6. `compliance_flags` — Sanctions hits, unusual activity
7. `devices` — Device fingerprinting
8. `contacts` — Saved payees
9. `merchants` — Partner merchants (future)
10. `payment_links` — Payment links (future)
11. `audit_logs` — Immutable audit trail

**Key Design Patterns**:
- ✅ UUID primary keys (not auto-increment)
- ✅ Timestamps (created_at, updated_at)
- ✅ Soft deletes (status='archived' instead of DELETE)
- ✅ Audit logging on all sensitive operations
- ✅ Encryption at rest for PII (AES-256)
- ✅ Transaction atomicity (PostgreSQL transactions)

---

## 🔌 API Overview

### Authentication
```
POST   /auth/signup              Register new user
POST   /auth/verify-otp          Email/SMS OTP verification
POST   /auth/login               Login with credentials
POST   /auth/refresh             Refresh JWT token
POST   /auth/logout              Logout (blacklist)
POST   /auth/recover-account     Account recovery
```

### Wallets
```
POST   /wallets                  Create new wallet
GET    /wallets                  List all wallets
GET    /wallets/:id              Get wallet details
PATCH  /wallets/:id/limits       Update spending limits
GET    /wallets/:id/transactions Get statement
```

### Transfers
```
POST   /transfers/p2p            Send to JetRPay user
POST   /transfers/bank           Withdraw to bank account
GET    /transfers/:id/status     Check status
```

### Cards
```
POST   /cards/virtual            Issue virtual card instantly
POST   /cards/physical           Order physical card
PATCH  /cards/:id/status         Freeze/unfreeze
GET    /cards/:id/transactions   Card statement
```

### KYC & Compliance
```
POST   /kyc/verify               Submit identity documents
GET    /kyc/status               Check KYC level
POST   /kyc/upgrade              Request tier upgrade
GET    /compliance/sanctions     Screening results
```

### Analytics
```
GET    /analytics/spending       Spending breakdown
GET    /analytics/budget         Budget tracking
GET    /analytics/insights       Personalized recommendations
```

---

## 🔌 Zynta Integration

JetrPay uses **Zynta Last-Mile API** as its payment rails. JetrPay is a Zynta **Partner** — authenticated with `x-api-key: sk_test_...` (sandbox) or `sk_live_...` (production). NOT Bearer auth.

### What Zynta handles
- **Off-ramp** (USDC/USDT → NGN/KES/GHS bank payout) via Ledig
- **Recipient KYC** (SmileID Job Type 5) — identity verified server-side
- **FX quotes** — rate locked for 15 min, fees embedded (no separate fee field)
- **DFNS partner pool wallet** — JetrPay pre-funds USDC here; used for payouts
- **Webhooks** — `transfer.completed`, `transfer.failed`, `transfer.expired`

### Key Flows

**P2P Transfer (JetrPay user → JetrPay user)**:
```
No Zynta call needed — pure internal ledger
├── Debit sender wallet
├── Credit recipient wallet
└── Instant, free
```

**Bank Transfer (off-ramp via Zynta)**:
```
1. POST /api/v1/recipients/individual  → register recipient + KYC
2. POST /api/v1/quotes                 → get rate (fee embedded in destinationAmount)
3. POST /api/v1/off-ramp               → create transfer, source: "partner_pool"
4. Wait for webhook: transfer.completed → mark transaction done
```

**Staging API**: `https://zynta-lastmile-infrastructure-api-staging.up.railway.app/api/v1`

See [ZYNTA_INTEGRATION.md](./ZYNTA_INTEGRATION.md) for the full guide.

---

## 🔐 Security Architecture

### Authentication
- JWT tokens (15min access, 7day refresh)
- Password hashing: bcrypt (12 rounds)
- OTP validation (SMS/Email)
- Device fingerprinting
- Biometric auth (mobile)

### Data Protection
- HTTPS/TLS 1.3 (all traffic)
- AES-256 encryption at rest (PII)
- Card tokenization (never store full number)
- Audit logging (all actions)

### Compliance
- KYC Level 1 & 2 (Smile Identity)
- Email domain blocklist (disposable emails)
- Sanctions screening (OFAC, UN, EU, UK)
- PEP/AML checks (real-time)
- Transaction monitoring (behavioral analytics)
- Manual review queue (for flagged accounts)

### Infrastructure
- Rate limiting (per-user, per-IP)
- Input validation (Zod schemas)
- CORS protection
- SQL injection prevention (Drizzle ORM)
- XSS protection (React escaping)

---

## 📊 Database Relationships

```
users (1)
  ├─── (N) wallets          [user can have multiple currencies]
  ├─── (N) cards            [user can have multiple cards]
  ├─── (N) transactions     [user can have many transactions]
  ├─── (N) kyc_submissions  [KYC history]
  ├─── (N) devices          [registered devices]
  ├─── (N) contacts         [saved contacts]
  ├─── (N) compliance_flags [alerts & red flags]
  └─── (N) notifications    [transaction alerts]

wallets (1)
  ├─── (N) cards            [cards linked to wallet]
  └─── (N) transactions     [from/to wallet transfers]

transactions (N)
  └─── (0-1) kyc_submissions [if KYC failed]

merchants (1)
  └─── (N) payment_links    [payment links for merchant]
```

---

## 🚀 Implementation Timeline

**8 weeks to MVP**:

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1-2 | Foundation | Auth system, Database, Zynta integration |
| 3-4 | Wallets & Transfers | P2P, Bank transfers, History |
| 5-6 | Mobile & Cards | React Native UI, Virtual cards |
| 7 | KYC & Polish | Smile Identity, Sanctions check, UI refinement |
| 8 | Testing & Deploy | E2E tests, Security audit, Production launch |

**Key Milestones**:
- ✅ Week 2: Backend running, auth working
- ✅ Week 4: Can send money (P2P), receive via bank
- ✅ Week 6: Mobile app runs, users can interact
- ✅ Week 7: Full compliance features ready
- ✅ Week 8: Production MVP deployed

---

## 📈 Success Metrics

### User Metrics
- Signup to first transaction: < 5 minutes
- Onboarding completion rate: 85%+
- First transaction within 24h: 65%+
- Monthly active users (MAU)
- Transaction volume (daily/monthly)

### Technical Metrics
- API response time (p95): < 200ms
- Uptime: 99.95%
- Error rate: < 0.5%
- App crash rate: < 0.1%
- Database query time (p95): < 100ms

### Financial Metrics
- Average transaction value
- Daily settlement volume
- Fee revenue
- Customer acquisition cost (CAC)
- Lifetime value (LTV)

---

## 🔗 Integration Checklist

Before production launch:
- [ ] Zynta API credentials configured (LIVE mode)
- [ ] Smile Identity integration tested
- [ ] Firebase/Twilio SMS setup
- [ ] SendGrid email templates verified
- [ ] AWS S3 / Cloudinary storage ready
- [ ] Database backups automated
- [ ] Monitoring & alerting (Sentry, DataDog) active
- [ ] HTTPS certificates provisioned
- [ ] Rate limiting tested
- [ ] Webhook signature verification working
- [ ] Error recovery procedures documented
- [ ] On-call incident response plan ready

---

## 📚 How to Use This Documentation

### For Backend Developers
1. Read **PLATFORM_OVERVIEW.md** (understand what JetRPay does)
2. Read **ARCHITECTURE.md** (understand system design)
3. Read **DATABASE.md** (understand data models)
4. Read **ZYNTA_INTEGRATION.md** (understand payment flows)
5. Follow **IMPLEMENTATION_ROADMAP.md** (execute phase by phase)

### For Mobile Developers
1. Read **PLATFORM_OVERVIEW.md** (features to build)
2. Read **USER_FLOWS.md** (understand user journeys)
3. Read **MOBILE_UI.md** (component library, design system)
4. Read **ZYNTA_INTEGRATION.md** (understand payment backend)
5. Follow **IMPLEMENTATION_ROADMAP.md** (Weeks 5-6)

### For Product/Design
1. Read **PLATFORM_OVERVIEW.md** (high-level overview)
2. Read **USER_FLOWS.md** (all user journeys with diagrams)
3. Read **MOBILE_UI.md** (UI/UX specifications)
4. Review **ZYNTA_INTEGRATION.md** (payment flows)

### For DevOps/Infrastructure
1. Read **ARCHITECTURE.md** (deployment architecture)
2. Read **ZYNTA_INTEGRATION.md** (external integrations)
3. Read **DATABASE.md** (schema, backup, recovery)
4. Follow **IMPLEMENTATION_ROADMAP.md** (Phase 8: Deployment)

---

## 🤝 Contributing

### Code Style
- **Backend**: ESLint + Prettier (TypeScript)
- **Mobile**: React Native conventions
- **Database**: Drizzle ORM migrations (no raw SQL)

### Branch Strategy
```
main (production)
  ├─ develop (staging)
  │  ├─ feature/auth-system
  │  ├─ feature/p2p-transfers
  │  ├─ feature/card-issuance
  │  └─ feature/kyc-integration
  └─ hotfix/critical-bug
```

### PR Requirements
- [ ] All tests passing
- [ ] Code review approved
- [ ] Lint checks passing
- [ ] Documentation updated

---

## 📞 Support & Contacts

### Internal Escalation
- **Backend Issues**: Backend team lead
- **Mobile Issues**: Mobile team lead
- **Infrastructure**: DevOps engineer
- **Security/Compliance**: Security officer
- **Zynta Integration**: API integration lead

### External Contacts
- **Zynta Support**: api-support@zynta.com
- **Smile Identity**: support@smileidentity.com
- **Firebase Support**: Firebase console
- **AWS Support**: AWS support center

---

## 🎯 Next Steps

1. **Review Documentation** (2 hours)
   - Read PLATFORM_OVERVIEW.md
   - Understand architecture from ARCHITECTURE.md

2. **Setup Development Environment** (1 day)
   - Clone repository
   - Install dependencies
   - Configure .env file

3. **Start Building** (8 weeks)
   - Follow IMPLEMENTATION_ROADMAP.md
   - Mark progress weekly
   - Test continuously

4. **Launch MVP** (Week 8)
   - Deploy to production
   - Onboard beta users
   - Monitor metrics

---

## 📝 Document Version Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 28 Apr 2026 | Dev Team | Initial complete documentation |

---

## 📄 License

JetRPay Platform © 2026. All rights reserved.

---

**Last Updated**: 28 April 2026  
**Status**: Ready for Development  
**Contact**: dev-team@jetpay.io
