import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { createModuleLogger } from '@/utils/logger';

const log = createModuleLogger('ZyntaClient');

// ─────────────────────────────────────────────────────────────────────────────
// Zynta Last-Mile API Client
//
// Auth:    x-api-key: sk_test_... (sandbox) | sk_live_... (production)
// Base:    https://zynta-lastmile-infrastructure-api-staging.up.railway.app/api/v1
//
// Flow for a bank payout (off-ramp):
//   1. POST /recipients/individual  — register recipient (once per person)
//   2. POST /quotes                 — get FX rate + locked amount
//   3. POST /off-ramp               — create transfer with quoteId
//   4. Optionally: source="partner_pool" draws from JetrPay's DFNS pool
//   5. Webhook: transfer.completed / transfer.failed
// ─────────────────────────────────────────────────────────────────────────────

export interface ZyntaConfig {
  apiKey: string;
  baseUrl: string;
  webhookSecret: string;
}

// ── Recipients ────────────────────────────────────────────────────────────────

export interface CreateRecipientRequest {
  clientReference: string;        // your internal ID for this person
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;            // YYYY-MM-DD
  country: string;                // ISO alpha-2, e.g. "NG"
  idType: string;                 // e.g. "NIN", "BVN", "PASSPORT"
  idNumber: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  bankAccount: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode: string;
    currency: string;             // e.g. "NGN"
    country: string;
  };
}

export interface RecipientResponse {
  recipientId: string;
  clientReference: string;
  kycStatus: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED';
  walletAddress: string | null;
  createdAt: string;
}

// ── Quotes ────────────────────────────────────────────────────────────────────

export interface CreateQuoteRequest {
  recipientId: string;
  direction: 'OFF_RAMP' | 'ON_RAMP';
  sourceAsset: 'USDC' | 'USDT';
  sourceChain: 'TRON' | 'ETHEREUM' | 'BASE' | 'BSC' | 'SOLANA';
  notionalAmount: number;         // amount of crypto to send
  destinationCurrency: 'NGN' | 'KES' | 'GHS';
  destinationCountry: string;
  deliveryRail: 'BANK_TRANSFER';
}

export interface QuoteResponse {
  quoteId: string;
  direction: string;
  rateType: 'indicative' | 'locked';
  sourceAsset: string;
  sourceChain: string;
  sourceAmount: number;
  destinationCurrency: string;
  destinationAmount: number;      // what recipient gets (fees already embedded)
  rate: number;                   // effective rate with fees included
  deliveryEtaMinutes: number;
  expiresAt: string;
  createdAt: string;
}

// ── Off-ramp ──────────────────────────────────────────────────────────────────

export interface CreateOffRampRequest {
  quoteId: string;
  recipientId: string;
  clientReference?: string;
  source?: 'external' | 'custody' | 'partner_pool' | 'fiat';
}

export interface OffRampResponse {
  transferId: string;
  direction: 'OFF_RAMP';
  source: string;
  status: 'AWAITING_DEPOSIT' | 'PROCESSING' | 'SWEEPING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  message?: string;
  fundingInstructions?: {
    depositAddress: string | null;
    network: string | null;
    asset: string | null;
    amount: number | null;
    expiresAt: string | null;
  };
  sourceAsset: string;
  sourceChain: string;
  sourceAmount: number;
  destinationCurrency: string;
  destinationAmount: number;
  provider: string;
  createdAt: string;
}

// ── Webhook event shapes ──────────────────────────────────────────────────────

