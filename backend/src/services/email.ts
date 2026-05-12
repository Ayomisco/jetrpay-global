import axios, { AxiosInstance } from 'axios';
import { logger, createModuleLogger } from '@/utils/logger';

const log = createModuleLogger('PlunkEmailService');

export interface PlunkEmailRequest {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PlunkEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class PlunkEmailService {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://next-api.useplunk.com/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    this.client.interceptors.response.use(
      (response) => {
        log.debug({
          message: 'Plunk API call successful',
          status: response.status,
          method: response.config.method
        });
        return response;
      },
      (error) => {
        log.error({
          message: 'Plunk API error',
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send email via Plunk
   */
  async sendEmail(request: PlunkEmailRequest): Promise<PlunkEmailResponse> {
    try {
      const response = await this.client.post('/send', {
        to: request.to,
        subject: request.subject,
        body: request.body,
        from: request.from || process.env.EMAIL_FROM || 'noreply@jetpay.io',
        replyTo: request.replyTo || process.env.EMAIL_REPLY_TO,
        tags: request.tags || [],
        metadata: request.metadata || {}
      });

      const data = response.data;

      // Check if Plunk considers it successful
      if (data.id || response.status === 200) {
        log.info({
          message: 'Email sent successfully',
          to: request.to,
          subject: request.subject,
          messageId: data.id
        });

        return {
          success: true,
          messageId: data.id || `msg_${Date.now()}`
        };
      }

      throw new Error(data.error || 'Unknown Plunk error');
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? error.response?.data?.error || error.message
        : error instanceof Error
        ? error.message
        : 'Unknown error';

      log.error({
        message: 'Failed to send email via Plunk',
        to: request.to,
        error: errorMessage
      });

      return {
        success: false,
        error: `Failed to send email: ${errorMessage}`
      };
    }
  }

  /**
   * Send OTP email
   */
  async sendOTPEmail(to: string, otp: string, expiryMinutes: number = 10): Promise<PlunkEmailResponse> {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2>JetRPay Verification</h2>
        </div>
        <div style="background-color: #f5f5f5; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
          <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Your verification code is:</p>
          <div style="background-color: white; border: 2px solid #2dd4bf; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #0f172a; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
          </div>
          <p style="color: #999; font-size: 12px;">This code expires in ${expiryMinutes} minutes.</p>
          <p style="color: #999; font-size: 12px; margin-top: 20px;">Never share this code with anyone.</p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999;">
          <p>© 2024 JetRPay. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Your JetRPay verification code: ${otp}`,
      body: htmlBody,
      tags: ['otp', 'verification'],
      metadata: { type: 'otp', expiryMinutes }
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, name: string): Promise<PlunkEmailResponse> {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2>Welcome to JetRPay!</h2>
        </div>
        <div style="background-color: #f5f5f5; padding: 30px;">
          <p>Hi ${name},</p>
          <p>Welcome to JetRPay - your modern fintech platform for instant transfers, multi-currency wallets, and secure payments.</p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0f172a; margin-top: 0;">Get Started</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Complete your profile</li>
              <li>Verify your identity (KYC)</li>
              <li>Add your first wallet</li>
              <li>Make your first transfer</li>
            </ul>
          </div>
          
          <p style="text-align: center;">
            <a href="https://app.jetpay.io/dashboard" style="background-color: #2dd4bf; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999;">
          <p>© 2024 JetRPay. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Welcome to JetRPay, ${name}!`,
      body: htmlBody,
      tags: ['welcome', 'onboarding'],
      metadata: { type: 'welcome' }
    });
  }

  /**
   * Send transaction notification
   */
  async sendTransactionEmail(
    to: string,
    type: 'sent' | 'received',
    amount: number,
    currency: string,
    recipient: string,
    reference: string
  ): Promise<PlunkEmailResponse> {
    const isSent = type === 'sent';
    const action = isSent ? 'sent to' : 'received from';
    const color = isSent ? '#ef4444' : '#22c55e';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0f172a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2>Transaction ${isSent ? 'Sent' : 'Received'}</h2>
        </div>
        <div style="background-color: #f5f5f5; padding: 30px;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${color};">
            <p style="color: #666; margin: 0 0 15px 0;">You have ${action} <strong>${recipient}</strong></p>
            <h2 style="color: #0f172a; margin: 10px 0; font-size: 28px;">
              ${isSent ? '-' : '+'}${amount.toFixed(2)} ${currency}
            </h2>
            <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">Reference: ${reference}</p>
          </div>
          
          <p style="text-align: center; margin-top: 20px;">
            <a href="https://app.jetpay.io/transactions/${reference}" style="background-color: #2dd4bf; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 14px;">View Details</a>
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999;">
          <p>© 2024 JetRPay. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to,
      subject: `Transaction ${type === 'sent' ? 'Sent' : 'Received'}: ${amount} ${currency}`,
      body: htmlBody,
      tags: ['transaction', type],
      metadata: { type: 'transaction', transactionType: type, reference }
    });
  }
}

/**
 * Create Plunk email service instance
 */
export function createPlunkEmailService(): PlunkEmailService {
  const apiKey = process.env.PLUNK_API_KEY;
  if (!apiKey) {
    throw new Error('PLUNK_API_KEY environment variable is not set');
  }

  return new PlunkEmailService(apiKey);
}

// Export singleton
let plunkInstance: PlunkEmailService | null = null;

export function getPlunkEmailService(): PlunkEmailService {
  if (!plunkInstance) {
    plunkInstance = createPlunkEmailService();
  }
  return plunkInstance;
}
