# JetRPay Database Schema

---

## Database Overview

- **Engine**: PostgreSQL 14+
- **ORM**: Drizzle ORM
- **Migration Tool**: Drizzle Kit
- **Backup**: Daily snapshots, 30-day retention
- **Replication**: Read replicas for analytics

---

## Core Tables

### 1. Users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  
  -- Profile
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  nationality VARCHAR(2) -- ISO 3166-1 alpha-2
  gender VARCHAR(10) -- 'male', 'female', 'other'
  
  -- KYC & Compliance
  kyc_level INTEGER DEFAULT 0, -- 0=unverified, 1=basic, 2=full, 3=premium
  kyc_verified_at TIMESTAMP,
  kyc_submitted_at TIMESTAMP,
  compliance_status VARCHAR(50) DEFAULT 'clean', -- clean, pending_review, flagged, blocked
  sanctions_checked_at TIMESTAMP,
  
  -- Security
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_secret VARCHAR(255), -- TOTP secret (encrypted)
  pin_hash VARCHAR(255), -- 4-6 digit PIN
  biometric_enabled BOOLEAN DEFAULT FALSE,
  
  -- Account Status
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, closed
  account_closed_at TIMESTAMP,
  account_closed_reason VARCHAR(255),
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
  
  -- Indexes
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_users_phone ON users(phone_number);
  CREATE INDEX idx_users_kyc_level ON users(kyc_level);
  CREATE INDEX idx_users_status ON users(status);
  CREATE INDEX idx_users_created_at ON users(created_at DESC);
);
```

### 2. Wallets

```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Wallet Details
  currency_code VARCHAR(3) NOT NULL, -- USD, EUR, GBP, NGN, ZAR, etc.
  balance NUMERIC(20, 8) DEFAULT 0,
  available_balance NUMERIC(20, 8) DEFAULT 0, -- excluding holds/freezes
  
  -- Account Info
  account_name VARCHAR(255), -- For bank transfers
  iban VARCHAR(34), -- For EU/UK wallets
  bank_code VARCHAR(10), -- For specific regions
  account_number VARCHAR(34),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, frozen, closed
  is_primary BOOLEAN DEFAULT FALSE, -- Main wallet for user
  
  -- Limits
  daily_limit NUMERIC(20, 8), -- User's daily transaction limit
  monthly_limit NUMERIC(20, 8),
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(user_id, currency_code),
  
  -- Indexes
  CREATE INDEX idx_wallets_user_id ON wallets(user_id);
  CREATE INDEX idx_wallets_currency ON wallets(currency_code);
  CREATE INDEX idx_wallets_status ON wallets(status);
);
```

### 3. Cards

```sql
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  
  -- Card Details
  card_type VARCHAR(50) NOT NULL, -- 'virtual', 'physical'
  card_brand VARCHAR(50), -- 'visa', 'mastercard'
  card_number_token VARCHAR(255), -- Tokenized, not full number
  last_four VARCHAR(4), -- Display only
  cvv_token VARCHAR(255), -- Tokenized
  expiry_month INTEGER,
  expiry_year INTEGER,
  
  -- Cardholder
  cardholder_name VARCHAR(255) NOT NULL,
  
  -- Physical Card
  shipping_address VARCHAR(500),
  tracking_number VARCHAR(255),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  
  -- Spending Limits
  daily_limit NUMERIC(20, 8),
  monthly_limit NUMERIC(20, 8),
  single_transaction_limit NUMERIC(20, 8),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, frozen, lost_reported, closed
  frozen_at TIMESTAMP,
  frozen_reason VARCHAR(255),
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_cards_user_id ON cards(user_id);
  CREATE INDEX idx_cards_status ON cards(status);
  CREATE INDEX idx_cards_created_at ON cards(created_at DESC);
);
```

### 4. Transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Transaction Details
  type VARCHAR(50) NOT NULL, -- p2p, bank_transfer, card_spend, bill_payment, etc.
  subtype VARCHAR(50), -- transfer_in, transfer_out, card_debit, etc.
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, reversed
  
  -- Parties Involved
  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),
  to_user_id UUID REFERENCES users(id), -- For P2P
  to_phone_number VARCHAR(20), -- For P2P without user account
  to_email VARCHAR(255), -- For P2P
  
  -- Bank Transfer Details
  bank_code VARCHAR(10),
  account_number VARCHAR(34),
  account_name VARCHAR(255),
  bank_name VARCHAR(255),
  
  -- Card Transaction
  card_id UUID REFERENCES cards(id),
  merchant_name VARCHAR(255),
  merchant_category VARCHAR(50),
  
  -- Amount & Currency
  amount NUMERIC(20, 8) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  fee NUMERIC(20, 8) DEFAULT 0,
  exchange_rate NUMERIC(20, 8) DEFAULT 1, -- For multi-currency
  net_amount NUMERIC(20, 8), -- amount + fee
  
  -- External References
  zynta_transaction_id VARCHAR(255), -- From Zynta Last-Mile
  zynta_settlement_id VARCHAR(255),
  ledger_tx_id VARCHAR(255), -- Ledger-specific ID
  idempotency_key VARCHAR(255) UNIQUE, -- For idempotency
  
  -- Description
  description VARCHAR(500),
  reference_number VARCHAR(255),
  
  -- Failure Details
  failure_reason VARCHAR(255),
  failure_code VARCHAR(50),
  
  -- Timeline
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  
  -- Audit
  ip_address INET,
  device_id VARCHAR(255),
  location VARCHAR(255),
  
  -- Indexes
  CREATE INDEX idx_transactions_user_id ON transactions(user_id);
  CREATE INDEX idx_transactions_status ON transactions(status);
  CREATE INDEX idx_transactions_type ON transactions(type);
  CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
  CREATE INDEX idx_transactions_zynta_id ON transactions(zynta_transaction_id);
  CREATE INDEX idx_transactions_idempotency ON transactions(idempotency_key);
);
```

