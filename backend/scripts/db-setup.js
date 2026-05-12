'use strict';

/**
 * JetrPay Database Setup
 * Creates all JetrPay tables with IF NOT EXISTS — safe to re-run.
 *
 * Usage:
 *   DATABASE_URL=<url> node scripts/db-setup.js
 */

require('dotenv').config();
const postgres = require('postgres');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL is not set'); process.exit(1); }

const SCHEMA_SQL = `
-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email          VARCHAR(255) NOT NULL UNIQUE,
  phone          VARCHAR(20),
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           VARCHAR(20)  NOT NULL DEFAULT 'user',
  status         VARCHAR(20)  NOT NULL DEFAULT 'pending',
  kyc_status     VARCHAR(20)  NOT NULL DEFAULT 'not_started',
  kyc_tier       VARCHAR(20)  NOT NULL DEFAULT 'tier_0',
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  profile_image_url TEXT,
  date_of_birth  VARCHAR(10),
  nationality    VARCHAR(100),
  last_login_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_email_idx     ON users(email);
CREATE INDEX IF NOT EXISTS users_phone_idx     ON users(phone);
CREATE INDEX IF NOT EXISTS users_status_idx    ON users(status);
CREATE INDEX IF NOT EXISTS users_kyc_status_idx ON users(kyc_status);

-- ── Devices ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fingerprint VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS devices_user_id_idx     ON devices(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS devices_fingerprint_idx ON devices(fingerprint);

-- ── Wallets ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency     VARCHAR(10) NOT NULL,
  balance      BIGINT NOT NULL DEFAULT 0,
  available    BIGINT NOT NULL DEFAULT 0,
  reserved     BIGINT NOT NULL DEFAULT 0,
  account_name VARCHAR(255),
  status       VARCHAR(20) NOT NULL DEFAULT 'active',
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, currency)
);
CREATE INDEX IF NOT EXISTS wallets_user_id_idx  ON wallets(user_id);
CREATE INDEX IF NOT EXISTS wallets_currency_idx ON wallets(currency);
CREATE INDEX IF NOT EXISTS wallets_status_idx   ON wallets(status);

-- ── Transactions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id             UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  type                  VARCHAR(50) NOT NULL,
  direction             VARCHAR(10) NOT NULL DEFAULT 'debit',
  amount                BIGINT NOT NULL,
  currency              VARCHAR(10) NOT NULL,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  reference             VARCHAR(255) NOT NULL UNIQUE,
  description           TEXT,
  idempotency_key       VARCHAR(255) UNIQUE,
  related_transaction_id UUID REFERENCES transactions(id),
  fees                  JSONB,
  metadata              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_wallet_id_idx      ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS transactions_type_idx           ON transactions(type);
CREATE INDEX IF NOT EXISTS transactions_status_idx         ON transactions(status);
CREATE INDEX IF NOT EXISTS transactions_reference_idx      ON transactions(reference);
CREATE INDEX IF NOT EXISTS transactions_idempotency_idx    ON transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS transactions_created_at_idx     ON transactions(created_at DESC);

-- ── Contacts (saved payees) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                     VARCHAR(255) NOT NULL,
  email                    VARCHAR(255),
  phone                    VARCHAR(20),
  bank_code                VARCHAR(20),
  bank_name                VARCHAR(255),
  account_number           VARCHAR(50),
  account_name             VARCHAR(255),
  zynta_recipient_id       UUID,
  last_transfer_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts(user_id);

-- ── KYC Submissions ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier           VARCHAR(20) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending',
  document_type  VARCHAR(50),
  document_url   TEXT,
  selfie_url     TEXT,
  provider       VARCHAR(50),
  provider_ref   VARCHAR(255),
  failure_reason TEXT,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kyc_submissions_user_id_idx ON kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS kyc_submissions_status_idx  ON kyc_submissions(status);

-- ── Compliance Flags ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type   VARCHAR(50) NOT NULL,
  severity    VARCHAR(20) NOT NULL DEFAULT 'low',
  description TEXT,
  resolved    BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS compliance_flags_user_id_idx ON compliance_flags(user_id);
CREATE INDEX IF NOT EXISTS compliance_flags_resolved_idx ON compliance_flags(resolved);

-- ── Audit Logs ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(50),
  resource_id VARCHAR(255),
  changes     JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'success',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);

-- ── Cards ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  type            VARCHAR(20) NOT NULL DEFAULT 'virtual',
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  last_four       VARCHAR(4),
  expiry_month    VARCHAR(2),
  expiry_year     VARCHAR(4),
  network         VARCHAR(20) NOT NULL DEFAULT 'visa',
  daily_limit     BIGINT,
  monthly_limit   BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cards_user_id_idx ON cards(user_id);
CREATE INDEX IF NOT EXISTS cards_status_idx  ON cards(status);
`;

async function run() {
  const ssl = (() => {
    try {
      const host = new URL(connectionString).hostname.toLowerCase();
      const isLocal = ['localhost', '127.0.0.1', '::1'].includes(host);
      return isLocal ? false : 'require';
    } catch { return 'require'; }
  })();

  const sql = postgres(connectionString, { ssl, max: 1 });

  console.log(`Setting up JetrPay schema on: ${new URL(connectionString).hostname}`);
  console.log('─'.repeat(60));

  try {
    await sql.unsafe(SCHEMA_SQL);
    console.log('✓ All JetrPay tables created successfully');
  } catch (err) {
    console.error('❌ Schema setup failed:', err.message);
    await sql.end();
    process.exit(1);
  }

  await sql.end();
  console.log('Done.');
}

run().catch((err) => { console.error(err.message); process.exit(1); });
