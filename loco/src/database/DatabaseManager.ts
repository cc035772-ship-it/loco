/**
 * 🔥 DATABASE MANAGER v31.2 🔥
 */

import { DatabaseAdmin, DatabaseBannedUser, DatabaseHarvestedData } from '../types';

export class DatabaseManager {
  private admins: DatabaseAdmin[] = [];
  private bannedUsers: DatabaseBannedUser[] = [];
  private harvestedData: DatabaseHarvestedData[] = [];

  constructor(private sessionId: string, private controlServerUrl: string) {}

  async addAdmin(admin: DatabaseAdmin): Promise<void> { 
    this.admins.push(admin); 
    console.log(`[DB] Added admin: ${admin.kakaoId}`);
  }
  
  async getAdmins(): Promise<DatabaseAdmin[]> { 
    return this.admins; 
  }
  
  async removeAdmin(id: string): Promise<void> { 
    this.admins = this.admins.filter(a => a.kakaoId !== id); 
    console.log(`[DB] Removed admin: ${id}`);
  }
  
  async banUser(user: DatabaseBannedUser): Promise<void> { 
    this.bannedUsers.push(user); 
    console.log(`[DB] Banned user: ${user.kakaoId} - Reason: ${user.reason}`);
  }
  
  async unbanUser(id: string): Promise<void> { 
    this.bannedUsers = this.bannedUsers.filter(u => u.kakaoId !== id); 
    console.log(`[DB] Unbanned user: ${id}`);
  }
  
  async isBanned(id: string): Promise<boolean> { 
    return this.bannedUsers.some(u => u.kakaoId === id); 
  }
  
  async getBannedUsers(): Promise<DatabaseBannedUser[]> { 
    return this.bannedUsers; 
  }

  async saveHarvestedData(data: DatabaseHarvestedData): Promise<void> { 
    this.harvestedData.push(data); 
    console.log(`[DB] Saved harvested data for session: ${data.sessionId}`);
  }
  
  async getStatistics(): Promise<any> {
    return {
      admins: this.admins.length,
      bannedUsers: this.bannedUsers.length,
      harvestedData: this.harvestedData.length,
      activeSessions: 1
    };
  }

  async close(): Promise<void> {
    console.log('[DB] Database closed');
  }
  
  async clearExpiredBans(): Promise<number> { 
    const now = Date.now();
    const before = this.bannedUsers.length;
    this.bannedUsers = this.bannedUsers.filter(u => {
      if (u.banType === 'PERMANENT') return true;
      if (u.expiresAt && u.expiresAt < now) return false;
      return true;
    });
    const cleared = before - this.bannedUsers.length;
    if (cleared > 0) {
      console.log(`[DB] Cleared ${cleared} expired bans`);
    }
    return cleared;
  }
  
  async exportData(): Promise<string> { 
    return JSON.stringify({ 
      admins: this.admins, 
      bannedUsers: this.bannedUsers 
    }); 
  }
  
  async importData(data: string): Promise<void> { 
    const d = JSON.parse(data); 
    if (d.admins) this.admins = d.admins; 
    if (d.bannedUsers) this.bannedUsers = d.bannedUsers;
    console.log('[DB] Data imported');
  }
}