import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Check for token in URL (from OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (token) {
        // Save token and clean URL
        localStorage.setItem('jwt_token', token);
        api.setToken(token);
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Try to load token from localStorage
      const savedToken = localStorage.getItem('jwt_token');
      if (savedToken) {
        api.setToken(savedToken);
        await fetchCurrentUser();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      localStorage.removeItem('jwt_token');
      api.setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('jwt_token');
      api.setToken(null);
      throw error;
    }
  };

  const login = () => {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
