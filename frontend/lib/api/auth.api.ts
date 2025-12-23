import api from "@/lib/api/client";
import { setAuthToken, removeAuthToken } from "../token";

export const register = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  return await api.post("/auth/register", data);
};

export const login = async (data: { email: string; password: string }) => {
  const response = await api.post("/auth/login", data);
  setAuthToken(response.data.accessToken);

  return response;
};

export const logout = async () => {
  try {
    await api.post("/auth/logout");
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    removeAuthToken();
  }
};
