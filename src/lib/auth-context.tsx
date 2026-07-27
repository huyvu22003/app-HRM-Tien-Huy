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
import type { Role } from "@/lib/data/accounts";
import { ROLE_META, type RoleMeta } from "@/lib/data/config";
import {
  apiLogin,
  apiLogout,
  apiMe,
  getToken,
  clearToken,
  type ApiUser,
} from "@/lib/api";

const FALLBACK_KEY = "hrm_tien_huy_user";

export interface AuthUser {
  id: number;
  employeeId: number | null;
  phone: string;
  name: string;
  role: Role;
  department: string;
  code: string;
  email: string;
  photoUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  roleMeta: RoleMeta | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function apiUserToAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    employeeId: u.employee_id,
    phone: u.phone,
    name: u.name || u.phone,
    role: u.role as Role,
    department: "",
    code: "",
    email: "",
    photoUrl: u.photo_url ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- init-only guard
      setIsLoading(false);
      return;
    }

    apiMe()
      .then((res) => {
        setUser(apiUserToAuthUser(res.user));
      })
      .catch(() => {
        clearToken();
        try {
          const cached = window.localStorage.getItem(FALLBACK_KEY);
          if (cached) {
            setUser(JSON.parse(cached));
          }
        } catch {
          // ignore
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const res = await apiLogin(phone, password);
      const authUser = apiUserToAuthUser(res.user);
      setUser(authUser);
      try {
        window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(authUser));
      } catch {
        // ignore
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại.";
      return { success: false, message: msg };
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout().catch(() => {});
    setUser(null);
    try {
      window.localStorage.removeItem(FALLBACK_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const role = user?.role ?? null;
    return {
      user,
      role,
      roleMeta: role ? ROLE_META[role] : null,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    };
  }, [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
