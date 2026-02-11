import axios from 'axios';

// Base API configuration - use relative path through nginx
const API_BASE_URL = 'http://38.242.200.152:8083/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage');
    if (token) {
      const authState = JSON.parse(token).state;
      if (authState?.token) {
        config.headers.Authorization = `Bearer ${authState.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth on 401
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (userData) => api.post('/auth/register/', userData),
  getProfile: () => api.get('/auth/profile/'),
  logout: () => api.post('/auth/logout/'),
};

// Business API calls
export const businessAPI = {
  getBusiness: () => api.get('/business/'),
  createBusiness: (data) => api.post('/business/', data),
};

// Product API calls
export const productAPI = {
  getProducts: () => api.get('/inventory/products/'),
  getProduct: (id) => api.get(`/inventory/products/${id}/`),
  createProduct: (data) => api.post('/inventory/products/', data),
  updateProduct: (id, data) => api.patch(`/inventory/products/${id}/`, data),
  deleteProduct: (id) => api.delete(`/inventory/products/${id}/delete/`),
  searchProducts: (query) => api.get(`/inventory/products/?search=${query}`),
  getLowStock: () => api.get('/inventory/products/low-stock/'),
  
  getCategories: () => api.get('/inventory/categories/'),
  createCategory: (data) => api.post('/inventory/categories/', data),
};

// Sales API calls
export const salesAPI = {
  createSale: (saleData) => api.post('/sales/sales/', saleData),
  getSales: () => api.get('/sales/sales/'),
  openShift: (startingCash) => api.post('/sales/shifts/open/', { starting_cash: startingCash }),
  closeShift: (actualCash) => api.post('/sales/shifts/close/', { actual_cash: actualCash }),
  getRecentSales: () => api.get('/sales/sales/recent/'),
};

// Analytics API calls
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getSalesTrend: () => api.get('/analytics/sales-trend/'),
  getDailySummaries: () => api.get('/analytics/daily-summaries/'),
  generateAiSummary: (date) => api.post('/analytics/generate-summary/', { date }),
};

// Owner App API calls (separate for React Native if needed)
export const ownerAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getAiSummaries: () => api.get('/analytics/daily-summaries/'),
  generateAiSummary: (date) => api.post('/analytics/generate-summary/', { date }),
};

// Dashboard API for the new DashboardPage
export const dashboardAPI = {
  getStats: () => api.get('/analytics/dashboard/'),
};

// WebSocket service for real-time updates
export const webSocketService = {
  connect: (businessId, onMessage, onError) => {
    const wsUrl = API_BASE_URL.replace('http', 'ws').replace('/api', '');
    const ws = new WebSocket(`${wsUrl}/ws/sales/${businessId}/`);
    
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => onMessage(JSON.parse(event.data));
    ws.onerror = (error) => onError(error);
    ws.onclose = () => console.log('WebSocket disconnected');
    
    return {
      disconnect: () => ws.close(),
      send: (data) => ws.send(JSON.stringify(data)),
    };
  },
};

// Sync service helper functions
export const syncAPI = {
  getPendingCount: () => {
    // This would check local IndexedDB for pending syncs
    return Promise.resolve(0); // Placeholder - implement with your offlineDB
  },
  forceSync: () => {
    // Trigger manual sync
    return Promise.resolve();
  },
};

export default api;