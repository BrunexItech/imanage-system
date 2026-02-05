import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Authentication store with offline persistence
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      business: null,
      
      // Login action
      login: (userData, token) => set({ user: userData, token }),
      
      // Logout action
      logout: () => set({ user: null, token: null, business: null }),
      
      // Set business
      setBusiness: (business) => set({ business }),
      
      // Check if authenticated
      isAuthenticated: () => !!get().token,
      
      // Check user role
      hasRole: (role) => {
        const user = get().user;
        return user?.role === role || user?.role === 'owner';
      },
    }),
    {
      name: 'auth-storage', // LocalStorage key
      storage: createJSONStorage(() => localStorage), // Use localStorage for PWA
    }
  )
);