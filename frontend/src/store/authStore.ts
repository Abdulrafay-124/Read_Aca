import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: object | null;
  setAuth: (accessToken: string | null, refreshToken: string | null, user: object | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  setAuth: (accessToken, refreshToken, user) => set({
    accessToken,
    refreshToken,
    user,
  }),
  clearAuth: () => set({
    accessToken: null,
    refreshToken: null,
    user: null,
  }),
}));
