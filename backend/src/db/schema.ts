import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  json,
  uuid,
  primaryKey,
  foreignKey,
  uniqueIndex,
  index,
  decimal
} from 'drizzle-orm/pg-core';

// ============================================
// Users Table
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('user').notNull(), // user, merchant, admin
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, active, suspended, deactivated
  kycStatus: varchar('kyc_status', { length: 20 }).default('not_started').notNull(),
  kycTier: varchar('kyc_tier', { length: 20 }).default('tier_0').notNull(),
  emailVerified: boolean('email_verified').default(false),
  phoneVerified: boolean('phone_verified').default(false),
  profileImageUrl: text('profile_image_url'),
  dateOfBirth: varchar('date_of_birth', { length: 10 }),
  nationality: varchar('nationality', { length: 100 }),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  phoneIdx: index('users_phone_idx').on(table.phone),
  statusIdx: index('users_status_idx').on(table.status),
  kycStatusIdx: index('users_kyc_status_idx').on(table.kycStatus),
}));

// ============================================
// User Profiles Table
// ============================================

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  preferredLanguage: varchar('preferred_language', { length: 10 }).default('en'),
  preferredCurrency: varchar('preferred_currency', { length: 3 }).default('USD'),
  notificationSettings: json('notification_settings').$type<{
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    transactionAlerts: boolean;
    marketingEmails: boolean;
  }>(),
  privacySettings: json('privacy_settings').$type<{
    showOnlineStatus: boolean;
    allowContactRequests: boolean;
    profileVisibility: 'public' | 'private' | 'friends';
  }>(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'user_profiles_user_id_fk'
  }).onDelete('cascade'),
}));

// ============================================
// Wallets Table
// ============================================

export const wallets = pgTable('wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  currency: varchar('currency', { length: 3 }).notNull(), // USD, NGN, GBP, EUR, XOF
  balance: bigint('balance', { mode: 'number' }).default(0).notNull(), // In smallest unit (cents/kobo)
  availableBalance: bigint('available_balance', { mode: 'number' }).default(0).notNull(),
  reservedBalance: bigint('reserved_balance', { mode: 'number' }).default(0).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  accountNumber: varchar('account_number', { length: 20 }),
  accountName: varchar('account_name', { length: 255 }),
  bankCode: varchar('bank_code', { length: 10 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'wallets_user_id_fk'
  }).onDelete('cascade'),
  userCurrencyIdx: uniqueIndex('wallets_user_currency_idx').on(table.userId, table.currency),
  userIdIdx: index('wallets_user_id_idx').on(table.userId),
  statusIdx: index('wallets_status_idx').on(table.status),
}));

// ============================================
// Cards Table
// ============================================

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  walletId: uuid('wallet_id').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // virtual, physical
  status: varchar('status', { length: 20 }).default('active').notNull(),
  cardNumber: varchar('card_number', { length: 255 }).notNull(), // Encrypted
  cardNumberLastFour: varchar('card_number_last_four', { length: 4 }).notNull(),
  expiryMonth: integer('expiry_month').notNull(),
  expiryYear: integer('expiry_year').notNull(),
  cvv: varchar('cvv', { length: 255 }).notNull(), // Encrypted
  holderName: varchar('holder_name', { length: 255 }).notNull(),
  issuer: varchar('issuer', { length: 100 }).notNull(),
  cardBrand: varchar('card_brand', { length: 20 }).notNull(), // visa, mastercard
  dailyLimit: bigint('daily_limit', { mode: 'number' }).notNull(),
  monthlyLimit: bigint('monthly_limit', { mode: 'number' }).notNull(),
  spentToday: bigint('spent_today', { mode: 'number' }).default(0),
  spentThisMonth: bigint('spent_this_month', { mode: 'number' }).default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  activatedAt: timestamp('activated_at'),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'cards_user_id_fk'
  }).onDelete('cascade'),
  walletIdFk: foreignKey({
    columns: [table.walletId],
    foreignColumns: [wallets.id],
    name: 'cards_wallet_id_fk'
  }).onDelete('cascade'),
  userIdIdx: index('cards_user_id_idx').on(table.userId),
  statusIdx: index('cards_status_idx').on(table.status),
  lastFourIdx: index('cards_last_four_idx').on(table.cardNumberLastFour),
}));

// ============================================
// Transactions Table
// ============================================

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletId: uuid('wallet_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(), // p2p_send, bank_transfer_send, card_funding, etc.
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  description: text('description'),
  reference: varchar('reference', { length: 255 }).notNull().unique(),
  idempotencyKey: varchar('idempotency_key', { length: 255 }).unique(),
  metadata: json('metadata'),
  fees: json('fees').$type<{
    platform: number;
    bank: number;
    total: number;
  }>(),
  relatedTransactionId: uuid('related_transaction_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  walletIdFk: foreignKey({
    columns: [table.walletId],
    foreignColumns: [wallets.id],
    name: 'transactions_wallet_id_fk'
  }).onDelete('cascade'),
  walletIdIdx: index('transactions_wallet_id_idx').on(table.walletId),
  referenceIdx: uniqueIndex('transactions_reference_idx').on(table.reference),
  statusIdx: index('transactions_status_idx').on(table.status),
  createdAtIdx: index('transactions_created_at_idx').on(table.createdAt),
}));

