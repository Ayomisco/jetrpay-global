# JetRPay Implementation Roadmap

**Date**: 28 April 2026  
**Status**: Ready for development  
**Timeline**: 8 weeks to MVP  

---

## Overview

This roadmap outlines the complete build of JetRPay from foundation to production MVP in 8 weeks.

```
Week 1-2: Foundation (Backend + DB)
├─ Auth system
├─ User onboarding
├─ Database setup
└─ Zynta integration (basic)

Week 3-4: Wallets & Transfers
├─ Wallet management
├─ P2P transfers
├─ Bank transfers
└─ Transaction history

Week 5-6: Mobile UI & Cards
├─ React Native setup
├─ Core screens
├─ Card issuance (virtual)
└─ Mobile navigation

Week 7: Polish & KYC
├─ KYC tier upgrade
├─ Sanctions screening
├─ UI refinement
└─ Error handling

Week 8: Testing & Deployment
├─ End-to-end testing
├─ Performance optimization
├─ Security audit
└─ Production deployment
```

---

## Phase 1: Foundation (Week 1-2)

### 1.1 Project Setup

**Deliverables**:
- [ ] Git repository with branch strategy
- [ ] Backend folder structure
- [ ] Environment configuration (.env template)
- [ ] Docker setup (optional but recommended)
- [ ] CI/CD pipeline skeleton

**Tasks**:
```
Backend (Node.js + Express + TypeScript):
├─ npm init + install dependencies
│  ├─ express, cors, helmet
│  ├─ drizzle-orm, postgres
│  ├─ jsonwebtoken, bcrypt
│  ├─ bull (job queue), redis
│  ├─ axios (HTTP client)
│  └─ dotenv, zod (validation)
├─ Folder structure
│  ├─ src/
│  │  ├─ db/
│  │  │  ├─ index.ts (connection)
│  │  │  └─ schema.ts (tables)
│  │  ├─ routes/
│  │  ├─ controllers/
│  │  ├─ services/
│  │  ├─ middleware/
│  │  ├─ types/
│  │  └─ utils/
│  ├─ migrations/
│  ├─ .env.example
│  └─ tsconfig.json
└─ Run locally: npm run dev

Mobile (React Native):
├─ npx create-expo-app jetrpay-mobile
├─ Install dependencies
│  ├─ react-navigation
│  ├─ @react-native-async-storage
│  ├─ react-native-gesture-handler
│  └─ zustand (state management)
├─ Folder structure
│  ├─ app/
│  │  ├─ (auth)/
│  │  ├─ (main)/
│  │  ├─ (tabs)/
│  │  └─ _layout.tsx
│  ├─ components/
│  ├─ types/
│  └─ hooks/
└─ Run: npx expo start
```

**Time Estimate**: 1 day

---

### 1.2 Authentication System

**Deliverables**:
- [ ] JWT token generation & validation
- [ ] Password hashing (bcrypt)
- [ ] OTP system (SMS/Email)
- [ ] Device fingerprinting
- [ ] Auth middleware

**Endpoints**:
```
POST   /auth/signup               Register new user
POST   /auth/verify-otp           Verify email/SMS OTP
POST   /auth/login                Login with email + password
POST   /auth/refresh              Refresh JWT token
POST   /auth/logout               Logout (blacklist token)
POST   /auth/recover-account      Account recovery
POST   /auth/2fa/enable           Enable 2FA
POST   /auth/2fa/verify           Verify 2FA code
```

**Database**:
- Create `users` table
- Create `devices` table (fingerprinting)
- Create `auth_sessions` table (token blacklist)

**Code Structure**:
```typescript
// src/services/authService.ts
export async function signup(email, phone, password) {
  // Validate email/phone unique
  // Hash password
  // Create user
  // Send OTP
  // Return user + temporary token
}

export async function verifyOtp(email, otp) {
  // Check OTP validity
  // Mark email verified
  // Return JWT + refresh token
}

export async function login(email, password) {
  // Find user by email
  // Verify password
  // Generate JWT
  // Record device fingerprint
  // Return JWT + refresh token
}

// src/middleware/auth.ts
export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
```

**Time Estimate**: 2-3 days

---

### 1.3 Database Schema & Migrations

**Deliverables**:
- [ ] Drizzle schema (Typescript definitions)
- [ ] Migration files
- [ ] Database seeding (test data)
- [ ] Indexes for performance

