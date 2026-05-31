import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

// SECURE STORAGE KEYS
const TOKEN_KEY = "fixnest_auth_token";
const USER_KEY = "fixnest_auth_user";
const CUSTOM_BASE_URL_KEY = "fixnest_custom_base_url";

// Use the production Render backend URL
let BASE_URL = "https://fixnest-backend.onrender.com/api";

// Simple in-memory cache for GET requests (SWR style)
const requestCache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL_MS = 60000; // 60 seconds

export const apiService = {
  getApiBaseUrl() {
    return BASE_URL;
  },

  async initApiBaseUrl(): Promise<string> {
    // Force the production URL and update the cache so the old local IP is erased
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(CUSTOM_BASE_URL_KEY, BASE_URL);
      } else {
        await SecureStore.setItemAsync(CUSTOM_BASE_URL_KEY, BASE_URL);
      }
    } catch (e) {
      console.error("Error resetting custom API base URL:", e);
    }
    return BASE_URL;
  },

  async setApiBaseUrl(url: string): Promise<void> {
    BASE_URL = url;
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(CUSTOM_BASE_URL_KEY, url);
      } else {
        await SecureStore.setItemAsync(CUSTOM_BASE_URL_KEY, url);
      }
    } catch (e) {
      console.error("Error saving custom API base URL:", e);
    }
  },

  async clearCache() {
    for (const key in requestCache) {
      delete requestCache[key];
    }
  },

  async getHeaders(includeAuth = true): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (includeAuth) {
      const token = await this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(TOKEN_KEY);
      }
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (e) {
      console.error("Error reading token:", e);
      return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      }
    } catch (e) {
      console.error("Error writing token:", e);
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(USER_KEY);
      }
      this.clearCache(); // clear memory cache on logout
    } catch (e) {
      console.error("Error deleting credentials:", e);
    }
  },

  async getUser(): Promise<any | null> {
    try {
      if (Platform.OS === "web") {
        const u = localStorage.getItem(USER_KEY);
        return u ? JSON.parse(u) : null;
      }
      const u = await SecureStore.getItemAsync(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      }
    } catch (e) {}
  },

  async get<T>(path: string, includeAuth = true, bypassCache = false): Promise<T> {
    const cacheKey = `${BASE_URL}${path}`;
    
    // Return cached data immediately if valid and not bypassing
    if (!bypassCache && requestCache[cacheKey]) {
      const age = Date.now() - requestCache[cacheKey].timestamp;
      if (age < CACHE_TTL_MS) {
        return requestCache[cacheKey].data as T;
      }
    }

    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(cacheKey, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed with status " + response.status }));
        throw new Error(err.detail || "Request failed");
      }

      const data = await response.json();
      
      // Save to cache
      requestCache[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    } catch (err: any) {
      throw new Error(err.message === "Failed to fetch" ? "Network error. The server might be sleeping or offline." : (err.message || "Request failed"));
    }
  },

  async post<T>(path: string, body: any, includeAuth = true): Promise<T> {
    this.clearCache(); // Auto-invalidate cache on write
    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed with status " + response.status }));
        throw new Error(err.detail || "Request failed");
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message === "Failed to fetch" ? "Network error. The server might be sleeping or offline." : (err.message || "Request failed"));
    }
  },

  async put<T>(path: string, body: any, includeAuth = true): Promise<T> {
    this.clearCache();
    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(`${BASE_URL}${path}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed with status " + response.status }));
        throw new Error(err.detail || "Request failed");
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message === "Failed to fetch" ? "Network error. The server might be sleeping or offline." : (err.message || "Request failed"));
    }
  },

  async delete<T>(path: string, includeAuth = true): Promise<T> {
    this.clearCache();
    try {
      const headers = await this.getHeaders(includeAuth);
      const response = await fetch(`${BASE_URL}${path}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed with status " + response.status }));
        throw new Error(err.detail || "Request failed");
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message === "Failed to fetch" ? "Network error. The server might be sleeping or offline." : (err.message || "Request failed"));
    }
  },

  async postForm<T>(path: string, formData: FormData): Promise<T> {
    try {
      const token = await this.getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed with status " + response.status }));
        throw new Error(err.detail || "Request failed");
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message === "Failed to fetch" ? "Network error. The server might be sleeping or offline." : (err.message || "Request failed"));
    }
  }
};
