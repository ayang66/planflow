import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { isAuthenticated, getCurrentUser, login, register, logout, upgradeToPro } from '../services/authService';

interface User {
  id: number;
  email?: string;
  phone?: string;
  is_pro?: boolean;
  pro_expires_at?: string;
  created_at?: string;
}

type LoginType = 'email' | 'phone';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPro: boolean;
  login: (credential: string, password: string, type?: LoginType) => Promise<void>;
  register: (credential: string, password: string, type?: LoginType, verificationCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  upgrade: () => Promise<void>;
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

  const handleLogin = async (credential: string, password: string, type: LoginType = 'email') => {
    try {
      const authResponse = await login(credential, password, type);
      setUser(authResponse.user);
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (credential: string, password: string, type: LoginType = 'email', verificationCode?: string) => {
    try {
      const authResponse = await register(credential, password, type, verificationCode);
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

  const handleUpgrade = async () => {
    try {
      const updatedUser = await upgradeToPro();
      setUser(updatedUser);
    } catch (error) {
      console.error('Upgrade error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      isPro: user?.is_pro || false,
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshUser,
      upgrade: handleUpgrade
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