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
}

export const syncService = new SyncService();