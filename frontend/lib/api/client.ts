import axios, { type AxiosAdapter, type AxiosRequestConfig } from "axios";

type Envelope<T> = { status: string; message: string; data: T };

type Waiter = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let accessToken: string | null = null;
let isRefreshing = false;
let refreshQueue: Waiter[] = [];

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export const setApiAdapter = (adapter: AxiosAdapter) => {
  api.defaults.adapter = adapter;
};

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

function drainQueue(err: unknown, token?: string) {
  for (const waiter of refreshQueue) {
    if (token) waiter.resolve(token);
    else waiter.reject(err);
  }
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    const shouldRefresh =
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/auth/refresh");

    if (!shouldRefresh) return Promise.reject(error);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res: Envelope<{ accessToken: string }> =
        await api.post("/auth/refresh");
      const token = res.data.accessToken;
      setAccessToken(token);
      drainQueue(null, token);
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch {
      setAccessToken(null);
      drainQueue(error);
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

// The response interceptor unwraps axios responses, so callers receive the envelope.
export const apiGet = <T>(url: string, config?: AxiosRequestConfig) =>
  api.get<never, Envelope<T>>(url, config).then((r) => r.data);

export const apiPost = <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
) => api.post<never, Envelope<T>>(url, body, config).then((r) => r.data);

export const apiPut = <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
) => api.put<never, Envelope<T>>(url, body, config).then((r) => r.data);

export const apiPatch = <T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
) => api.patch<never, Envelope<T>>(url, body, config).then((r) => r.data);

export const apiDelete = <T = void>(url: string, config?: AxiosRequestConfig) =>
  api.delete<never, Envelope<T>>(url, config).then((r) => r.data);
