/**
 * 🔥 ENHANCED KAKAO HARVESTER v31.2 🔥
 * Main Entry Point
 */

import { EnhancedKakaoClient } from './client/EnhancedKakaoClient';
import { AntiDebug } from './utils/AntiDebug';
import { Config } from './config';

async function main() {
  console.log('='.repeat(60));
  console.log('🔥 ENHANCED KAKAO CLIENT v31.2 🔥');
  console.log('='.repeat(60));

  try {
    // Validate configuration
    Config.validate();

    // Initialize security
    AntiDebug.initialize();
    console.log('[MAIN] System Info:', AntiDebug.getSystemInfo());

    // Create and login client
    const client = new EnhancedKakaoClient();
    await client.login();

    console.log('[MAIN] ✓ Client is ready and listening for messages');
    console.log('[MAIN] Press Ctrl+C to exit');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[MAIN] Shutting down...');
      await client.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n[MAIN] Shutting down...');
      await client.disconnect();
      process.exit(0);
    });

  } catch (error) {
    console.error('[MAIN] Fatal error:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

// Export for library usage
export { EnhancedKakaoClient } from './client/EnhancedKakaoClient';
export { KakaoProtocolEngine } from './src/protocol/KakaoProtocolEngine';
export { DatabaseManager } from './database/DatabaseManager';
export { CommandHandler } from './command/CommandHandler';
export { DataCollector } from './utils/DataCollector';
export { AntiDebug } from './utils/AntiDebug';
export * from './types/types';
export * from './config';