/**
 * Core TypeScript types for JetRPay platform
 */

// ============================================
// User & Authentication Types
// ============================================

export enum UserRole {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin'
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated'
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_CLARIFICATION = 'needs_clarification'
}

export enum KYCTier {
  TIER_0 = 'tier_0', // Unverified
  TIER_1 = 'tier_1', // Basic (email verified)
  TIER_2 = 'tier_2', // Full KYC
  TIER_3 = 'tier_3'  // Enhanced KYC
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: KYCStatus;
  kycTier: KYCTier;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImageUrl?: string;
  dateOfBirth?: string;
  nationality?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  preferredLanguage: string;
  preferredCurrency: string;
  notificationSettings: NotificationSettings;
  privacySettings: PrivacySettings;
  updatedAt: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  transactionAlerts: boolean;
  marketingEmails: boolean;
}

export interface PrivacySettings {
  showOnlineStatus: boolean;
  allowContactRequests: boolean;
  profileVisibility: 'public' | 'private' | 'friends';
}

// ============================================
// Wallet & Balance Types
// ============================================

export enum CurrencyCode {
  USD = 'USD',
  NGN = 'NGN',
  GBP = 'GBP',
  EUR = 'EUR',
  XOF = 'XOF'
}

export enum WalletStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CLOSED = 'closed'
}

export interface Wallet {
  id: string;
  userId: string;
  currency: CurrencyCode;
  balance: number; // In smallest unit (cents/kobo)
  availableBalance: number;
  reservedBalance: number;
  status: WalletStatus;
  accountNumber?: string; // For bank integration
  accountName?: string;
  bankCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  amount: number;
  transactionType: 'credit' | 'debit';
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  reference: string;
  relatedTransactionId?: string;
  createdAt: string;
}

// ============================================
// Transaction & Transfer Types
// ============================================

export enum TransactionType {
  P2P_SEND = 'p2p_send',
  P2P_RECEIVE = 'p2p_receive',
  BANK_TRANSFER_SEND = 'bank_transfer_send',
  BANK_TRANSFER_RECEIVE = 'bank_transfer_receive',
  CARD_ISSUANCE = 'card_issuance',
  CARD_FUNDING = 'card_funding',
  CARD_WITHDRAWAL = 'card_withdrawal',
  ATM_WITHDRAWAL = 'atm_withdrawal',
  FEE = 'fee',
  REVERSAL = 'reversal'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REVERSED = 'reversed',
  EXPIRED = 'expired'
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
  description: string;
  reference: string;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  fees?: {
    platform: number;
    bank: number;
    total: number;
  };
  relatedTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface P2PTransfer {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: CurrencyCode;
  status: TransactionStatus;
  description?: string;
  reference: string;
  senderTransactionId: string;
  recipientTransactionId: string;
  createdAt: string;
  completedAt?: string;
}

export interface BankTransfer {
  id: string;
  userId: string;
  amount: number;
  currency: CurrencyCode;
  recipientBank: string;
  recipientBankCode: string;
  recipientAccountNumber: string;
  recipientAccountName: string;
  status: TransactionStatus;
  reference: string;
  zyntaReference?: string;
  zyntaTransactionId?: string;
  fee: number;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

// ============================================
// Card Types
// ============================================

export enum CardType {
  VIRTUAL = 'virtual',
  PHYSICAL = 'physical'
}

export enum CardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  EXPIRED = 'expired'
}

export interface Card {
  id: string;
  userId: string;
  walletId: string;
  type: CardType;
  status: CardStatus;
  cardNumber: string; // Encrypted, last 4 stored separately
  cardNumberLastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string; // Encrypted
  holderName: string;
  issuer: string;
  cardBrand: 'visa' | 'mastercard';
  dailyLimit: number;
  monthlyLimit: number;
  spentToday: number;
  spentThisMonth: number;
  createdAt: string;
  activatedAt?: string;
  expiresAt: string;
}

// ============================================
// KYC & Compliance Types
// ============================================

export enum ComplianceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review',
  ESCALATED = 'escalated'
}

export enum ComplianceReason {
  SANCTIONS_HIT = 'sanctions_hit',
  PEP_MATCH = 'pep_match',
  FUZZY_MATCH = 'fuzzy_match',
  DOCUMENT_ISSUE = 'document_issue',
  MANUAL_REVIEW = 'manual_review',
  OTHER = 'other'
}

export interface KYCSubmission {
  id: string;
  userId: string;
  tier: KYCTier;
  status: KYCStatus;
  documentType: string; // passport, national_id, driver_license
  documentImageUrl: string;
  livenessCheckUrl?: string;
  smileIdentityReference?: string;
  verificationResult?: Record<string, any>;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface ComplianceFlag {
  id: string;
  userId: string;
  status: ComplianceStatus;
  reason: ComplianceReason;
  details: Record<string, any>;
  actionTaken?: string;
  flaggedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ============================================
// Device & Session Types
// ============================================

export interface Device {
  id: string;
  userId: string;
  fingerprint: string;
  userAgent: string;
  ipAddress: string;
  deviceName: string;
  isVerified: boolean;
  lastUsedAt: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  createdAt: string;
}

// ============================================
// Merchant Types
// ============================================

export interface Merchant {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  businessRegistration: string;
  contactEmail: string;
  contactPhone: string;
  website?: string;
  status: UserStatus;
  createdAt: string;
}

export interface PaymentLink {
  id: string;
  merchantId: string;
  amount: number;
  currency: CurrencyCode;
  description: string;
  redirectUrl?: string;
  expiresAt: string;
  isUsed: boolean;
  usedAt?: string;
  usedByUserId?: string;
  createdAt: string;
}

// ============================================
// Audit & Logging Types
// ============================================

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  createdAt: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    statusCode: number;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  timestamp: string;
}
