/**
 * 🔥 ANTI-DEBUG v31.1 🔥
 */

export class AntiDebug {
  private static active: boolean = false;

  static initialize(): void {
    this.active = true;
    console.log('[SECURITY] Anti-Debug initialized');
  }

  static isActive(): boolean { 
    return this.active; 
  }

  static enable(): void { 
    this.active = true; 
    console.log('[SECURITY] Anti-Debug enabled');
  }

  static disable(): void { 
    this.active = false; 
    console.log('[SECURITY] Anti-Debug disabled');
  }

  static getSystemInfo(): any { 
    return { 
      platform: process.platform, 
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime()
    }; 
  }
}