### 5. KYC Submissions

```sql
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Submission Details
  kyc_level INTEGER NOT NULL, -- Which tier (1 or 2)
  submission_type VARCHAR(50), -- initial, upgrade
  
  -- Document Details
  id_document_type VARCHAR(50), -- passport, national_id, drivers_license
  id_document_number VARCHAR(100),
  id_document_url VARCHAR(500), -- S3/Cloudinary URL
  
  -- Biometrics
  selfie_url VARCHAR(500), -- Liveness check photo
  
  -- Smile Identity Integration
  smile_identity_id VARCHAR(255), -- Smile verification ID
  smile_status VARCHAR(50), -- Verified, PartiallyVerified, PendingReview, Rejected
  smile_error_message VARCHAR(500),
  
  -- Sanctions & PEP Screening
  sanctions_checked BOOLEAN DEFAULT FALSE,
  sanctions_status VARCHAR(50), -- clear, hit, pending
  pep_screening_done BOOLEAN DEFAULT FALSE,
  pep_status VARCHAR(50), -- clear, match
  pep_match_names TEXT[], -- Names that matched
  
  -- Manual Review (if needed)
  manual_review_required BOOLEAN DEFAULT FALSE,
  reviewed_by_admin_id UUID,
  reviewed_at TIMESTAMP,
  review_notes VARCHAR(1000),
  
  -- Approval
  approved BOOLEAN DEFAULT FALSE,
  approved_at TIMESTAMP,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_kyc_user_id ON kyc_submissions(user_id);
  CREATE INDEX idx_kyc_status ON kyc_submissions(smile_status);
  CREATE INDEX idx_kyc_level ON kyc_submissions(kyc_level);
);
```

### 6. Devices

