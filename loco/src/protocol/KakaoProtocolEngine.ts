/**
 * 🔥 KAKAO PROTOCOL ENGINE v31.2 ENHANCED 🔥
 * Optimized LOCO Protocol Engine aligned with node-kakao structure
 * Supports 22-byte Standard Header and BSON Body Parsing
 */

import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as BSON from 'bson';

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
}

export interface InterceptedPacket {
  direction: 'send' | 'recv';
  raw: Buffer;
  parsed: LOCOPacket | null;
  timestamp: number;
}

export interface PacketStatistics {
  total: number;
  byDirection: { send: number; recv: number };
  byMethod: Record<string, number>;
  byStatus: Record<number, number>;
  totalBytes: number;
  avgPacketSize: number;
  errors: number;
}

// ============================================================================
// Binary Utilities
// ============================================================================

export class BinaryUtils {
  static bufferToHex(buffer: Buffer): string {
    return buffer.toString('hex').toUpperCase();
  }

  static hexToBuffer(hex: string): Buffer {
    return Buffer.from(hex, 'hex');
  }

  static safeSlice(buffer: Buffer, start: number, end?: number): Buffer {
    const actualEnd = end !== undefined ? Math.min(end, buffer.length) : buffer.length;
    const actualStart = Math.max(0, Math.min(start, buffer.length));
    return buffer.slice(actualStart, actualEnd);
  }
}

// ============================================================================
// LOCO Packet Codec - Optimized for 22-byte Header
// ============================================================================

export class LOCOPacketCodec {
  private static readonly MAX_BODY_SIZE = 15 * 1024 * 1024; // 15MB limit

  static decode(buffer: Buffer): LOCOPacket | null {
    try {
      if (buffer.length < LOCO_PROTOCOL.HEADER_SIZE) {
        return null;
      }

      // 22-byte Header Structure:
      // PacketID (4) + Status (2) + Method (11) + Type (1) + BodyLen (4)
      const packetId = buffer.readUInt32LE(0);
      const statusCode = buffer.readInt16LE(4);
      const method = buffer.toString('utf8', 6, 17).replace(/\0/g, '');
      const type = buffer.readUInt8(17);
      const bodyLength = buffer.readUInt32LE(18);

      if (bodyLength > this.MAX_BODY_SIZE) {
        console.error(`[LOCO] Body length too large: ${bodyLength}`);
        return null;
      }

      const body = BinaryUtils.safeSlice(buffer, LOCO_PROTOCOL.HEADER_SIZE, LOCO_PROTOCOL.HEADER_SIZE + bodyLength);

      let data: any = null;
      if (body.length > 0) {
        try {
          data = BSON.deserialize(body);
        } catch (e) {
          // Fallback if not BSON
          data = null;
        }
      }

      return {
        header: { packetId, statusCode, method, type, bodyLength },
        body,
        data,
        timestamp: Date.now()
      };
    } catch (e) {
      console.error('[LOCO] Decode error:', e);
      return null;
    }
  }

  static encode(header: LOCOPacketHeader, body: Buffer): Buffer {
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

    return buffer;
  }
}

// ============================================================================
// Packet Interceptor
// ============================================================================

export class PacketInterceptor extends EventEmitter {
  private packets: InterceptedPacket[] = [];
  private maxPackets: number = 5000;
  private errorCount: number = 0;

  intercept(buffer: Buffer, direction: 'send' | 'recv'): void {
    try {
      const parsed = LOCOPacketCodec.decode(buffer);

      const packet: InterceptedPacket = {
        direction,
        raw: buffer,
        parsed,
        timestamp: Date.now()
      };

      this.packets.push(packet);
      if (this.packets.length > this.maxPackets) this.packets.shift();

      this.emit('packet', packet);

      if (parsed) {
        const statusName = Object.entries(LOCO_PROTOCOL.STATUS).find(([_, v]) => v === parsed.header.statusCode)?.[0] || `CODE_${parsed.header.statusCode}`;
        
        console.log(
          `[LOCO] ${direction.toUpperCase()} - ${parsed.header.method} ` +
          `(Packet: ${parsed.header.packetId}, Status: ${statusName}, Size: ${parsed.body.length})`
        );
        
        this.emit(parsed.header.method, packet);
      } else {
        this.errorCount++;
      }
    } catch (error) {
      this.errorCount++;
      this.emit('error', error);
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
      errors: this.errorCount
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

  clear(): void {
    this.packets = [];
    this.errorCount = 0;
  }
}

// ============================================================================
// Protocol Hook Manager
// ============================================================================

export type HookCallback = (packet: LOCOPacket, direction: 'send' | 'recv') => LOCOPacket | void;

export class ProtocolHookManager {
  private hooks: Map<string, HookCallback[]> = new Map();
  private globalHooks: HookCallback[] = [];

  registerMethodHook(method: string, callback: HookCallback): void {
    if (!this.hooks.has(method)) this.hooks.set(method, []);
    this.hooks.get(method)!.push(callback);
    console.log(`[HOOK] Registered hook for method ${method}`);
  }

  registerGlobalHook(callback: HookCallback): void {
    this.globalHooks.push(callback);
  }

  trigger(packet: LOCOPacket, direction: 'send' | 'recv'): LOCOPacket {
    let modifiedPacket = packet;

    for (const cb of this.globalHooks) {
      const result = cb(modifiedPacket, direction);
      if (result) modifiedPacket = result;
    }

    const methodHooks = this.hooks.get(packet.header.method);
    if (methodHooks) {
      for (const cb of methodHooks) {
        const result = cb(modifiedPacket, direction);
        if (result) modifiedPacket = result;
      }
    }

    return modifiedPacket;
  }

  clear(): void {
    this.hooks.clear();
    this.globalHooks = [];
  }
}

// ============================================================================
// Security Bypass
// ============================================================================

export class SecurityBypass {
  static bypassMonitoring(): void {
    const sanitize = (arg: any): any => {
      if (typeof arg === 'string') {
        return arg.replace(/password|token|auth|secret|key/gi, '[REDACTED]');
      }
      return arg;
    };

    const originalLog = console.log.bind(console);
    console.log = (...args: any[]) => originalLog(...args.map(sanitize));
  }

  static obfuscateMemory(data: any): Buffer {
    const json = JSON.stringify(data);
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
    return Buffer.concat([key, iv, cipher.getAuthTag(), encrypted]);
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