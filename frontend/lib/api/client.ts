import axios, { type AxiosRequestConfig } from "axios";

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

/** Every API route answers with this shape. */
export type Envelope<T> = { status: string; message: string; data: T };

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Waiters parked while a token refresh is in flight. They carry `reject` too:
// a failed refresh used to leave every queued request pending forever, so the
// components that made them sat in loading with nothing to render.
type Waiter = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};

let isRefreshing = false;
let refreshQueue: Waiter[] = [];

const drainQueue = (err: unknown, token?: string) => {
  for (const waiter of refreshQueue) {
    if (token) waiter.resolve(token);
    else waiter.reject(err);
  }
  refreshQueue = [];
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    const isRefreshEndpoint = original.url?.includes("/auth/refresh");

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !isRefreshEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (newToken) => {
              original.headers.Authorization = `Bearer ${newToken}`;
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
        const newToken = res.data.accessToken;
        setAccessToken(newToken);
        drainQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
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

    return Promise.reject(error);
  }
);

/* The response interceptor above already returned `response.data`, so what a
   caller receives is the envelope — not an AxiosResponse, whatever the axios
   types say. These helpers state that, and hand back the payload inside it.
   Reach for `api` directly only when you need `message` off the envelope. */

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

export default api;