// ============================================
// KYC Submissions Table
// ============================================

export const kycSubmissions = pgTable('kyc_submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tier: varchar('tier', { length: 20 }).notNull(), // tier_0, tier_1, tier_2, tier_3
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(), // passport, national_id, driver_license
  documentImageUrl: text('document_image_url').notNull(),
  livenessCheckUrl: text('liveness_check_url'),
  smileIdentityReference: varchar('smile_identity_reference', { length: 255 }),
  verificationResult: json('verification_result'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: uuid('reviewed_by'),
  rejectionReason: text('rejection_reason'),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'kyc_submissions_user_id_fk'
  }).onDelete('cascade'),
  userIdIdx: index('kyc_submissions_user_id_idx').on(table.userId),
  statusIdx: index('kyc_submissions_status_idx').on(table.status),
  tierIdx: index('kyc_submissions_tier_idx').on(table.tier),
}));

// ============================================
// Compliance Flags Table
// ============================================

export const complianceFlags = pgTable('compliance_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  reason: varchar('reason', { length: 50 }).notNull(), // sanctions_hit, pep_match, fuzzy_match, document_issue, etc.
  details: json('details').$type<Record<string, any>>().notNull(),
  actionTaken: text('action_taken'),
  flaggedAt: timestamp('flagged_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
  resolvedBy: uuid('resolved_by'),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'compliance_flags_user_id_fk'
  }).onDelete('cascade'),
  userIdIdx: index('compliance_flags_user_id_idx').on(table.userId),
  statusIdx: index('compliance_flags_status_idx').on(table.status),
  reasonIdx: index('compliance_flags_reason_idx').on(table.reason),
}));

// ============================================
// Devices Table
// ============================================

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  fingerprint: varchar('fingerprint', { length: 255 }).notNull().unique(),
  userAgent: text('user_agent').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  deviceName: varchar('device_name', { length: 255 }),
  isVerified: boolean('is_verified').default(false),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'devices_user_id_fk'
  }).onDelete('cascade'),
  userIdIdx: index('devices_user_id_idx').on(table.userId),
  fingerprintIdx: uniqueIndex('devices_fingerprint_idx').on(table.fingerprint),
}));

// ============================================
// Merchants Table
// ============================================

export const merchants = pgTable('merchants', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  businessType: varchar('business_type', { length: 100 }).notNull(),
  businessRegistration: varchar('business_registration', { length: 255 }).notNull(),
  contactEmail: varchar('contact_email', { length: 255 }).notNull(),
  contactPhone: varchar('contact_phone', { length: 20 }).notNull(),
  website: text('website'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'merchants_user_id_fk'
  }).onDelete('cascade'),
  userIdIdx: uniqueIndex('merchants_user_id_idx').on(table.userId),
}));

// ============================================
// Payment Links Table
// ============================================

export const paymentLinks = pgTable('payment_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  merchantId: uuid('merchant_id').notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  description: text('description'),
  redirectUrl: text('redirect_url'),
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').default(false),
  usedAt: timestamp('used_at'),
  usedByUserId: uuid('used_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  merchantIdFk: foreignKey({
    columns: [table.merchantId],
    foreignColumns: [merchants.id],
    name: 'payment_links_merchant_id_fk'
  }).onDelete('cascade'),
  merchantIdIdx: index('payment_links_merchant_id_idx').on(table.merchantId),
  isUsedIdx: index('payment_links_is_used_idx').on(table.isUsed),
}));

// ============================================
// Audit Logs Table
// ============================================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }).notNull(),
  resourceId: varchar('resource_id', { length: 255 }).notNull(),
  changes: json('changes'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  status: varchar('status', { length: 20 }).notNull(), // success, failure
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'audit_logs_user_id_fk'
  }).onDelete('set null'),
  userIdIdx: index('audit_logs_user_id_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  resourceIdx: index('audit_logs_resource_idx').on(table.resource),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// ============================================
// Contacts Table (for P2P transfers)
// ============================================

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  contactUserId: uuid('contact_user_id').notNull(),
  nickname: varchar('nickname', { length: 255 }),
  isBlocked: boolean('is_blocked').default(false),
  addedAt: timestamp('added_at').defaultNow().notNull(),
}, (table) => ({
  userIdFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: 'contacts_user_id_fk'
  }).onDelete('cascade'),
  contactUserIdFk: foreignKey({
    columns: [table.contactUserId],
    foreignColumns: [users.id],
    name: 'contacts_contact_user_id_fk'
  }).onDelete('cascade'),
  userIdIdx: index('contacts_user_id_idx').on(table.userId),
  userContactIdIdx: uniqueIndex('contacts_user_contact_id_idx').on(table.userId, table.contactUserId),
}));

// Export all tables as a schema
export const schema = {
  users,
  userProfiles,
  wallets,
  cards,
  transactions,
  kycSubmissions,
  complianceFlags,
  devices,
  merchants,
  paymentLinks,
  auditLogs,
  contacts
};
