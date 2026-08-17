import { create } from 'zustand';
import * as authApi from '../api/auth';
import {
  clearAuthStorage,
  getStoredToken,
  setRememberMe,
  setStoredToken,
} from '../lib/tokenStorage';
import type { MeResponse } from '../types/auth';

interface AuthState {
  token: string | null;
  user: MeResponse | null;
  initialized: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearMustChangePassword: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  initialized: false,
  hydrating: false,

  clearSession: () => {
    clearAuthStorage();
    set({ token: null, user: null });
  },

  hydrate: async () => {
    if (get().initialized || get().hydrating) {
      return;
    }

    const storedToken = getStoredToken();
    if (!storedToken) {
      set({ initialized: true, token: null, user: null });
      return;
    }

    set({ hydrating: true, token: storedToken });

    try {
      const user = await authApi.fetchMe();
      set({ user, token: storedToken, initialized: true, hydrating: false });
    } catch {
      get().clearSession();
      set({ initialized: true, hydrating: false });
    }
  },

  login: async (username, password, remember) => {
    setRememberMe(remember);
    const result = await authApi.login({
      username,
      password,
      portal: 'tenant',
    });
    setStoredToken(result.access_token);
    const user = await authApi.fetchMe();
    set({ token: result.access_token, user, initialized: true });
  },

  logout: async () => {
    try {
      if (get().token) {
        await authApi.logout();
      }
    } catch {
      // stateless logout — ignore network errors
    } finally {
      get().clearSession();
      set({ initialized: true });
    }
  },

  refreshUser: async () => {
    const user = await authApi.fetchMe();
    set({ user });
  },

  clearMustChangePassword: () => {
    const user = get().user;
    if (user?.must_change_password) {
      set({ user: { ...user, must_change_password: false } });
    }
  },
}));
