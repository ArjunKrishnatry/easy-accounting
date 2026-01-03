import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

interface User {
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const storedToken = localStorage.getItem('authToken');

    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${storedToken}`
        }
      });

      if (response.data.ok && response.data.user) {
        setToken(storedToken);
        setUser(response.data.user);
      } else {
        // Invalid token, clear it
        localStorage.removeItem('authToken');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', {
        entered_name: username,
        entered_password: password
      });

      if (response.data.ok && response.data.token) {
        const { token: newToken, user: userData } = response.data;

        // Store token
        localStorage.setItem('authToken', newToken);
        setToken(newToken);
        setUser(userData);

        return { success: true };
      } else {
        return {
          success: false,
          error: response.data.message || 'Invalid credentials'
        };
      }
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.response?.status === 401 || error.response?.status === 403) {
        return { success: false, error: 'Invalid username or password' };
      }

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        return { success: false, error: 'Cannot connect to server. Please ensure the backend is running.' };
      }

      return { success: false, error: 'An error occurred. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/api/auth/logout', {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state
      localStorage.removeItem('authToken');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
