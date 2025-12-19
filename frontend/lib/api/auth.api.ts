import api from "@/lib/api/client";

export const register = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  return await api.post("/auth/register", data);
};

export const login = async (data: { email: string; password: string }) => {
  return await api.post("/auth/login", data);
};