**Drizzle Setup**:
```typescript
// src/db/schema.ts
import { pgTable, uuid, varchar, numeric, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  phone_number: varchar('phone_number', { length: 20 }).unique().notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  kyc_level: integer('kyc_level').default(0),
  kyc_verified_at: timestamp('kyc_verified_at'),
  status: varchar('status', { length: 50 }).default('active'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// Similar for: wallets, cards, transactions, kyc_submissions, devices
```

**Migrations**:
```bash
drizzle-kit generate:pg --out ./migrations
# Generates 001_initial_schema.sql

# Apply migration
psql -U jetpay_user -d jetpay_db -f migrations/001_initial_schema.sql
```

**Time Estimate**: 2-3 days

---

### 1.4 Zynta Integration ✅ DONE

**Deliverables**:
- [x] Zynta API client (`src/services/zynta/client.ts`)
- [x] Webhook receiver with correct event types
- [x] Off-ramp flow (recipient → quote → transfer)
- [x] Partner pool as funding source

**Important — Zynta auth is `x-api-key`, NOT Bearer:**
```typescript
// CORRECT
headers: { 'x-api-key': process.env.ZYNTA_API_KEY }

// WRONG (old)
headers: { 'Authorization': `Bearer ${apiKey}` }
```

**Webhook events (correct names):**
```typescript
switch (event.eventType) {
  case 'transfer.completed': // NOT 'settlement.completed'
  case 'transfer.failed':
  case 'transfer.expired':
  case 'balance.topup_received':
}
```

**Off-ramp flow (bank payout):**
```
POST /api/v1/recipients/individual  → register recipient + KYC
POST /api/v1/quotes                 → get rate (fees embedded in destinationAmount)
POST /api/v1/off-ramp               → { quoteId, recipientId, source: "partner_pool" }
webhook: transfer.completed         → mark transaction done
```

**Staging URL**: `https://zynta-lastmile-infrastructure-api-staging.up.railway.app/api/v1`

**Time Estimate**: ✅ Complete

---

## Phase 2: Wallets & Transfers (Week 3-4)

### 2.1 Wallet Management

**Deliverables**:
- [ ] Create/list wallets endpoint
- [ ] Balance checking
- [ ] Multi-currency support
- [ ] Spending limits

**Endpoints**:
```
POST   /wallets                    Create new wallet
GET    /wallets                    List user's wallets
GET    /wallets/:id                Get wallet details
PATCH  /wallets/:id/limits         Update daily/monthly limits
GET    /wallets/:id/transactions   Get wallet statement
```

**Implementation**:
```typescript
// src/controllers/walletController.ts
export async function createWallet(req, res) {
  const { userId } = req.user;
  const { currency_code } = req.body;
  
  // Check currency valid
  const supported = ['USD', 'EUR', 'GBP', 'NGN', 'ZAR'];
  if (!supported.includes(currency_code)) {
    return res.status(400).json({ error: 'Unsupported currency' });
  }
  
  // Create wallet
  const wallet = await db.insert(wallets).values({
    user_id: userId,
    currency_code,
    balance: 0,
    is_primary: (await db.query.wallets.findFirst({
      where: eq(wallets.user_id, userId)
    })) === null
  }).returning();
  
  res.json(wallet);
}

export async function getWallets(req, res) {
  const { userId } = req.user;
  
  const userWallets = await db.query.wallets.findMany({
    where: eq(wallets.user_id, userId)
  });
  
  res.json(userWallets);
}
```

**Time Estimate**: 2 days

---

### 2.2 P2P Transfers

**Deliverables**:
- [ ] Transfer creation
- [ ] Balance validation
- [ ] Transaction recording
- [ ] Notifications

**Endpoints**:
```
POST   /transfers/p2p              Send money to JetRPay user
GET    /transfers/:id/status       Check transfer status
```

