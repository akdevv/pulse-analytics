import api from "@/lib/api/client";

export const register = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  const res = await api.post("/auth/register", data);

  return res;
};
