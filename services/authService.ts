import { API_BASE_URL } from './config';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
  };
}

interface UserInfo {
  id: number;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
}

// Token 存储
const TOKEN_KEY = 'planflow_access_token';
const REFRESH_TOKEN_KEY = 'planflow_refresh_token';
const USER_KEY = 'planflow_user';

export const saveTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const saveUser = (user: { id: number; email: string }): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getUser = (): { id: number; email: string } | null => {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
};

export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getAccessToken();
};


// API 请求封装
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const accessToken = getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }
  
  let response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  
  // 如果 token 过期，尝试刷新
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    }
  }
  
  return response;
};

export const register = async (email: string, password: string): Promise<AuthResponse> => {
  // 用邮箱前缀作为用户名
  const username = email.split('@')[0];
  
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || 'Registration failed');
  }
  
  // 注册成功后自动登录获取 token
  return login(email, password);
};

export const login = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || 'Login failed');
  }
  
  const data = await response.json();
  // 后端返回 snake_case，转换为 camelCase
  const result: AuthResponse = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user: { id: 0, email }, // 后端登录不返回 user，先用占位
  };
  saveTokens(result.accessToken, result.refreshToken);
  saveUser(result.user);
  return result;
};

export const logout = async (): Promise<void> => {
  const refreshToken = getRefreshToken();
  
  try {
    await authFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuth();
  }
};

export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    
    if (!response.ok) {
      clearAuth();
      return false;
    }
    
    const data = await response.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
    return true;
  } catch (error) {
    clearAuth();
    return false;
  }
};

export const getCurrentUser = async (): Promise<UserInfo | null> => {
  try {
    const response = await authFetch('/auth/me');
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    return null;
  }
};
