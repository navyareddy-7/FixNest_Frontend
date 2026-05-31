import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { apiService } from "../services/api";
import { User, AuthResponse, UserRole } from "../types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; phone_number?: string; password?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadStoredCredentials();
  }, []);

  const loadStoredCredentials = async () => {
    try {
      // Load custom API Base URL if configured
      await apiService.initApiBaseUrl();
      
      const storedToken = await apiService.getToken();
      if (storedToken) {
        setToken(storedToken);
        try {
          const profile = await apiService.get<User>("/auth/me");
          setUser(profile);
        } catch (err) {
          console.error("Session expired, logging out:", err);
          await apiService.removeToken();
          setToken(null);
          setUser(null);
        }
      }
    } catch (e) {
      console.error("Failed to load credentials:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await fetch(`${apiService.getApiBaseUrl()}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Login failed" }));
        throw new Error(err.detail || "Incorrect email or password");
      }

      const data = (await response.json()) as AuthResponse;
      
      await apiService.setToken(data.access_token);
      await apiService.setUser(data.user);
      setToken(data.access_token);
      setUser(data.user);

      // Redirect to correct dashboard based on role
      redirectUser(data.user.role);

      return data.user;
    } catch (err: any) {
      console.error("Login service error:", err);
      throw new Error(err.message || "Incorrect email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.removeToken();
      setToken(null);
      setUser(null);
      router.replace("/" as any);
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: {
    full_name?: string;
    phone_number?: string;
    password?: string;
  }) => {
    try {
      const updatedUser = await apiService.put<User>("/auth/me", updates);
      setUser(updatedUser);
    } catch (err: any) {
      console.error("Profile update failed:", err);
      throw new Error(err.message || "Profile update failed");
    }
  };

  const redirectUser = (role: UserRole) => {
    router.replace("/dashboard" as any);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
