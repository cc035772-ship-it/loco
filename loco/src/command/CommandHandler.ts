/**
 * 🔥 COMMAND HANDLER v31.2 🔥
 * Added ping message deletion and !pong response
 */

import { TalkChannel } from 'node-kakao';
import { DataCollector } from '../client/DataCollector';
import { DatabaseManager } from '../database/DatabaseManager';
import { AdminConfig } from '../types';

export class CommandHandler {
  constructor(
    private prefix: string,
    private collector: DataCollector,
    private db: DatabaseManager,
    private adminConfig: AdminConfig
  ) {}

  async handleMessage(
    text: string, 
    senderId: string, 
    senderName: string, 
    channel: TalkChannel, 
    logId?: string
  ): Promise<boolean> {
    if (!text.startsWith(this.prefix)) return false;
    
    const args = text.slice(this.prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    try {
      if (command === 'ping') {
        // Delete the ping message first
        if (logId) {
          try {
            await channel.deleteChat(logId as any);
            console.log(`[COMMAND] ✓ Deleted ping message (logId: ${logId})`);
          } catch (deleteError) {
            console.error('[COMMAND] Failed to delete ping message:', deleteError);
          }
        }
        
        // Send !pong response
        await channel.sendChat('!pong');
        console.log('[COMMAND] ✓ Sent !pong response');
        return true;
      }

      if (command === 'status') {
        const summary = this.collector.getSummary();
        const sessionId = this.collector.getData().sessionId;
        await channel.sendChat(`✅ Bot is running\nSession: ${sessionId}\n${summary}`);
        console.log('[COMMAND] ✓ Sent status');
        return true;
      }

      if (command === 'ip') {
        const ipList = this.collector.getData().ip;
        if (ipList.length === 0) {
          await channel.sendChat('No IP data collected yet.');
        } else {
          const recent = ipList.slice(-5);
          const ipText = recent.map(ip => `${ip.ip} (${ip.source}) - ${ip.triggeredBy || 'unknown'}`).join('\n');
          await channel.sendChat(`Recent IPs:\n${ipText}`);
        }
        console.log('[COMMAND] ✓ Sent IP list');
        return true;
      }

      if (command === 'help') {
        const helpText = `Available commands:
${this.prefix}ping - Test bot response
${this.prefix}status - Show bot status
${this.prefix}ip - Show collected IPs
${this.prefix}help - Show this message`;
        await channel.sendChat(helpText);
        console.log('[COMMAND] ✓ Sent help');
        return true;
      }

      if (command === 'export') {
        if (!this.isAdmin(senderId)) {
          await channel.sendChat('❌ Admin only command');
          return true;
        }
        const data = this.collector.exportData();
        await channel.sendChat(`Exported data (${data.length} bytes). Check logs for details.`);
        console.log('[COMMAND] ✓ Exported data:\n', data);
        return true;
      }

    } catch (error) {
      console.error(`[COMMAND] Error executing ${command}:`, error);
      await channel.sendChat(`❌ Error executing command: ${command}`);
    }

    return false;
  }

  private isAdmin(userId: string): boolean {
    return this.adminConfig.kakaoIds.includes(userId);
  }
}