**Flow**:
```typescript
export async function createP2PTransfer(req, res) {
  const { userId } = req.user;
  const { to_phone, amount, currency_code } = req.body;
  
  // 1. Validate sender wallet
  const wallet = await getWalletByUser(userId, currency_code);
  if (!wallet) return res.status(400).json({ error: 'Wallet not found' });
  if (wallet.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });
  
  // 2. Find recipient
  const recipient = await db.query.users.findFirst({
    where: eq(users.phone_number, to_phone)
  });
  if (!recipient) return res.status(404).json({ error: 'Recipient not found' });
  
  // 3. Create transaction record (with idempotency key)
  const idempotencyKey = req.headers['x-idempotency-key'] || uuidv4();
  const existingTx = await db.query.transactions.findFirst({
    where: eq(transactions.idempotency_key, idempotencyKey)
  });
  if (existingTx) return res.json(existingTx); // Idempotency
  
  // 4. Execute transfer (atomic)
  const tx = await db.transaction(async (db) => {
    // Debit sender
    await db.update(wallets).set({
      balance: sql`balance - ${amount}`
    }).where(eq(wallets.id, wallet.id));
    
    // Credit recipient
    const recipientWallet = await getWalletByUser(recipient.id, currency_code);
    await db.update(wallets).set({
      balance: sql`balance + ${amount}`
    }).where(eq(wallets.id, recipientWallet.id));
    
    // Record transaction
    return db.insert(transactions).values({
      user_id: userId,
      from_wallet_id: wallet.id,
      to_wallet_id: recipientWallet.id,
      to_user_id: recipient.id,
      amount,
      currency_code,
      type: 'p2p',
      status: 'completed',
      fee: 0, // P2P is free
      idempotency_key: idempotencyKey,
      created_at: new Date()
    }).returning();
  });
  
  // 5. Send notifications async
  await notificationQueue.add('send-email', {
    userId: sender.id,
    type: 'transfer_sent',
    data: { amount, recipientName: recipient.first_name }
  });
  
  await notificationQueue.add('send-notification', {
    userId: recipient.id,
    type: 'transfer_received',
    data: { amount, senderName: sender.first_name }
  });
  
  res.json({ success: true, transaction: tx[0] });
}
```

**Time Estimate**: 3 days

---

### 2.3 Bank Transfers

**Deliverables**:
- [ ] Create settlement via Zynta
- [ ] Fee calculation
- [ ] Status tracking
- [ ] Webhook handling

**Endpoints**:
```
POST   /transfers/bank              Withdraw to bank account
GET    /transfers/:id/status        Check transfer status
```

**Implementation**: See ZYNTA_INTEGRATION.md

**Time Estimate**: 3 days

---

### 2.4 Transaction History & Analytics

**Deliverables**:
- [ ] List transactions endpoint
- [ ] Filters (date, type, status)
- [ ] Pagination
- [ ] Analytics data

**Endpoints**:
```
GET    /transactions                List user's transactions
GET    /transactions/:id            Get transaction details
GET    /analytics/spending          Spending breakdown
GET    /analytics/budget            Budget tracking
```

**Time Estimate**: 2 days

---

## Phase 3: Mobile UI & Cards (Week 5-6)

### 3.1 React Native Setup & Navigation

**Deliverables**:
- [ ] Expo setup
- [ ] Bottom tab navigation
- [ ] Theme/styling
- [ ] Auth flow screens

**Setup**:
```bash
npx create-expo-app jetrpay-mobile
npm install react-navigation @react-native-community/masked-view
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install zustand axios react-query
npm install @react-native-async-storage/async-storage
npm install react-native-keychain
```

**Navigation Structure**:
```typescript
// app/_layout.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AuthStack from './auth/_layout';
import HomeStack from './home/_layout';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function RootLayout() {
  const { isLoggedIn } = useAuthStore();
  
  return (
    <NavigationContainer>
      {isLoggedIn ? (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
              // Icons based on route
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeStack} />
          <Tab.Screen name="Send" component={SendStack} />
          <Tab.Screen name="Cards" component={CardsStack} />
          <Tab.Screen name="Settings" component={SettingsStack} />
        </Tab.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
```

**Time Estimate**: 2 days

---

### 3.2 Core Screens

**Deliverables**:
- [ ] Login & signup screens
- [ ] Dashboard/home screen
- [ ] Transaction list
- [ ] Settings screen

