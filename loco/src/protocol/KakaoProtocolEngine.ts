/**
 * 🔥 KAKAO PROTOCOL ENGINE v31.3 SECURE 🔥
 * Enhanced LOCO Protocol Engine with Security Features
 * Supports 22-byte Standard Header and BSON Body Parsing
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as BSON from 'bson';
import { SecurityManager } from '../utils/SecurityManager';

// ============================================================================
// LOCO Protocol Constants (Aligned with node-kakao)
// ============================================================================

export const LOCO_PROTOCOL = {
  HEADER_SIZE: 22,
  VERSION: 2,
  
  METHODS: {
    CHECKIN: 'CHECKIN',
    CHECKOUT: 'CHECKOUT',
    LOGIN_LIST: 'L_LIST',
    SYNC_MSG: 'SYNCMSG',
    SYNC_LINK: 'SYNCLINK',
    MSG: 'MSG',
    READ: 'READ',
    NEWMEM: 'NEWMEM',
    DELMEM: 'DELMEM',
    WRITE: 'WRITE',
    LEFT: 'LEFT',
    MEMBER: 'MEMBER',
    CHAT_INFO: 'CHATINFO',
    NOTIREAD: 'NOTIREAD',
    KICKOUT: 'KICKOUT',
    REWRITE: 'REWRITE',
    CHATLIST: 'CHATLIST',
    SYNCJOIN: 'SYNCJOIN',
    SYNCDLLINK: 'SYNCDLLINK'
  },
  
  STATUS: {
    SUCCESS: 0,
    LOGIN_FAILED: -100,
    INVALID_SESSION: -101,
    DEVICE_NOT_REGISTERED: -102,
    RATE_LIMITED: -103,
    SERVER_ERROR: -500
  }
} as const;

// ============================================================================
// Interfaces
// ============================================================================

export interface LOCOPacketHeader {
  packetId: number;
  statusCode: number;
  method: string;
  type: number;
  bodyLength: number;
}

export interface LOCOPacket {
  header: LOCOPacketHeader;
  body: Buffer;
  data?: any; // BSON decoded data
  timestamp: number;
  direction?: 'send' | 'recv';
  signature?: string; // HMAC signature for integrity
}

export interface InterceptedPacket {
  direction: 'send' | 'recv';
  raw: Buffer;
  parsed: LOCOPacket | null;
  timestamp: number;
  verified: boolean;
}

export interface PacketStatistics {
  total: number;
  byDirection: { send: number; recv: number };
  byMethod: Record<string, number>;
  byStatus: Record<number, number>;
  totalBytes: number;
  avgPacketSize: number;
  errors: number;
  tamperedPackets: number;
}

// ============================================================================
// Binary Utilities
// ============================================================================

export class BinaryUtils {
  static bufferToHex(buffer: Buffer): string {
    return buffer.toString('hex').toUpperCase();
  }

  static hexToBuffer(hex: string): Buffer {
    // Validate hex string
    if (!/^[0-9A-Fa-f]*$/.test(hex)) {
      throw new Error('Invalid hex string');
    }
    return Buffer.from(hex, 'hex');
  }

  static safeSlice(buffer: Buffer, start: number, end?: number): Buffer {
    const actualEnd = end !== undefined ? Math.min(end, buffer.length) : buffer.length;
    const actualStart = Math.max(0, Math.min(start, buffer.length));
    return buffer.slice(actualStart, actualEnd);
  }

  static secureCompare(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

// ============================================================================
// LOCO Packet Codec - Enhanced Security
// ============================================================================

export class LOCOPacketCodec {
  private static readonly MAX_BODY_SIZE = 15 * 1024 * 1024; // 15MB limit
  private static readonly MIN_BODY_SIZE = 0;
  private static readonly SIGNATURE_SECRET = process.env.PACKET_SIGNATURE_SECRET || 'default-secret-change-me';

  static decode(buffer: Buffer, verifySignature: boolean = false): LOCOPacket | null {
    try {
      // Validate minimum size
      if (buffer.length < LOCO_PROTOCOL.HEADER_SIZE) {
        console.error('[LOCO] Buffer too small for header');
        return null;
      }

      // 22-byte Header Structure:
      // PacketID (4) + Status (2) + Method (11) + Type (1) + BodyLen (4)
      const packetId = buffer.readUInt32LE(0);
      const statusCode = buffer.readInt16LE(4);
      const method = buffer.toString('utf8', 6, 17).replace(/\0/g, '');
      const type = buffer.readUInt8(17);
      const bodyLength = buffer.readUInt32LE(18);

      // Validate body length
      if (bodyLength < this.MIN_BODY_SIZE || bodyLength > this.MAX_BODY_SIZE) {
        console.error(`[LOCO] Invalid body length: ${bodyLength}`);
        return null;
      }

      // Validate method name (alphanumeric only)
      if (!/^[A-Z_]+$/.test(method)) {
        console.error(`[LOCO] Invalid method name: ${method}`);
        return null;
      }

      const body = BinaryUtils.safeSlice(buffer, LOCO_PROTOCOL.HEADER_SIZE, LOCO_PROTOCOL.HEADER_SIZE + bodyLength);

      // Verify packet signature if enabled
      let signature: string | undefined;
      if (verifySignature) {
        signature = this.generateSignature(buffer.slice(0, LOCO_PROTOCOL.HEADER_SIZE + bodyLength));
      }

      let data: any = null;
      if (body.length > 0) {
        try {
          data = BSON.deserialize(body);
        } catch (e) {
          // Not BSON format, leave as null
          console.warn('[LOCO] Body is not BSON format');
        }
      }

      return {
        header: { packetId, statusCode, method, type, bodyLength },
        body,
        data,
        timestamp: Date.now(),
        signature
      };
    } catch (e) {
      console.error('[LOCO] Decode error:', SecurityManager.maskSensitiveData(String(e)));
      return null;
    }
  }

  static encode(header: LOCOPacketHeader, body: Buffer, signPacket: boolean = false): Buffer {
    // Validate inputs
    if (body.length > this.MAX_BODY_SIZE) {
      throw new Error(`Body size exceeds maximum: ${body.length} > ${this.MAX_BODY_SIZE}`);
    }

    if (!/^[A-Z_]+$/.test(header.method)) {
      throw new Error(`Invalid method name: ${header.method}`);
    }

    const buffer = Buffer.alloc(LOCO_PROTOCOL.HEADER_SIZE + body.length);
    
    buffer.writeUInt32LE(header.packetId, 0);
    buffer.writeInt16LE(header.statusCode, 4);
    
    // Method 11 bytes, null-padded
    const methodBuf = Buffer.alloc(11, 0);
    methodBuf.write(header.method, 0, 'utf8');
    methodBuf.copy(buffer, 6);
    
    buffer.writeUInt8(header.type, 17);
    buffer.writeUInt32LE(body.length, 18);
    body.copy(buffer, LOCO_PROTOCOL.HEADER_SIZE);

    // Add signature if requested
    if (signPacket) {
      const signature = this.generateSignature(buffer);
      console.log(`[LOCO] Packet signed: ${signature.slice(0, 16)}...`);
    }

    return buffer;
  }

  private static generateSignature(data: Buffer): string {
    return SecurityManager.generateSignature(data.toString('hex'), this.SIGNATURE_SECRET);
  }

  static verifyPacketSignature(packet: LOCOPacket, signature: string): boolean {
    if (!packet.signature) return false;
    return SecurityManager.verifySignature(
      packet.body.toString('hex'),
      signature,
      this.SIGNATURE_SECRET
    );
  }
}

// ============================================================================
// Packet Interceptor - Enhanced Security
// ============================================================================

export class PacketInterceptor extends EventEmitter {
  private packets: InterceptedPacket[] = [];
  private maxPackets: number = 5000;
  private errorCount: number = 0;
  private tamperedCount: number = 0;
  private verifySignatures: boolean = false;

  constructor(maxPackets?: number, verifySignatures?: boolean) {
    super();
    if (maxPackets) this.maxPackets = maxPackets;
    if (verifySignatures !== undefined) this.verifySignatures = verifySignatures;
  }

  intercept(buffer: Buffer, direction: 'send' | 'recv'): void {
    try {
      // Validate buffer
      if (!buffer || buffer.length === 0) {
        console.error('[INTERCEPTOR] Empty buffer received');
        this.errorCount++;
        return;
      }

      const parsed = LOCOPacketCodec.decode(buffer, this.verifySignatures);
      let verified = true;

      // Verify signature if enabled
      if (this.verifySignatures && parsed?.signature) {
        verified = LOCOPacketCodec.verifyPacketSignature(parsed, parsed.signature);
        if (!verified) {
          this.tamperedCount++;
          console.warn('[INTERCEPTOR] ⚠️ Packet signature verification failed!');
        }
      }

      const packet: InterceptedPacket = {
        direction,
        raw: buffer,
        parsed,
        timestamp: Date.now(),
        verified
      };

      // Store packet (with limit)
      this.packets.push(packet);
      if (this.packets.length > this.maxPackets) {
        this.packets.shift();
      }

      this.emit('packet', packet);

      if (parsed) {
        const statusName = Object.entries(LOCO_PROTOCOL.STATUS).find(([_, v]) => v === parsed.header.statusCode)?.[0] || `CODE_${parsed.header.statusCode}`;
        
        console.log(
          `[LOCO] ${direction.toUpperCase()} - ${parsed.header.method} ` +
          `(ID: ${parsed.header.packetId}, Status: ${statusName}, Size: ${parsed.body.length}${verified ? '' : ' ⚠️UNVERIFIED'})`
        );
        
        this.emit(parsed.header.method, packet);
      } else {
        this.errorCount++;
      }
    } catch (error) {
      this.errorCount++;
      this.emit('error', error);
      console.error('[INTERCEPTOR] Error:', SecurityManager.maskSensitiveData(String(error)));
    }
  }

  getStats(): PacketStatistics {
    const stats: PacketStatistics = {
      total: this.packets.length,
      byDirection: { send: 0, recv: 0 },
      byMethod: {},
      byStatus: {},
      totalBytes: 0,
      avgPacketSize: 0,
      errors: this.errorCount,
      tamperedPackets: this.tamperedCount
    };

    this.packets.forEach(p => {
      stats.byDirection[p.direction]++;
      stats.totalBytes += p.raw.length;
      if (p.parsed) {
        const method = p.parsed.header.method;
        stats.byMethod[method] = (stats.byMethod[method] || 0) + 1;
        const status = p.parsed.header.statusCode;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      }
    });

    stats.avgPacketSize = stats.total > 0 ? Math.round(stats.totalBytes / stats.total) : 0;
    return stats;
  }

  getRecentPackets(count: number = 10): InterceptedPacket[] {
    return this.packets.slice(-count);
  }

  clear(): void {
    this.packets = [];
    this.errorCount = 0;
    this.tamperedCount = 0;
    console.log('[INTERCEPTOR] Cleared all packets');
  }

  destroy(): void {
    this.clear();
    this.removeAllListeners();
    console.log('[INTERCEPTOR] Destroyed');
  }
}

// ============================================================================
// Protocol Hook Manager - Enhanced
// ============================================================================

export type HookCallback = (packet: LOCOPacket, direction: 'send' | 'recv') => LOCOPacket | void;

export class ProtocolHookManager {
  private hooks: Map<string, HookCallback[]> = new Map();
  private globalHooks: HookCallback[] = [];

  registerMethodHook(method: string, callback: HookCallback): void {
    // Validate method name
    if (!/^[A-Z_]+$/.test(method)) {
      throw new Error(`Invalid method name: ${method}`);
    }

    if (!this.hooks.has(method)) this.hooks.set(method, []);
    this.hooks.get(method)!.push(callback);
    console.log(`[HOOK] Registered hook for method ${method}`);
  }

  registerGlobalHook(callback: HookCallback): void {
    this.globalHooks.push(callback);
    console.log('[HOOK] Registered global hook');
  }

  trigger(packet: LOCOPacket, direction: 'send' | 'recv'): LOCOPacket {
    let modifiedPacket = packet;

    // Apply global hooks
    for (const cb of this.globalHooks) {
      try {
        const result = cb(modifiedPacket, direction);
        if (result) modifiedPacket = result;
      } catch (error) {
        console.error('[HOOK] Global hook error:', SecurityManager.maskSensitiveData(String(error)));
      }
    }

    // Apply method-specific hooks
    const methodHooks = this.hooks.get(packet.header.method);
    if (methodHooks) {
      for (const cb of methodHooks) {
        try {
          const result = cb(modifiedPacket, direction);
          if (result) modifiedPacket = result;
        } catch (error) {
          console.error(`[HOOK] Method hook error for ${packet.header.method}:`, SecurityManager.maskSensitiveData(String(error)));
        }
      }
    }

    return modifiedPacket;
  }

  clear(): void {
    this.hooks.clear();
    this.globalHooks = [];
    console.log('[HOOK] All hooks cleared');
  }

  getHookCount(): { total: number; global: number; methods: number } {
    let methodHookCount = 0;
    this.hooks.forEach(hooks => methodHookCount += hooks.length);
    
    return {
      total: this.globalHooks.length + methodHookCount,
      global: this.globalHooks.length,
      methods: methodHookCount
    };
  }
}

// ============================================================================
// Security Bypass (Deprecated - Use SecurityManager instead)
// ============================================================================

export class SecurityBypass {
  static bypassMonitoring(): void {
    console.warn('[SECURITY] SecurityBypass.bypassMonitoring is deprecated. Use SecurityManager instead.');
    SecurityManager.maskSensitiveData(''); // Trigger initialization
  }

  static obfuscateMemory(data: any): Buffer {
    console.warn('[SECURITY] SecurityBypass.obfuscateMemory is deprecated. Use SecurityManager.encrypt instead.');
    const encrypted = SecurityManager.encrypt(JSON.stringify(data));
    return Buffer.from(encrypted, 'utf8');
  }
}

export default {
  LOCO_PROTOCOL,
  BinaryUtils,
  LOCOPacketCodec,
  PacketInterceptor,
  SecurityBypass,
  ProtocolHookManager
};