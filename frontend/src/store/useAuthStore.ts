import { create } from 'zustand';
import { api } from '../services/api';

export type Role = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: Role;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get<User>('/auth/me');
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore
    }
    localStorage.removeItem('auth_token');
    set({ user: null, isAuthenticated: false });
  },
}));

if (typeof window !== 'undefined') {
  const win = window as unknown as { __AUTH_LISTENER_REGISTERED__?: boolean };
  if (!win.__AUTH_LISTENER_REGISTERED__) {
    window.addEventListener('auth-unauthorized', () => {
      useAuthStore.getState().setUser(null);
    });
    win.__AUTH_LISTENER_REGISTERED__ = true;
  }
}
