import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { logger } from '@/utils/logger';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export const cryptoService = {
  /**
   * Hash password with bcrypt
   */
  hashPassword: async (password: string): Promise<string> => {
    try {
      // Validate password strength
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      return hashed;
    } catch (error) {
      logger.error('Password hashing failed', error);
      throw new Error('Failed to hash password');
    }
  },

  /**
   * Compare password with hash
   */
  comparePassword: async (password: string, hash: string): Promise<boolean> => {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password comparison failed', error);
      return false;
    }
  },

  /**
   * Generate random OTP (6 digits)
   */
  generateOTP: (length: number = 6): string => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return otp;
  },

  /**
   * Generate secure random token
   */
  generateToken: (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
  },

  /**
   * Generate device fingerprint from attributes
   * Combines: user-agent, platform, architecture
   */
  generateDeviceFingerprint: (userAgent: string): string => {
    const fingerprint = `${userAgent}`;
    return crypto
      .createHash('sha256')
      .update(fingerprint)
      .digest('hex');
  },

  /**
   * Hash sensitive data (PII)
   */
  hashSensitiveData: (data: string): string => {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  },

  /**
   * Encrypt sensitive data (AES-256-GCM)
   * Returns: iv:encryptedData:authTag
   */
  encryptSensitiveData: (data: string): string => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || encryptionKey.length !== 32) {
      logger.warn('ENCRYPTION_KEY not properly configured, using hash instead');
      return cryptoService.hashSensitiveData(data);
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  },

  /**
   * Decrypt sensitive data (AES-256-GCM)
   */
  decryptSensitiveData: (encrypted: string): string => {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      logger.warn('ENCRYPTION_KEY not configured, cannot decrypt');
      return encrypted;
    }

    try {
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');

      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', error);
      throw new Error('Failed to decrypt data');
    }
  },

  /**
   * Verify password strength
   */
  validatePasswordStrength: (password: string): {
    isStrong: boolean;
    feedback: string[];
  } => {
    const feedback: string[] = [];

    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      feedback.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      feedback.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      feedback.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      feedback.push('Password must contain at least one special character');
    }

    return {
      isStrong: feedback.length === 0,
      feedback
    };
  }
};

/**
 * Type for encrypted data format
 */
export type EncryptedData = string; // Format: iv:encryptedData:authTag
