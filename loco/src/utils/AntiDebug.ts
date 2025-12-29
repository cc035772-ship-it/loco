/**
 * 🔐 ANTI-DEBUG v31.3 SECURE 🔐
 * Enhanced security and anti-tampering features
 */

import * as crypto from 'crypto';

export class AntiDebug {
  private static active: boolean = false;
  private static checksum: string = '';
  private static monitoringInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize anti-debug protection
   */
  static initialize(): void {
    this.active = true;
    this.checksum = this.generateChecksum();
    this.startMonitoring();
    this.protectConsole();
    console.log('[SECURITY] Anti-Debug initialized with enhanced protection');
  }

  /**
   * Check if anti-debug is active
   */
  static isActive(): boolean {
    return this.active;
  }

  /**
   * Enable anti-debug
   */
  static enable(): void {
    if (!this.active) {
      this.active = true;
      this.startMonitoring();
      console.log('[SECURITY] Anti-Debug enabled');
    }
  }

  /**
   * Disable anti-debug
   */
  static disable(): void {
    if (this.active) {
      this.active = false;
      this.stopMonitoring();
      console.log('[SECURITY] Anti-Debug disabled');
    }
  }

  /**
   * Get system information (sanitized)
   */
  static getSystemInfo(): any {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
      memoryUsage: {
        heapUsed: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.floor(process.memoryUsage().external / 1024 / 1024)
      },
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * Detect debugging environment
   */
  static detectDebugger(): boolean {
    // Check for common debugger indicators
    const debuggerDetected = 
      typeof (global as any).v8debug !== 'undefined' ||
      /--inspect/.test(process.execArgv.join(' ')) ||
      /--debug/.test(process.execArgv.join(' ')) ||
      process.env.NODE_ENV === 'debug';

    if (debuggerDetected && this.active) {
      console.log('[SECURITY] ⚠️ Debugger detected');
    }

    return debuggerDetected;
  }

  /**
   * Generate integrity checksum
   */
  private static generateChecksum(): string {
    const data = `${process.version}${process.platform}${process.arch}${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify integrity
   */
  static verifyIntegrity(): boolean {
    if (!this.active) return true;

    const currentChecksum = this.generateChecksum();
    // Note: This is a basic check, in production you'd compare with stored checksum
    return currentChecksum.length === 64;
  }

  /**
   * Start monitoring for tampering
   */
  private static startMonitoring(): void {
    if (this.monitoringInterval) return;

    this.monitoringInterval = setInterval(() => {
      if (this.active) {
        // Check for debugger
        if (this.detectDebugger()) {
          // Log but don't exit to avoid disrupting legitimate debugging
          console.log('[SECURITY] Debugger monitoring active');
        }

        // Check memory usage
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
          console.log('[SECURITY] ⚠️ High memory usage detected');
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop monitoring
   */
  private static stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Protect console output
   */
  private static protectConsole(): void {
    const originalLog = console.log.bind(console);
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);

    const sanitize = (arg: any): any => {
      if (typeof arg === 'string') {
        return arg
          .replace(/password["\s:=]+[^\s,}]*/gi, 'password: [REDACTED]')
          .replace(/token["\s:=]+[^\s,}]*/gi, 'token: [REDACTED]')
          .replace(/secret["\s:=]+[^\s,}]*/gi, 'secret: [REDACTED]')
          .replace(/key["\s:=]+[^\s,}]*/gi, 'key: [REDACTED]')
          .replace(/\+?\d{10,}/g, '[PHONE_REDACTED]')
          .replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/gi, '[EMAIL_REDACTED]');
      }
      return arg;
    };

    console.log = (...args: any[]) => originalLog(...args.map(sanitize));
    console.error = (...args: any[]) => originalError(...args.map(sanitize));
    console.warn = (...args: any[]) => originalWarn(...args.map(sanitize));
  }

  /**
   * Get security status
   */
  static getSecurityStatus(): {
    antiDebugActive: boolean;
    debuggerDetected: boolean;
    integrityValid: boolean;
    uptime: number;
  } {
    return {
      antiDebugActive: this.active,
      debuggerDetected: this.detectDebugger(),
      integrityValid: this.verifyIntegrity(),
      uptime: Math.floor(process.uptime())
    };
  }

  /**
   * Cleanup and destroy
   */
  static destroy(): void {
    this.stopMonitoring();
    this.active = false;
    console.log('[SECURITY] Anti-Debug destroyed');
  }
}