let dbInstance = null;
let useLocalStorageFallback = false;

// Check if IndexedDB is available
const isIndexedDBAvailable = async () => {
  try {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return false;
    }
    
    // Test with a temporary database
    return new Promise((resolve) => {
      const testDBName = 'imanage-test-db-' + Date.now();
      const request = indexedDB.open(testDBName, 1);
      
      request.onerror = () => {
        indexedDB.deleteDatabase(testDBName);
        resolve(false);
      };
      
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase(testDBName);
        resolve(true);
      };
      
      request.onupgradeneeded = (e) => {
        e.target.transaction.abort();
      };
    });
  } catch {
    return false;
  }
};

// Initialize database with fallback
const initDB = async () => {
  if (dbInstance && !useLocalStorageFallback) return dbInstance;
  
  try {
    const isAvailable = await isIndexedDBAvailable();
    
    if (!isAvailable) {
      useLocalStorageFallback = true;
      console.warn('IndexedDB unavailable, using localStorage fallback');
      return null;
    }
    
    dbInstance = await import('idb').then(({ openDB }) => 
      openDB('imanage-offline', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('pendingSales')) {
            const pendingSalesStore = db.createObjectStore('pendingSales', {
              keyPath: 'offlineId',
              autoIncrement: true,
            });
            pendingSalesStore.createIndex('createdAt', 'createdAt');
          }
        },
      })
    );
    
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error);
    useLocalStorageFallback = true;
    return null;
  }
};

// LocalStorage fallback functions
const localStorageFallback = {
  savePendingSale: async (saleData) => {
    const sales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
    const offlineId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    saleData.offlineId = offlineId;
    saleData.createdAt = new Date().toISOString();
    saleData.syncStatus = 'pending';
    sales.push(saleData);
    localStorage.setItem('pendingSales', JSON.stringify(sales));
    return offlineId;
  },
  
  getPendingSales: async () => {
    return JSON.parse(localStorage.getItem('pendingSales') || '[]');
  },
  
  deletePendingSale: async (offlineId) => {
    const sales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
    const filtered = sales.filter(sale => sale.offlineId !== offlineId);
    localStorage.setItem('pendingSales', JSON.stringify(filtered));
  },
  
  hasOfflineData: async () => {
    const sales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
    return sales.length > 0;
  },
};

// Offline database operations with automatic fallback
export const offlineDB = {
  savePendingSale: async (saleData) => {
    const db = await initDB();
    if (!db || useLocalStorageFallback) {
      return localStorageFallback.savePendingSale(saleData);
    }
    
    try {
      saleData.createdAt = new Date().toISOString();
      saleData.syncStatus = 'pending';
      const offlineId = await db.add('pendingSales', saleData);
      return offlineId;
    } catch (error) {
      console.error('IndexedDB save failed, using localStorage:', error);
      useLocalStorageFallback = true;
      return localStorageFallback.savePendingSale(saleData);
    }
  },
  
  getPendingSales: async () => {
    const db = await initDB();
    if (!db || useLocalStorageFallback) {
      return localStorageFallback.getPendingSales();
    }
    
    try {
      return await db.getAll('pendingSales');
    } catch (error) {
      console.error('IndexedDB read failed, using localStorage:', error);
      useLocalStorageFallback = true;
      return localStorageFallback.getPendingSales();
    }
  },
  
  deletePendingSale: async (offlineId) => {
    const db = await initDB();
    if (!db || useLocalStorageFallback) {
      return localStorageFallback.deletePendingSale(offlineId);
    }
    
    try {
      return await db.delete('pendingSales', offlineId);
    } catch (error) {
      console.error('IndexedDB delete failed, using localStorage:', error);
      useLocalStorageFallback = true;
      return localStorageFallback.deletePendingSale(offlineId);
    }
  },
  
  hasOfflineData: async () => {
    const db = await initDB();
    if (!db || useLocalStorageFallback) {
      return localStorageFallback.hasOfflineData();
    }
    
    try {
      const count = await db.count('pendingSales');
      return count > 0;
    } catch (error) {
      console.error('IndexedDB count failed, using localStorage:', error);
      useLocalStorageFallback = true;
      return localStorageFallback.hasOfflineData();
    }
  },
  
  // Cache products for offline use (simplified for fallback)
  cacheProducts: async (products) => {
    // Just store in localStorage for fallback
    localStorage.setItem('cachedProducts', JSON.stringify(products));
    
    const db = await initDB();
    if (!db || useLocalStorageFallback) return;
    
    try {
      const tx = db.transaction('products', 'readwrite');
      await tx.store.clear();
      for (const product of products) {
        await tx.store.put(product);
      }
      await tx.done;
    } catch (error) {
      console.error('Failed to cache products:', error);
    }
  },
  
  getProductByBarcode: async (barcode) => {
    // Check localStorage first
    const cached = JSON.parse(localStorage.getItem('cachedProducts') || '[]');
    const fromLocalStorage = cached.find(p => p.barcode === barcode);
    if (fromLocalStorage) return fromLocalStorage;
    
    const db = await initDB();
    if (!db || useLocalStorageFallback) return null;
    
    try {
      const tx = db.transaction('products', 'readonly');
      const index = tx.store.index('barcode');
      return index.get(barcode);
    } catch (error) {
      return null;
    }
  },
  
  // Clear all pending data
  clearPendingSales: async () => {
    localStorage.removeItem('pendingSales');
    
    const db = await initDB();
    if (!db || useLocalStorageFallback) return;
    
    try {
      const tx = db.transaction('pendingSales', 'readwrite');
      await tx.store.clear();
      await tx.done;
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  },
  
  // Get pending count (for dashboard)
  getPendingCount: async () => {
    const db = await initDB();
    if (!db || useLocalStorageFallback) {
      const sales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
      return sales.length;
    }
    
    try {
      return await db.count('pendingSales');
    } catch (error) {
      const sales = JSON.parse(localStorage.getItem('pendingSales') || '[]');
      return sales.length;
    }
  },
};