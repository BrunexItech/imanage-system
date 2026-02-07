import { offlineDB } from '../utils/offlineDB';
import { salesAPI } from './api';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.init();
  }

  init() {
    window.addEventListener('online', () => this.syncPendingData());
    window.addEventListener('offline', () => this.handleOffline());
    this.syncPendingData();
    setInterval(() => this.syncPendingData(), 5 * 60 * 1000);
  }

  handleOffline() {
    console.log('App is offline - data will be queued');
  }

  async syncPendingData() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    
    try {
      const pendingSales = await offlineDB.getPendingSales();
      
      for (const sale of pendingSales) {
        try {
          await salesAPI.createSale(sale);
          await offlineDB.deletePendingSale(sale.offlineId);
          console.log(`Synced sale: ${sale.receipt_number}`);
        } catch (error) {
          console.error('Failed to sync sale:', error);
          break;
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  async queueSale(saleData) {
    if (navigator.onLine) {
      try {
        await salesAPI.createSale(saleData);
        return { success: true, synced: true };
      } catch (error) {
        console.log('Online sale failed, saving offline');
      }
    }
    
    const offlineId = await offlineDB.savePendingSale(saleData);
    return { success: true, synced: false, offlineId };
  }

  async getSyncStatus() {
    const pendingSales = await offlineDB.getPendingSales();
    const hasOfflineData = await offlineDB.hasOfflineData();
    
    return {
      isOnline: navigator.onLine,
      pendingCount: pendingSales.length,
      hasOfflineData,
      lastSync: new Date().toISOString(),
    };
  }

  // NEW METHODS FOR DASHBOARD INTEGRATION
  async getPendingCount() {
    try {
      const pendingSales = await offlineDB.getPendingSales();
      return pendingSales.length;
    } catch (error) {
      console.error('Error getting pending count:', error);
      return 0;
    }
  }

  async isSyncing() {
    return this.isSyncing;
  }

  async forceSync() {
    if (navigator.onLine) {
      try {
        await this.syncPendingData();
        return { success: true, message: 'Sync completed' };
      } catch (error) {
        console.error('Force sync failed:', error);
        return { success: false, message: 'Sync failed' };
      }
    }
    return { success: false, message: 'No internet connection' };
  }

  // Get sync statistics for dashboard
  async getSyncStats() {
    try {
      const pendingSales = await offlineDB.getPendingSales();
      const lastSync = localStorage.getItem('last_sync_timestamp') || 'Never';
      
      return {
        pendingCount: pendingSales.length,
        isSyncing: this.isSyncing,
        isOnline: navigator.onLine,
        lastSync,
        queueSize: pendingSales.reduce((sum, sale) => sum + (sale.items?.length || 0), 0),
      };
    } catch (error) {
      console.error('Error getting sync stats:', error);
      return {
        pendingCount: 0,
        isSyncing: false,
        isOnline: navigator.onLine,
        lastSync: 'Error',
        queueSize: 0,
      };
    }
  }

  // Clear all pending data (for testing/reset)
  async clearPendingData() {
    try {
      await offlineDB.clearPendingSales();
      console.log('All pending data cleared');
      return { success: true };
    } catch (error) {
      console.error('Error clearing pending data:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if sync is needed
  async needsSync() {
    const pendingCount = await this.getPendingCount();
    return pendingCount > 0 && navigator.onLine;
  }
}

export const syncService = new SyncService();