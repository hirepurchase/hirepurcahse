import { create } from 'zustand';
import { AdminUser, Customer } from '@/types';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface AuthState {
  user: AdminUser | Customer | null;
  userType: 'admin' | 'customer' | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: AdminUser | Customer, userType: 'admin' | 'customer', token: string) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  userType: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, userType, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userType', userType);
    }

    set({
      user,
      userType,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
    }

    set({
      user: null,
      userType: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  initializeAuth: async () => {
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const userType = localStorage.getItem('userType') as 'admin' | 'customer' | null;

    if (!token || !userStr || !userType) {
      set({ isLoading: false });
      return;
    }

    let cachedUser: AdminUser | Customer;
    try {
      cachedUser = JSON.parse(userStr);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
      set({ isLoading: false });
      return;
    }

    // Restore from cache immediately so the app is usable right away
    set({ user: cachedUser, userType, token, isAuthenticated: true, isLoading: false });

    // Then re-fetch from server to pick up any permission/role changes since last login
    const meEndpoint = userType === 'admin' ? '/auth/admin/me' : '/auth/customer/me';
    try {
      const res = await axios.get(`${API_BASE_URL}${meEndpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const freshUser = res.data;
      localStorage.setItem('user', JSON.stringify(freshUser));
      set({ user: freshUser });
    } catch {
      // Server unreachable or token expired — keep the cached user as-is
    }
  },
}));
