import axios from 'axios';

// Base API configuration - use relative path through nginx
const API_BASE_URL = 'http://localhost/api';

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
  login: (email, password) => api.post('/token/', { email, password }),
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
  searchProducts: (query) => api.get(`/inventory/products/?search=${query}`),
  getLowStock: () => api.get('/inventory/products/low-stock/'),
};

// Sales API calls
export const salesAPI = {
  createSale: (saleData) => api.post('/sales/sales/', saleData),
  getSales: () => api.get('/sales/sales/'),
  openShift: (startingCash) => api.post('/sales/shifts/open/', { starting_cash: startingCash }),
  closeShift: (actualCash) => api.post('/sales/shifts/close/', { actual_cash: actualCash }),
};

// Analytics API calls
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard/'),
  getSalesTrend: () => api.get('/analytics/sales-trend/'),
};

export default api;