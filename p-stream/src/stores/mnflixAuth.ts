import { create } from "zustand";

type MnflixUser = {
  id: string;
  email: string;
  subscriptionActive?: boolean;
  profiles?: any[];
};

type State = {
  token: string | null;
  user: MnflixUser | null;
  setAuth: (token: string, user: MnflixUser) => void;
  logout: () => void;
};

const TOKEN_KEY = "mnflix_token";
const USER_KEY = "mnflix_user";

export const useMnflixAuth = create<State>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: (() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));
