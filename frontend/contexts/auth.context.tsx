"use client";

import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "@/lib/api/auth.api";
import { setAccessToken } from "@/lib/api/client";
import type { User } from "@/lib/types/user.types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On every page load, try to restore session via the cookie
    authApi
      .refreshSession()
      .then(({ accessToken }) => {
        setAccessToken(accessToken);
        return authApi.getMe();
      })
      .then(setUser)
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { accessToken } = await authApi.login(email, password);
    setAccessToken(accessToken);
    setUser(await authApi.getMe());
  };

  const register = async (name: string, email: string, password: string) => {
    const { accessToken } = await authApi.register(name, email, password);
    setAccessToken(accessToken);
    setUser(await authApi.getMe());
  };

  // Re-read the profile after it changes (account page saves)
  const refreshUser = async () => {
    setUser(await authApi.getMe());
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const authValues: AuthContextValue = {
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={authValues}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
