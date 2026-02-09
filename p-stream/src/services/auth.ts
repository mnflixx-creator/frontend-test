import { api } from "./api";
import type { AuthResponse, User } from "@/types/movie";

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse | null> {
  try {
    const response = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    
    // Store token in localStorage
    if (response.token) {
      const authStore = {
        state: {
          account: {
            token: response.token,
            userId: response.user.id,
            profile: {
              colorA: "#0080ff",
              colorB: "#0066cc",
              icon: "user",
            },
            nickname: response.user.name || response.user.email,
            sessionId: "",
            seed: "",
            deviceName: "web",
          },
          backendUrl: null,
          proxySet: null,
        },
        version: 0,
      };
      localStorage.setItem("__MW::auth", JSON.stringify(authStore));
    }
    
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse | null> {
  try {
    const response = await api<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: { email, password, name },
    });
    
    // Store token in localStorage
    if (response.token) {
      const authStore = {
        state: {
          account: {
            token: response.token,
            userId: response.user.id,
            profile: {
              colorA: "#0080ff",
              colorB: "#0066cc",
              icon: "user",
            },
            nickname: response.user.name || response.user.email,
            sessionId: "",
            seed: "",
            deviceName: "web",
          },
          backendUrl: null,
          proxySet: null,
        },
        version: 0,
      };
      localStorage.setItem("__MW::auth", JSON.stringify(authStore));
    }
    
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api<{ user: User }>("/api/auth/me");
    return response.user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem("__MW::auth");
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}

export function isAuthenticated(): boolean {
  try {
    const authStore = localStorage.getItem("__MW::auth");
    if (authStore) {
      const parsed = JSON.parse(authStore);
      return !!parsed?.state?.account?.token;
    }
  } catch (e) {
    console.error("Error checking authentication:", e);
  }
  return false;
}
