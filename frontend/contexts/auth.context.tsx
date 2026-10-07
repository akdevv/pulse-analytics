"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "@/lib/api/auth.api";
import { setAccessToken, setApiAdapter } from "@/lib/api/client";
import { exitDemo, isDemo as inDemoMode } from "@/lib/demo/mode";
import type { User } from "@/lib/types/user.types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemo] = useState(inDemoMode);

  useEffect(() => {
    const ready = isDemo
      ? import("@/lib/demo/adapter").then((m) => setApiAdapter(m.demoAdapter))
      : Promise.resolve();

    ready
      .then(() => authApi.refreshSession())
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
  }, [isDemo]);

  const startSession = useCallback(
    async (session: Promise<{ accessToken: string }>) => {
      const { accessToken } = await session;
      setAccessToken(accessToken);
      setUser(await authApi.getMe());
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isDemo,
      login: (email, password) => startSession(authApi.login(email, password)),
      register: (name, email, password) =>
        startSession(authApi.register(name, email, password)),
      refreshUser: async () => setUser(await authApi.getMe()),
      logout: async () => {
        if (isDemo) return exitDemo("/");
        try {
          await authApi.logout();
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      },
    }),
    [user, isLoading, isDemo, startSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