**Home Screen Structure**:
```typescript
// app/(tabs)/home/index.tsx
import { View, ScrollView } from 'react-native';
import BalanceCard from '@/components/BalanceCard';
import TransactionList from '@/components/TransactionList';
import { useWalletStore } from '@/hooks/useWalletStore';

export default function HomeScreen() {
  const { wallets, isLoading } = useWalletStore();
  const primaryWallet = wallets?.[0];
  
  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        <Text className="text-xl font-bold">Good morning!</Text>
        
        {primaryWallet && (
          <BalanceCard
            balance={primaryWallet.balance}
            currency={primaryWallet.currency_code}
            onSend={() => navigation.navigate('Send')}
            onRequest={() => navigation.navigate('Request')}
          />
        )}
        
        <Text className="text-lg font-bold mt-6 mb-2">Recent Transactions</Text>
        <TransactionList transactions={wallets?.[0]?.recent_transactions} />
      </View>
    </ScrollView>
  );
}
```

**Time Estimate**: 3 days

---

### 3.3 Send Money Screen

**Deliverables**:
- [ ] Recipient selection (phone/email/contact)
- [ ] Amount input (with currency)
- [ ] Review & confirm
- [ ] Success screen

**Screens**:
```
1. Recipient Screen
   ├─ Phone number input
   ├─ Saved contacts list
   └─ Continue button

2. Amount Screen
   ├─ Currency picker
   ├─ Amount input
   ├─ Fee breakdown
   └─ Continue button

3. Review Screen
   ├─ Recipient details
   ├─ Amount & fee
   ├─ PIN confirmation
   └─ Send button

4. Success Screen
   ├─ Checkmark animation
   ├─ Transaction details
   └─ Share receipt button
```

**Implementation**: 4 days

---

### 3.4 Virtual Card Issuance

**Deliverables**:
- [ ] Card creation UI
- [ ] Card display (masked number)
- [ ] Copy to clipboard
- [ ] Add to Apple Pay / Google Pay

**Endpoints Used**:
```
POST   /cards/virtual              Create virtual card
GET    /cards/:id                  Get card details
```

**Card Screen**:
```typescript
export async function createVirtualCard() {
  // POST /api/cards/virtual
  const card = await createCard({
    type: 'virtual',
    daily_limit: 1000
  });
  
  // Show card details
  // Option to copy number
  // Option to add to Apple Pay
  // Option to set limits
}
```

**Time Estimate**: 2 days

---

## Phase 4: KYC & Polish (Week 7)

### 4.1 KYC Tier Upgrade

**Deliverables**:
- [ ] Smile Identity integration
- [ ] Document upload UI
- [ ] Face verification
- [ ] Sanctions/PEP screening
- [ ] Status tracking

**Flow**:
```
1. Upgrade screen (show benefits)
2. Document selection (ID type)
3. Document photo capture
4. Selfie/liveness check (Smile Identity SDK)
5. Confirmation
6. Waiting screen (checking...)
7. Success/failure result
```

**Integration**:
```typescript
import SmileIdentityCore from "@smile_identity/smart-selfie-core";

export async function verifyIdentityWithSmile() {
  const config = {
    env: 'production',
    userId: currentUser.id,
    jobType: 5, // KYC verification
    timestamp: Date.now(),
    signature: generateSmileSignature(),
    idType: 'PASSPORT', // or NATIONAL_ID
    idNumber: '',
    countryCode: 'NG',
    firstName: currentUser.first_name,
    lastName: currentUser.last_name,
    dob: currentUser.date_of_birth,
    phoneNumber: currentUser.phone_number,
    email: currentUser.email,
  };
  
  SmileIdentityCore.launch(config, (result) => {
    if (result.success) {
      // Submit verification to backend
      submitKYCVerification(result);
    }
  });
}
```

**Time Estimate**: 3 days

---

### 4.2 UI Polish & Error Handling

**Tasks**:
- [ ] Add loading spinners
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Accessibility features
- [ ] Animations & transitions

**Time Estimate**: 2 days

---

## Phase 5: Testing & Deployment (Week 8)

### 5.1 Backend Testing

**Unit Tests**:
```typescript
// __tests__/services/authService.test.ts
describe('authService', () => {
  it('should hash password correctly', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });
  
  it('should create user with unique email', async () => {
    const user1 = await signup('test@example.com', 'test');
    expect(() => signup('test@example.com', 'test')).rejects.toThrow('Email already exists');
  });
});
```