export interface ZyntaWebhookEvent {
  eventType:
    | 'transfer.created'
    | 'transfer.completed'
    | 'transfer.failed'
    | 'transfer.expired'
    | 'balance.topup_received'
    | 'balance.low';
  payload: {
    transferId?: string;
    partnerId: string;
    direction?: string;
    status?: string;
    amount?: number;
    currency?: string;
    clientReference?: string;
    failureReason?: string;
    environment: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ZyntaClient
// ─────────────────────────────────────────────────────────────────────────────

export class ZyntaClient {
  private http: AxiosInstance;
  private config: ZyntaConfig;

  constructor(config: ZyntaConfig) {
    this.config = config;

    this.http = axios.create({
      baseURL: config.baseUrl,
      timeout: 30_000,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,      // Zynta uses x-api-key, not Bearer
        'User-Agent': 'JetrPay/1.0.0',
      },
    });

    this.http.interceptors.response.use(
      (res) => {
        log.debug({ method: res.config.method, url: res.config.url, status: res.status });
        return res;
      },
      (err) => {
        log.error({
          url: err.config?.url,
          status: err.response?.status,
          body: err.response?.data,
        }, 'Zynta API error');
        return Promise.reject(err);
      },
    );
  }

  // ── Recipients ─────────────────────────────────────────────────────────────

  async createRecipient(
    payload: CreateRecipientRequest,
    idempotencyKey: string,
  ): Promise<RecipientResponse> {
    const res = await this.request('post', '/recipients/individual', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data.data ?? res.data;
  }

  async getRecipient(recipientId: string): Promise<RecipientResponse> {
    const res = await this.request('get', `/recipients/${recipientId}`);
    return res.data.data ?? res.data;
  }

  // ── Quotes ─────────────────────────────────────────────────────────────────

  async createQuote(
    payload: CreateQuoteRequest,
    idempotencyKey: string,
  ): Promise<QuoteResponse> {
    const res = await this.request('post', '/quotes', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    const d = res.data.data ?? res.data;
    return {
      quoteId:             d.quoteId ?? d.id,
      direction:           d.direction,
      rateType:            d.rateType,
      sourceAsset:         d.sourceAsset,
      sourceChain:         d.sourceChain,
      sourceAmount:        Number(d.sourceAmount),
      destinationCurrency: d.destinationCurrency,
      destinationAmount:   Number(d.destinationAmount), // net — fees embedded
      rate:                Number(d.rate),              // effective rate
      deliveryEtaMinutes:  d.deliveryEtaMinutes,
      expiresAt:           d.expiresAt,
      createdAt:           d.createdAt,
    };
  }

  async getQuote(quoteId: string): Promise<QuoteResponse> {
    const res = await this.request('get', `/quotes/${quoteId}`);
    return res.data.data ?? res.data;
  }

  // ── Off-ramp ───────────────────────────────────────────────────────────────

  async createOffRamp(
    payload: CreateOffRampRequest,
    idempotencyKey: string,
  ): Promise<OffRampResponse> {
    const res = await this.request('post', '/off-ramp', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return res.data.data ?? res.data;
  }

  async getOffRamp(transferId: string): Promise<OffRampResponse> {
    const res = await this.request('get', `/off-ramp/${transferId}`);
    return res.data.data ?? res.data;
  }

  async getOffRampTimeline(transferId: string): Promise<any[]> {
    const res = await this.request('get', `/off-ramp/${transferId}/timeline`);
    return res.data.data ?? [];
  }

  // ── Webhook verification ───────────────────────────────────────────────────

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.config.webhookSecret || !signature) return false;
    const crypto = require('crypto');
    const digest = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
    } catch {
      return false;
    }
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async request(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ) {
    try {
      return await this.http.request({ method, url, data, ...config });
    } catch (err: any) {
      const status = err.response?.status;
      const body = err.response?.data;
      const message = body?.message || body?.error || err.message || 'Zynta API error';
      const e = new Error(`Zynta: ${message}`) as any;
      e.code = body?.code ?? 'ZYNTA_ERROR';
      e.statusCode = status ?? 502;
      e.originalError = body;
      throw e;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton factory
// ─────────────────────────────────────────────────────────────────────────────

let _instance: ZyntaClient | null = null;

export function getZyntaClient(): ZyntaClient {
  if (!_instance) {
    const apiKey = process.env.ZYNTA_API_KEY;
    if (!apiKey) throw new Error('ZYNTA_API_KEY is not set');

    _instance = new ZyntaClient({
      apiKey,
      baseUrl: process.env.ZYNTA_API_URL ?? 'https://zynta-lastmile-infrastructure-api-staging.up.railway.app/api/v1',
      webhookSecret: process.env.ZYNTA_WEBHOOK_SECRET ?? '',
    });

    log.info('Zynta client ready');
  }
  return _instance;
}
