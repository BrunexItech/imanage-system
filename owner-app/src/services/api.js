import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://38.242.200.152:8004/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get token from AsyncStorage
const getToken = async () => {
  try {
    const authData = await AsyncStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.token;
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
  return null;
};

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('auth-storage');
    }
    return Promise.reject(error);
  }
);

export const ownerAPI = {
  // Auth
  login: (email, password) => api.post('/auth/login/', { email, password }),
  
  // Dashboard data
  getDashboard: () => api.get('/analytics/dashboard/'),
  getSalesTrend: () => api.get('/analytics/sales-trend/'),
  getDailySummaries: () => api.get('/analytics/daily-summaries/'),
  
  // Business info
  getBusiness: () => api.get('/business/'),
  
  // Real-time sales
  getLiveSales: () => api.get('/sales/sales/?limit=10'),
  
  // AI endpoints
  generateAiSummary: (date) => api.post('/analytics/ai/generate-summary/', { date }),
  getAiSummaries: (params = {}) => {
    const { startDate, endDate } = params;
    let url = '/analytics/ai/summaries/';
    const queryParams = [];
    if (startDate) queryParams.push(`start_date=${startDate}`);
    if (endDate) queryParams.push(`end_date=${endDate}`);
    if (queryParams.length > 0) url += `?${queryParams.join('&')}`;
    return api.get(url);
  },
};

// WebSocket service
export const webSocketService = {
  connect: (businessId, onMessage, onError) => {
    const wsUrl = `ws://38.242.200.152:8004/ws/sales/${businessId}/`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('WebSocket Connected');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) onError(error);
    };
    ws.onclose = () => console.log('WebSocket Disconnected');
    
    return {
      disconnect: () => ws.close(),
      send: (data) => ws.send(JSON.stringify(data)),
    };
  },
};

export default api;