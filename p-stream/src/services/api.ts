import { ofetch } from "ofetch";

import { conf } from "@/setup/config";

// Default API base URL fallback
const DEFAULT_API_URL = "http://localhost:4000";

// Get API base URL from config
export function getApiUrl(): string {
  const config = conf();
  return config.API_URL || config.BACKEND_URL || DEFAULT_API_URL;
}

// Get auth token from localStorage
export function getAuthToken(): string | null {
  try {
    const authStore = localStorage.getItem("__MW::auth");
    if (authStore) {
      const parsed = JSON.parse(authStore);
      return parsed?.state?.account?.token || null;
    }
  } catch (e) {
    console.error("Error getting auth token:", e);
  }
  return null;
}

// Create API client with auth headers
export const api = ofetch.create({
  baseURL: getApiUrl(),
  onRequest({ options }) {
    const token = getAuthToken();
    if (token) {
      (options.headers as any) = {
        ...(options.headers as any),
        Authorization: `Bearer ${token}`,
      };
    }
  },
  onResponseError({ response }) {
    console.error("API Error:", response.status, response._data);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear auth and redirect to login
      localStorage.removeItem("__MW::auth");
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }
    }
  },
});

// API helper functions
export async function get<T>(endpoint: string): Promise<T> {
  return api<T>(endpoint, { method: "GET" });
}

export async function post<T>(endpoint: string, data?: any): Promise<T> {
  return api<T>(endpoint, { method: "POST", body: data });
}

export async function put<T>(endpoint: string, data?: any): Promise<T> {
  return api<T>(endpoint, { method: "PUT", body: data });
}

export async function del<T>(endpoint: string): Promise<T> {
  return api<T>(endpoint, { method: "DELETE" });
}
