import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isAuthenticated, getCurrentUser, login, register, logout } from '../services/authService';

interface User {
  id: number;
  email: string;
  createdAt?: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 检查认证状态
  useEffect(() => {
    const checkAuthStatus = async () => {
      if (isAuthenticated()) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Failed to get current user:', error);
          // Token可能已过期，清除本地存储
          await logout();
        }
      }
      setIsLoading(false);
    };

    checkAuthStatus();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      const authResponse = await login(email, password);
      setUser(authResponse.user);
    } catch (error) {
      // 不设置 isLoading，让 AuthView 自己管理 loading 状态
      throw error;
    }
  };

  const handleRegister = async (email: string, password: string) => {
    try {
      const authResponse = await register(email, password);
      setUser(authResponse.user);
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // 即使后端登出失败，也清除本地状态
      setUser(null);
    }
    setIsLoading(false);
  };

  const refreshUser = async () => {
    if (isAuthenticated()) {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        await handleLogout();
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};