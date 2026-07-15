"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ACCOUNTS, type Account, type Role } from "@/lib/data/accounts";
import { ROLE_META, type RoleMeta } from "@/lib/data/config";

const STORAGE_KEY = "hrm_tien_huy_auth";

interface AuthState {
  user: Account | null;
}

interface AuthContextValue {
  user: Account | null;
  role: Role | null;
  roleMeta: RoleMeta | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthState;
        if (parsed?.user?.phone && ACCOUNTS[parsed.user.phone]) {
          setState({ user: ACCOUNTS[parsed.user.phone] });
        }
      }
    } catch {
      // ignore malformed storage
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((phone: string, password: string) => {
    const account = ACCOUNTS[phone];
    if (!account) {
      return { success: false, message: "Số điện thoại không tồn tại." };
    }
    if (account.password !== password) {
      return { success: false, message: "Mật khẩu không chính xác." };
    }
    setState({ user: account });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: account }));
    } catch {
      // ignore storage failures (e.g. private mode)
    }
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setState({ user: null });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = state.user?.role ?? null;
    return {
      user: state.user,
      role,
      roleMeta: role ? ROLE_META[role] : null,
      isAuthenticated: !!state.user,
      isLoading,
      login,
      logout,
    };
  }, [state.user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
