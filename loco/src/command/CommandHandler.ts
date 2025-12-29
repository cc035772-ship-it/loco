/**
 * 🔥 COMMAND HANDLER v31.3 SECURE 🔥
 * Enhanced security with rate limiting and input validation
 */

import { TalkChannel } from 'node-kakao';
import { DataCollector } from '../utils/DataCollector';
import { DatabaseManager } from '../database/DatabaseManager';
import { SecurityManager } from '../utils/SecurityManager';
import { RateLimiter } from '../utils/RateLimiter';
import { AdminConfig } from '../types/types';

export class CommandHandler {
  private rateLimiter: RateLimiter;
  private readonly ALLOWED_COMMANDS = [
    'ping', 'status', 'ip', 'help', 'export', 'stats', 
    'clear', 'ban', 'unban', 'admin', 'security'
  ];

  constructor(
    private prefix: string,
    private collector: DataCollector,
    private db: DatabaseManager,
    private adminConfig: AdminConfig
  ) {
    // Rate limit: 10 commands per minute per user
    this.rateLimiter = new RateLimiter({
      windowMs: 60000,
      maxRequests: 10,
      blockDurationMs: 300000 // 5 minutes block
    });
  }

  async handleMessage(
    text: string, 
    senderId: string, 
    senderName: string, 
    channel: TalkChannel, 
    logId?: string
  ): Promise<boolean> {
    // Check if message starts with prefix
    if (!text.startsWith(this.prefix)) return false;
    
    // Rate limiting check
    if (!this.rateLimiter.isAllowed(senderId)) {
      console.log(`[COMMAND] Rate limit exceeded for ${senderName}`);
      await channel.sendChat('⚠️ Too many commands. Please wait before trying again.');
      return true;
    }

    // Parse command
    const sanitizedText = SecurityManager.sanitizeInput(text);
    const args = sanitizedText.slice(this.prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    if (!command) return false;

    // Validate command
    if (!SecurityManager.validateCommand(command, this.ALLOWED_COMMANDS)) {
      console.log(`[COMMAND] Invalid command attempted: ${command} by ${senderName}`);
      await channel.sendChat('❌ Invalid command. Use !help for available commands.');
      return true;
    }

    try {
      // Execute command
      switch (command) {
        case 'ping':
          await this.handlePing(channel, logId);
          break;
        
        case 'status':
          await this.handleStatus(channel);
          break;
        
        case 'ip':
          await this.handleIP(channel);
          break;
        
        case 'help':
          await this.handleHelp(channel, senderId);
          break;
        
        case 'export':
          await this.handleExport(channel, senderId);
          break;
        
        case 'stats':
          await this.handleStats(channel, senderId);
          break;
        
        case 'clear':
          await this.handleClear(channel, senderId);
          break;
        
        case 'ban':
          await this.handleBan(channel, senderId, args);
          break;
        
        case 'unban':
          await this.handleUnban(channel, senderId, args);
          break;
        
        case 'admin':
          await this.handleAdmin(channel, senderId, args);
          break;
        
        case 'security':
          await this.handleSecurity(channel, senderId);
          break;
        
        default:
          await channel.sendChat('❌ Command not implemented.');
      }

      console.log(`[COMMAND] ✓ Executed ${command} by ${senderName}`);
      return true;

    } catch (error) {
      console.error(`[COMMAND] Error executing ${command}:`, SecurityManager.maskSensitiveData(String(error)));
      await channel.sendChat(`❌ Error executing command: ${command}`);
      return true;
    }
  }

  private async handlePing(channel: TalkChannel, logId?: string): Promise<void> {
    // Delete the ping message
    if (logId) {
      try {
        await channel.deleteChat(logId as any);
        console.log(`[COMMAND] ✓ Deleted ping message (logId: ${logId})`);
      } catch (error) {
        console.error('[COMMAND] Failed to delete ping message:', error);
      }
    }
    
    // Send pong response
    await channel.sendChat('🏓 !pong');
  }

  private async handleStatus(channel: TalkChannel): Promise<void> {
    const summary = this.collector.getSummary();
    const sessionId = this.collector.getData().sessionId;
    const rateLimitStats = this.rateLimiter.getStats();
    
    const statusMsg = `✅ Bot Status
━━━━━━━━━━━━━━━━
Session: ${sessionId.slice(0, 20)}...
${summary}
Rate Limiter: ${rateLimitStats.active} active, ${rateLimitStats.blocked} blocked
━━━━━━━━━━━━━━━━`;
    
    await channel.sendChat(statusMsg);
  }

  private async handleIP(channel: TalkChannel): Promise<void> {
    const ipList = this.collector.getData().ip;
    
    if (ipList.length === 0) {
      await channel.sendChat('📊 No IP data collected yet.');
      return;
    }
    
    const recent = ipList.slice(-5);
    const ipText = recent.map(ip => 
      `• ${ip.ip} (${ip.source}) - ${ip.triggeredBy || 'unknown'}`
    ).join('\n');
    
    await channel.sendChat(`📊 Recent IPs (${ipList.length} total):\n${ipText}`);
  }

  private async handleHelp(channel: TalkChannel, senderId: string): Promise<void> {
    const isAdmin = this.isAdmin(senderId);
    
    let helpText = `📚 Available Commands
━━━━━━━━━━━━━━━━
${this.prefix}ping - Test bot response
${this.prefix}status - Show bot status
${this.prefix}ip - Show collected IPs
${this.prefix}help - Show this message`;

    if (isAdmin) {
      helpText += `

🔐 Admin Commands:
${this.prefix}export - Export collected data
${this.prefix}stats - Show detailed statistics
${this.prefix}clear - Clear collected data
${this.prefix}ban <userId> - Ban a user
${this.prefix}unban <userId> - Unban a user
${this.prefix}admin <add|remove> <userId> - Manage admins
${this.prefix}security - Show security status`;
    }
    
    helpText += '\n━━━━━━━━━━━━━━━━';
    await channel.sendChat(helpText);
  }

  private async handleExport(channel: TalkChannel, senderId: string): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    const data = this.collector.exportData(false);
    const dataSize = Buffer.byteLength(data, 'utf8');
    
    await channel.sendChat(`📦 Exported data (${dataSize} bytes). Check logs for details.`);
    console.log('[COMMAND] ✓ Exported data (masked):\n', SecurityManager.maskSensitiveData(data));
  }

