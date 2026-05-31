import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import Constants from "expo-constants";

// SECURE STORAGE KEYS
const TOKEN_KEY = "fixnest_auth_token";
const USER_KEY = "fixnest_auth_user";
const CUSTOM_BASE_URL_KEY = "fixnest_custom_base_url";

// Use the production Render backend URL
let BASE_URL = "https://fixnest-backend.onrender.com/api";

export const apiService = {
  getApiBaseUrl() {
    return BASE_URL;
  },

  async initApiBaseUrl(): Promise<string> {
    try {
      let storedUrl = null;
      if (Platform.OS === "web") {
        storedUrl = localStorage.getItem(CUSTOM_BASE_URL_KEY);
      } else {
        storedUrl = await SecureStore.getItemAsync(CUSTOM_BASE_URL_KEY);
      }
      if (storedUrl) {
        BASE_URL = storedUrl;
      }
    } catch (e) {
      console.error("Error loading custom API base URL:", e);
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

  async get<T>(path: string, includeAuth = true): Promise<T> {
    const headers = await this.getHeaders(includeAuth);
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }

    return response.json() as Promise<T>;
  },

  async post<T>(path: string, body: any, includeAuth = true): Promise<T> {
    const headers = await this.getHeaders(includeAuth);
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }

    return response.json() as Promise<T>;
  },

  async put<T>(path: string, body: any, includeAuth = true): Promise<T> {
    const headers = await this.getHeaders(includeAuth);
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }

    return response.json() as Promise<T>;
  },

  async delete<T>(path: string, includeAuth = true): Promise<T> {
    const headers = await this.getHeaders(includeAuth);
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "DELETE",
      headers,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }

    return response.json() as Promise<T>;
  },

  async postForm<T>(path: string, formData: FormData): Promise<T> {
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
      const err = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(err.detail || "Request failed");
    }

    return response.json() as Promise<T>;
  }
};