```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Device Details
  device_id VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255), -- iPhone, Samsung Galaxy, etc.
  device_type VARCHAR(50), -- mobile, web, tablet
  os_name VARCHAR(50), -- iOS, Android, Windows, macOS
  os_version VARCHAR(50),
  app_version VARCHAR(50),
  
  -- Device Fingerprinting
  fingerprint_hash VARCHAR(255), -- SHA-256 of device attributes
  ip_address INET,
  country_code VARCHAR(2),
  
  -- Trust Status
  is_trusted BOOLEAN DEFAULT FALSE,
  trust_token VARCHAR(255), -- For remembering device
  last_verified_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_devices_user_id ON devices(user_id);
  CREATE INDEX idx_devices_fingerprint ON devices(fingerprint_hash);
);
```

### 7. Contacts

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Contact Info
  contact_phone_number VARCHAR(20),
  contact_email VARCHAR(255),
  contact_name VARCHAR(255) NOT NULL,
  
  -- Relationship
  contact_user_id UUID REFERENCES users(id), -- If contact is a JetRPay user
  
  -- Metadata
  is_favorite BOOLEAN DEFAULT FALSE,
  transaction_count INTEGER DEFAULT 0,
  last_transaction_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_contacts_user_id ON contacts(user_id);
  CREATE INDEX idx_contacts_phone ON contacts(contact_phone_number);
);
```

### 8. Compliance Flags

```sql
CREATE TABLE compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id),
  
  -- Flag Type
  flag_type VARCHAR(50) NOT NULL, -- sanctions_hit, pep_match, unusual_activity, fraud_detected
  flag_severity VARCHAR(50), -- low, medium, high, critical
  
  -- Details
  description VARCHAR(500) NOT NULL,
  metadata JSONB, -- Additional context
  
  -- Response
  status VARCHAR(50) DEFAULT 'new', -- new, under_review, resolved, false_positive
  reviewed_by_admin_id UUID,
  review_notes VARCHAR(1000),
  reviewed_at TIMESTAMP,
  
  -- Action Taken
  action_taken VARCHAR(255), -- blocked, suspended, flagged, none
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_flags_user_id ON compliance_flags(user_id);
  CREATE INDEX idx_flags_status ON compliance_flags(status);
  CREATE INDEX idx_flags_severity ON compliance_flags(flag_severity);
);
```

### 9. Merchants

```sql
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Business Details
  business_name VARCHAR(255) NOT NULL,
  business_email VARCHAR(255) UNIQUE NOT NULL,
  business_phone VARCHAR(20),
  website_url VARCHAR(500),
  
  -- Account Owner
  owner_user_id UUID REFERENCES users(id),
  
  -- Merchant Category
  business_type VARCHAR(50), -- e-commerce, saas, services, etc.
  industry_category VARCHAR(50),
  
  -- Financial Details
  settlement_wallet_id UUID REFERENCES wallets(id),
  fee_percentage NUMERIC(5, 2), -- 0-100
  monthly_limit NUMERIC(20, 8),
  
  -- API Keys
  api_key_public VARCHAR(255) UNIQUE,
  api_key_secret VARCHAR(255), -- Encrypted
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255), -- For HMAC signing
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending_verification', -- pending_verification, active, suspended, closed
  verified_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_merchants_email ON merchants(business_email);
  CREATE INDEX idx_merchants_status ON merchants(status);
);
```

### 10. Payment Links

```sql
CREATE TABLE payment_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  
  -- Link Details
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(1000),
  
  -- Amount
  amount NUMERIC(20, 8) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  
  -- Configuration
  allow_custom_amount BOOLEAN DEFAULT FALSE,
  one_time BOOLEAN DEFAULT TRUE, -- Single use or reusable
  
  -- Usage Tracking
  usage_count INTEGER DEFAULT 0,
  revenue_generated NUMERIC(20, 8) DEFAULT 0,
  
  -- Expiry
  expires_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, expired, archived
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_payment_links_merchant_id ON payment_links(merchant_id);
  CREATE INDEX idx_payment_links_slug ON payment_links(slug);
);
```

### 11. Audit Logs

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES users(id),
  
  -- Action Details
  action VARCHAR(255) NOT NULL, -- login, create_wallet, create_card, etc.
  resource_type VARCHAR(50), -- user, transaction, card, etc.
  resource_id VARCHAR(255),
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent VARCHAR(500),
  
  -- Timestamp
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
  CREATE INDEX idx_audit_logs_action ON audit_logs(action);
  CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
);
```

