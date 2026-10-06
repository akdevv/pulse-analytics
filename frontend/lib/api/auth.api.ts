import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { User } from "@/lib/types/user.types";

type Session = { accessToken: string };

export const refreshSession = () => apiPost<Session>("/auth/refresh");

export const getMe = () => apiGet<User>("/auth/me");

export const login = (email: string, password: string) =>
  apiPost<Session>("/auth/login", { email, password });

export const register = (name: string, email: string, password: string) =>
  apiPost<Session>("/auth/register", { name, email, password });

export const logout = () => apiPost("/auth/logout");

export const updateMe = (data: { name?: string; email?: string }) =>
  apiPatch<User>("/auth/me", data);

export const changePassword = (password: string) =>
  apiPatch<User>("/auth/me", { password });
