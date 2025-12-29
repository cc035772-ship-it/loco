/**
 * 🔐 CONFIGURATION MANAGER v31.3 SECURE 🔐
 * Enhanced security with validation and sanitization
 */

import dotenv from 'dotenv';
import { AdminConfig, TriggerConfig } from './src/types/types';
import * as crypto from 'crypto';

dotenv.config();

export class Config {
  // Kakao Credentials (sanitized)
  static readonly KAKAO_PHONE: string = this.sanitizeCredential(process.env.KAKAO_PHONE || '');
  static readonly KAKAO_PASSWORD: string = process.env.KAKAO_PASSWORD || '';
  static readonly KAKAO_EMAIL: string = this.sanitizeCredential(process.env.KAKAO_EMAIL || '');

  // Device Information
  static readonly DEVICE_UUID: string = process.env.DEVICE_UUID || this.generateSecureDeviceUUID();
  static readonly DEVICE_NAME: string = this.sanitizeInput(process.env.DEVICE_NAME || 'EnhancedKakaoClient');

  // Control Server (with validation)
  static readonly CONTROL_SERVER_URL: string = this.validateURL(
    process.env.CONTROL_SERVER_URL || 'http://localhost:3000/collect'
  );

  // Admin Configuration
  static readonly ADMIN_CONFIG: AdminConfig = {
    kakaoIds: (process.env.ADMIN_IDS || '')
      .split(',')
      .map(id => this.sanitizeInput(id))
      .filter(id => id.trim().length > 0),
    permissions: ['all']
  };

  // Command Prefix (sanitized)
  static readonly COMMAND_PREFIX: string = this.sanitizeInput(process.env.COMMAND_PREFIX || '!');

  // Security Configuration
  static readonly SECURITY_CONFIG = {
    encryptionEnabled: process.env.ENCRYPTION_ENABLED !== 'false',
    rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '10', 10),
    blockDurationMs: parseInt(process.env.BLOCK_DURATION_MS || '300000', 10),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000', 10), // 1 hour
    maxMessageLength: parseInt(process.env.MAX_MESSAGE_LENGTH || '10000', 10),
    antiDebugEnabled: process.env.ANTI_DEBUG_ENABLED !== 'false'
  };

  // Trigger Configuration
  static readonly TRIGGER_CONFIG: TriggerConfig = {
    triggers: {
      mention: {
        enabled: process.env.TRIGGER_MENTION === 'true',
        autoCollect: process.env.TRIGGER_MENTION_AUTO_COLLECT === 'true'
      },
      imageRead: {
        enabled: process.env.TRIGGER_IMAGE_READ === 'true',
        autoBlock: process.env.TRIGGER_IMAGE_AUTO_BLOCK === 'true',
        autoCollectIP: process.env.TRIGGER_IMAGE_AUTO_COLLECT_IP === 'true'
      },
      linkRead: {
        enabled: process.env.TRIGGER_LINK_READ === 'true',
        autoBlock: process.env.TRIGGER_LINK_AUTO_BLOCK === 'true',
        autoCollectIP: process.env.TRIGGER_LINK_AUTO_COLLECT_IP === 'true'
      }
    }
  };

  /**
   * Generate secure device UUID using crypto
   */
  private static generateSecureDeviceUUID(): string {
    const bytes = crypto.randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    const hex = bytes.toString('hex');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32)
    ].join('-');
  }

  /**
   * Sanitize input to prevent injection
   */
  private static sanitizeInput(input: string): string {
    return input
      .replace(/[<>'"`;\\]/g, '')
      .trim()
      .slice(0, 255);
  }

  /**
   * Sanitize credentials (remove whitespace and special chars)
   */
  private static sanitizeCredential(input: string): string {
    return input.trim().replace(/[\s<>'"`;\\]/g, '');
  }

  /**
   * Validate URL format
   */
  private static validateURL(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Invalid protocol');
      }
      return url;
    } catch (error) {
      console.warn(`[CONFIG] Invalid URL: ${url}, using default`);
      return 'http://localhost:3000/collect';
    }
  }

  /**
   * Validate configuration
   */
  static validate(): void {
    const errors: string[] = [];

    // Check credentials
    if (!this.KAKAO_PHONE && !this.KAKAO_EMAIL) {
      errors.push('KAKAO_PHONE or KAKAO_EMAIL must be set in .env file');
    }

    if (!this.KAKAO_PASSWORD) {
      errors.push('KAKAO_PASSWORD must be set in .env file');
    }

    // Validate password strength
    if (this.KAKAO_PASSWORD.length < 8) {
      console.warn('[CONFIG] ⚠️ Password is too short (minimum 8 characters recommended)');
    }

    // Validate device UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this.DEVICE_UUID)) {
      console.warn('[CONFIG] ⚠️ Device UUID format is invalid, using generated UUID');
    }

    // Validate security config
    if (this.SECURITY_CONFIG.maxRequestsPerMinute < 1) {
      errors.push('MAX_REQUESTS_PER_MINUTE must be at least 1');
    }

    if (this.SECURITY_CONFIG.blockDurationMs < 1000) {
      errors.push('BLOCK_DURATION_MS must be at least 1000ms');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    console.log('[CONFIG] ✓ Configuration validated successfully');
    console.log('[CONFIG] Security features:', {
      encryption: this.SECURITY_CONFIG.encryptionEnabled,
      rateLimit: this.SECURITY_CONFIG.rateLimitEnabled,
      antiDebug: this.SECURITY_CONFIG.antiDebugEnabled
    });
  }

  /**
   * Get masked configuration for logging
   */
  static getMaskedConfig(): any {
    return {
      KAKAO_PHONE: this.KAKAO_PHONE ? '[SET]' : '[NOT SET]',
      KAKAO_EMAIL: this.KAKAO_EMAIL ? '[SET]' : '[NOT SET]',
      KAKAO_PASSWORD: this.KAKAO_PASSWORD ? '[REDACTED]' : '[NOT SET]',
      DEVICE_UUID: this.DEVICE_UUID.slice(0, 8) + '...',
      DEVICE_NAME: this.DEVICE_NAME,
      CONTROL_SERVER_URL: this.CONTROL_SERVER_URL,
      ADMIN_COUNT: this.ADMIN_CONFIG.kakaoIds.length,
      COMMAND_PREFIX: this.COMMAND_PREFIX,
      SECURITY: this.SECURITY_CONFIG
    };
  }
}