  private async handleStats(channel: TalkChannel, senderId: string): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    const storageStats = this.collector.getStorageStats();
    const dbStats = await this.db.getStatistics();
    
    const statsMsg = `📊 Detailed Statistics
━━━━━━━━━━━━━━━━
Messages: ${storageStats.messages.current}/${storageStats.messages.max} (${storageStats.messages.percentage}%)
Contacts: ${storageStats.contacts.current}/${storageStats.contacts.max} (${storageStats.contacts.percentage}%)
IPs: ${storageStats.ips.current}/${storageStats.ips.max} (${storageStats.ips.percentage}%)
Packets: ${storageStats.packets.current}/${storageStats.packets.max} (${storageStats.packets.percentage}%)

Database:
Admins: ${dbStats.admins}
Banned Users: ${dbStats.bannedUsers}
━━━━━━━━━━━━━━━━`;
    
    await channel.sendChat(statsMsg);
  }

  private async handleClear(channel: TalkChannel, senderId: string): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    this.collector.clear();
    await channel.sendChat('✅ All collected data has been cleared.');
  }

  private async handleBan(channel: TalkChannel, senderId: string, args: string[]): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    if (args.length < 1) {
      await channel.sendChat('❌ Usage: !ban <userId> [reason]');
      return;
    }
    
    const targetUserId = SecurityManager.sanitizeInput(args[0]);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    await this.db.banUser({
      kakaoId: targetUserId,
      reason: SecurityManager.sanitizeInput(reason),
      banType: 'PERMANENT',
      bannedAt: Date.now()
    });
    
    await channel.sendChat(`✅ User ${targetUserId} has been banned.`);
  }

  private async handleUnban(channel: TalkChannel, senderId: string, args: string[]): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    if (args.length < 1) {
      await channel.sendChat('❌ Usage: !unban <userId>');
      return;
    }
    
    const targetUserId = SecurityManager.sanitizeInput(args[0]);
    await this.db.unbanUser(targetUserId);
    await channel.sendChat(`✅ User ${targetUserId} has been unbanned.`);
  }

  private async handleAdmin(channel: TalkChannel, senderId: string, args: string[]): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    if (args.length < 2) {
      await channel.sendChat('❌ Usage: !admin <add|remove> <userId>');
      return;
    }
    
    const action = args[0].toLowerCase();
    const targetUserId = SecurityManager.sanitizeInput(args[1]);
    
    if (action === 'add') {
      await this.db.addAdmin({
        kakaoId: targetUserId,
        nickname: 'Admin',
        permissions: ['all'],
        addedAt: Date.now()
      });
      await channel.sendChat(`✅ User ${targetUserId} added as admin.`);
    } else if (action === 'remove') {
      await this.db.removeAdmin(targetUserId);
      await channel.sendChat(`✅ User ${targetUserId} removed from admins.`);
    } else {
      await channel.sendChat('❌ Invalid action. Use "add" or "remove".');
    }
  }

  private async handleSecurity(channel: TalkChannel, senderId: string): Promise<void> {
    if (!this.isAdmin(senderId)) {
      await channel.sendChat('❌ Admin only command');
      return;
    }
    
    const rateLimitStats = this.rateLimiter.getStats();
    
    const securityMsg = `🔐 Security Status
━━━━━━━━━━━━━━━━
Rate Limiter:
• Total tracked: ${rateLimitStats.total}
• Active: ${rateLimitStats.active}
• Blocked: ${rateLimitStats.blocked}

Encryption: Enabled
Input Validation: Active
Anti-Debug: Active
━━━━━━━━━━━━━━━━`;
    
    await channel.sendChat(securityMsg);
  }

  private isAdmin(userId: string): boolean {
    return this.adminConfig.kakaoIds.includes(userId);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.rateLimiter.destroy();
    console.log('[COMMAND] CommandHandler destroyed');
  }
}