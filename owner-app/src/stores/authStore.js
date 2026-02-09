import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      businessId: null,
      
      login: (userData, token) => set({ user: userData, token }),
      logout: () => set({ user: null, token: null, businessId: null }),
      setBusinessId: (id) => set({ businessId: id }),
      
      isAuthenticated: () => !!get().token,
      hasRole: (role) => {
        const user = get().user;
        return user?.role === role || user?.role === 'owner';
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);