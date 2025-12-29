/**
 * 🔥 ENHANCED KAKAO CLIENT v31.2 🔥
 */

import { 
  AuthApiClient, 
  TalkClient, 
  TalkChannel, 
  TalkChatData, 
  ChatOnRoomEvent,
  KnownChatType
} from 'node-kakao';
import { DataCollector } from './DataCollector';
import { MessageHandler } from '../handlers/MessageHandler';
import { CommandHandler } from '../handlers/CommandHandler';
import { DatabaseManager } from '../database/DatabaseManager';
import { Config } from '../config';

export class EnhancedKakaoClient {
  private client: TalkClient;
  private collector: DataCollector;
  private messageHandler: MessageHandler;
  private commandHandler: CommandHandler;
  private db: DatabaseManager;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
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
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async login(): Promise<void> {
    try {
      console.log('[CLIENT] Initializing login...');

      const api = await AuthApiClient.create(Config.DEVICE_NAME, Config.DEVICE_UUID);
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
        throw new Error('No login credentials provided');
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

    } catch (error) {
      console.error('[CLIENT] Login error:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Chat event handler
    this.client.on('chat', async (data: TalkChatData, channel: TalkChannel) => {
      try {
        const sender = data.getSenderInfo(channel);
        if (!sender) return;

        const senderId = sender.userId.toString();
        const senderName = sender.nickname;
        const logId = data.logId.toString();

        // Check if banned
        if (await this.db.isBanned(senderId)) {
          console.log(`[CLIENT] Ignored message from banned user: ${senderName}`);
          return;
        }

        // Handle text messages
        if (data.type === KnownChatType.TEXT && data.text) {
          const text = data.text;

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
      } catch (error) {
        console.error('[CLIENT] Error handling chat event:', error);
      }
    });

    // Channel added event
    this.client.on('chat_added', (channel: TalkChannel, _: ChatOnRoomEvent) => {
      console.log(`[CLIENT] Added to channel: ${channel.channelId}`);
    });

    // Channel removed event
    this.client.on('chat_removed', (channel: TalkChannel, _: ChatOnRoomEvent) => {
      console.log(`[CLIENT] Removed from channel: ${channel.channelId}`);
    });

    console.log('[CLIENT] ✓ Event handlers registered');
  }

  getDataCollector(): DataCollector {
    return this.collector;
  }

  getClient(): TalkClient {
    return this.client;
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      await this.db.close();
      console.log('[CLIENT] ✓ Disconnected');
    } catch (error) {
      console.error('[CLIENT] Error during disconnect:', error);
    }
  }
}