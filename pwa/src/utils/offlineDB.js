import { openDB } from 'idb';

// Create IndexedDB for offline storage
const DB_NAME = 'imanage-offline';
const DB_VERSION = 1;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Create object stores for offline data
      if (!db.objectStoreNames.contains('pendingSales')) {
        const pendingSalesStore = db.createObjectStore('pendingSales', {
          keyPath: 'offlineId',
          autoIncrement: true,
        });
        pendingSalesStore.createIndex('createdAt', 'createdAt');
      }
      
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      
      if (!db.objectStoreNames.contains('products')) {
        const productsStore = db.createObjectStore('products', {
          keyPath: 'id',
        });
        productsStore.createIndex('barcode', 'barcode');
        productsStore.createIndex('sku', 'sku');
      }
    },
  });
};

// Offline database operations
export const offlineDB = {
  // Save sale for offline sync
  savePendingSale: async (saleData) => {
    const db = await initDB();
    saleData.createdAt = new Date().toISOString();
    saleData.syncStatus = 'pending';
    return db.add('pendingSales', saleData);
  },
  
  // Get pending sales
  getPendingSales: async () => {
    const db = await initDB();
    return db.getAll('pendingSales');
  },
  
  // Delete synced sale
  deletePendingSale: async (offlineId) => {
    const db = await initDB();
    return db.delete('pendingSales', offlineId);
  },
  
  // Cache products for offline use
  cacheProducts: async (products) => {
    const db = await initDB();
    const tx = db.transaction('products', 'readwrite');
    
    // Clear existing
    await tx.store.clear();
    
    // Add new products
    for (const product of products) {
      await tx.store.put(product);
    }
    
    await tx.done;
  },
  
  // Get cached product by barcode
  getProductByBarcode: async (barcode) => {
    const db = await initDB();
    const tx = db.transaction('products', 'readonly');
    const index = tx.store.index('barcode');
    return index.get(barcode);
  },
  
  // Check if offline data exists
  hasOfflineData: async () => {
    const db = await initDB();
    const count = await db.count('pendingSales');
    return count > 0;
  },
};