### 12. Notifications

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification Type
  type VARCHAR(50) NOT NULL, -- transaction_received, card_approved, kyc_verified, etc.
  title VARCHAR(255) NOT NULL,
  body VARCHAR(1000) NOT NULL,
  
  -- Delivery Methods
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  push_sent BOOLEAN DEFAULT FALSE,
  
  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  
  -- Metadata
  related_transaction_id UUID REFERENCES transactions(id),
  action_url VARCHAR(500), -- Deep link
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes
  CREATE INDEX idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX idx_notifications_type ON notifications(type);
  CREATE INDEX idx_notifications_is_read ON notifications(is_read);
);
```

---

## Relationships Diagram

```
users (1) ──┬── (N) wallets
            ├── (N) cards
            ├── (N) transactions (as user_id)
            ├── (N) kyc_submissions
            ├── (N) devices
            ├── (N) contacts
            ├── (N) compliance_flags
            └── (N) notifications

wallets (1) ─┬── (N) cards
             ├── (N) transactions (from/to)
             └── (N) merchants (settlement_wallet_id)

cards (1) ────── (N) transactions

transactions (N) ── (1) merchants (optional)

merchants (1) ─┬── (N) payment_links
               └── (N) transactions (settlement)

kyc_submissions (N) ── (1) users
```

---

## Migration Strategy

### Phase 1: Core Schema
```sql
-- Run migrations in order:
001_create_users.sql
002_create_wallets.sql
003_create_cards.sql
004_create_transactions.sql
```

### Phase 2: Compliance
```sql
005_create_kyc_submissions.sql
006_create_compliance_flags.sql
007_create_audit_logs.sql
```

### Phase 3: Features
```sql
008_create_devices.sql
009_create_contacts.sql
010_create_merchants.sql
011_create_payment_links.sql
012_create_notifications.sql
```

---

## Data Types Reference

| PostgreSQL Type | Usage | Example |
|---|---|---|
| `UUID` | Primary/Foreign keys | user_id |
| `NUMERIC(20, 8)` | Money/Balance | balance: 1234.56789000 |
| `VARCHAR(n)` | Text (max n chars) | email, phone |
| `INET` | IP addresses | ip_address: 192.168.1.1 |
| `TIMESTAMP` | DateTime | created_at: 2026-04-28 10:30:00 |
| `BOOLEAN` | True/False | is_trusted, verified |
| `JSONB` | JSON data | metadata: {"country": "NG"} |
| `TEXT[]` | Array of strings | pep_match_names: ["John Smith", "J. Smith"] |
| `DATE` | Date only | date_of_birth: 1990-01-15 |

---

## Encryption at Rest

**PII Fields** (encrypted with AES-256):
- password_hash (via bcrypt)
- two_fa_secret
- pin_hash
- card_number_token
- cvv_token
- id_document_number
- api_key_secret

**Implementation**:
```javascript
// In Drizzle ORM custom types
const encryptedVarchar = customType({
  dataType() {
    return 'varchar(255)';
  },
  toDriver(value) {
    return encrypt(value); // AES-256
  },
  fromDriver(value) {
    return decrypt(value);
  }
});
```

---

## Backup & Recovery

- **Daily backup**: 3 AM UTC
- **Retention**: 30 days
- **RTO**: 1 hour
- **RPO**: 15 minutes
- **Test restore**: Weekly

---

## Performance Tuning

### Frequently Queried
- `user_id` + `status` (transactions list)
- `currency_code` (wallet balance)
- `created_at DESC` (recent activity)

### Slow Queries to Watch
- `transactions` with joins to `wallets` + `users`
- Large date range analytics
- `kyc_submissions` with `JSONB` queries

### Optimization
- Use read replicas for analytics
- Partition `transactions` by month
- Archive transactions > 2 years

