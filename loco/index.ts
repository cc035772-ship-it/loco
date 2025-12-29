/**
 * 🔥 ENHANCED KAKAO HARVESTER v31.3 SECURE 🔥
 * Main Entry Point with Enhanced Security
 */

import { EnhancedKakaoClient } from './src/client/EnhancedKakaoClient';
import { AntiDebug } from './src/utils/AntiDebug';
import { SecurityManager } from './src/utils/SecurityManager';
import { Config } from './config';

async function main() {
  console.log('='.repeat(60));
  console.log('🔐 ENHANCED KAKAO CLIENT v31.3 SECURE 🔐');
  console.log('='.repeat(60));

  try {
    // Validate configuration
    Config.validate();
    console.log('[MAIN] Configuration:', Config.getMaskedConfig());

    // Initialize security
    AntiDebug.initialize();
    const systemInfo = AntiDebug.getSystemInfo();
    console.log('[MAIN] System Info:', systemInfo);

    // Check security status
    const securityStatus = AntiDebug.getSecurityStatus();
    console.log('[MAIN] Security Status:', securityStatus);

    if (securityStatus.debuggerDetected) {
      console.warn('[MAIN] ⚠️ Debugger detected - proceeding with caution');
    }

    // Create and login client
    console.log('[MAIN] Initializing secure client...');
    const client = new EnhancedKakaoClient();
    
    await client.login();

    console.log('[MAIN] ✓ Client is ready and listening for messages');
    console.log('[MAIN] ✓ All security features are active');
    console.log('[MAIN] Session ID:', client.getSessionId());
    console.log('[MAIN] Press Ctrl+C to exit');

    // Periodic status report
    const statusInterval = setInterval(() => {
      const stats = client.getStatistics();
      console.log('[MAIN] Status:', stats.collector);
    }, 300000); // Every 5 minutes

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[MAIN] Received ${signal}, shutting down gracefully...`);
      
      clearInterval(statusInterval);
      
      try {
        await client.disconnect();
        AntiDebug.destroy();
        console.log('[MAIN] ✓ Shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('[MAIN] Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('[MAIN] Uncaught exception:', SecurityManager.maskSensitiveData(String(error)));
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[MAIN] Unhandled rejection:', SecurityManager.maskSensitiveData(String(reason)));
      shutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('[MAIN] Fatal error:', SecurityManager.maskSensitiveData(String(error)));
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

// Export for library usage
export { EnhancedKakaoClient } from './src/client/EnhancedKakaoClient';
export { KakaoProtocolEngine } from './src/protocol/KakaoProtocolEngine';
export { DatabaseManager } from './src/database/DatabaseManager';
export { CommandHandler } from './src/command/CommandHandler';
export { DataCollector } from './src/utils/DataCollector';
export { SecurityManager } from './src/utils/SecurityManager';
export { RateLimiter } from './src/utils/RateLimiter';
export { AntiDebug } from './src/utils/AntiDebug';
export * from './src/types/types';
export { Config } from './config';