**Integration Tests**:
```typescript
// __tests__/integration/transfers.test.ts
describe('P2P Transfers', () => {
  it('should complete P2P transfer successfully', async () => {
    // Create 2 test users with wallets
    const sender = await createTestUser('sender@test.com');
    const recipient = await createTestUser('recipient@test.com');
    
    // Fund sender's wallet
    await fundWallet(sender.id, 1000);
    
    // Execute transfer
    const response = await request(app)
      .post('/transfers/p2p')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({
        to_phone: recipient.phone_number,
        amount: 100,
        currency_code: 'USD'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.transaction.status).toBe('completed');
    
    // Verify balances
    const senderWallet = await getWallet(sender.id);
    const recipientWallet = await getWallet(recipient.id);
    expect(senderWallet.balance).toBe(900);
    expect(recipientWallet.balance).toBe(100);
  });
});
```

**Time Estimate**: 2 days

---

### 5.2 End-to-End Testing (Manual)

**Test Scenarios**:
- [ ] Complete user signup → onboarding → first transfer
- [ ] Bank transfer creation & webhook handling
- [ ] Card issuance & spending
- [ ] KYC upgrade with Smile Identity
- [ ] Error scenarios (insufficient balance, invalid account, etc.)

**Time Estimate**: 2 days

---

### 5.3 Performance Optimization

**Tasks**:
- [ ] Optimize database queries (add indexes)
- [ ] Bundle size analysis (React Native & web)
- [ ] API response time profiling
- [ ] Load testing (100+ concurrent users)

**Tools**:
- Lighthouse (for web)
- React Native Performance Monitor
- K6 (load testing)

**Time Estimate**: 1 day

---

### 5.4 Security Audit & Deployment

**Security Checklist**:
- [ ] HTTPS everywhere
- [ ] API rate limiting
- [ ] Input validation (Zod schemas)
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS protection (React escaping)
- [ ] CSRF protection (if needed)
- [ ] Secrets management (not in git)
- [ ] Audit logging
- [ ] Regular penetration testing

**Deployment**:
- [ ] Docker image build
- [ ] Environment configuration
- [ ] Database migration
- [ ] API server launch
- [ ] Mobile app submission (TestFlight/Google Play beta)

**Time Estimate**: 2 days

---

## Critical Path Summary

```
Week 1-2: Auth + DB + Zynta (5 days)
  └─ Blocker resolved: Can't proceed without these

Week 3-4: Wallets + Transfers (6 days)
  └─ Can demo first transaction

Week 5-6: Mobile UI + Cards (5 days)
  └─ Users can interact via mobile

Week 7: KYC + Polish (5 days)
  └─ Full compliance features ready

Week 8: Testing + Deployment (5 days)
  └─ Ready for production launch
```

---

## Success Metrics

### Week 1-2
- [ ] Backend running locally
- [ ] All auth endpoints passing tests
- [ ] Database seeded with test data

### Week 3-4
- [ ] Complete P2P transfer flow (happy path)
- [ ] Bank transfers integrated with Zynta
- [ ] Webhook handling tested

### Week 5-6
- [ ] Mobile app runs on iOS & Android simulators
- [ ] All core screens implemented
- [ ] Navigation works smoothly

### Week 7
- [ ] KYC screen integrated with Smile Identity
- [ ] UI passes accessibility audit
- [ ] Error handling comprehensive

### Week 8
- [ ] 100+ unit & integration tests passing
- [ ] Load test: 100 concurrent users, <200ms response
- [ ] Security audit: 0 critical issues
- [ ] Ready for beta launch

---

## Dependencies

### External Services
- Zynta Last-Mile API
- Smile Identity
- Firebase/Twilio (SMS)
- SendGrid (Email)
- AWS S3 / Cloudinary (Storage)

### Key Libraries
- Backend: Express, Drizzle, PostgreSQL, Bull, JWT
- Mobile: React Native, Expo, Zustand, React Query
- Both: Axios, Zod (validation)

---

## Contingency Plan

If any phase runs 2+ days behind:
1. Reduce scope (defer nice-to-have features)
2. Extend timeline by 1 week
3. Focus on core happy paths over edge cases
4. Defer KYC tier 2 upgrade (launch with tier 1 only)
5. Defer physical card (virtual only in MVP)

---

## Post-MVP Roadmap

**Month 2-3**:
- Physical card delivery
- Merchant payment links
- Investment/savings products
- Bill payments (utilities, mobile recharge)

**Month 4+**:
- API for partner integrations
- Admin dashboard
- Advanced analytics
- Referral program
- International expansion

