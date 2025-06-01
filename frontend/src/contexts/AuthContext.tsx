import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '../types';
import { userAPI, authAPI } from '../services/api';

interface AdminData {
  users: User[];
  lastFetched: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState<AdminData>({ users: [], lastFetched: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserData = async () => {
    try {
      const currentUser = await userAPI.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const updateUser = (updatedUserData: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUserData };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        
        if (savedUser && savedToken) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setToken(savedToken);
          setIsAuthenticated(true);

          // Refresh user data
          await refreshUserData();
          
          // If admin, preload admin data
          if (parsedUser.role === 'admin') {
            await preloadAdminData();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const preloadAdminData = async () => {
    try {
      const now = Date.now();
      if (now - adminData.lastFetched < CACHE_DURATION && adminData.users.length > 0) {
        return adminData.users;
      }

      const users = await userAPI.getAllUsers();
      if (Array.isArray(users)) {
        setAdminData({
          users,
          lastFetched: now
        });
        return users;
      }
      return [];
    } catch (error) {
      console.error('Error preloading admin data:', error);
      throw error;
    }
  };

  const login = async (response: any, accessToken: string) => {
    try {
      if (!response.user || !accessToken) {
        throw new Error('Invalid response data');
      }

      // Set auth state
      setUser(response.user);
      setToken(accessToken);
      setIsAuthenticated(true);
      
      // Save to localStorage
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', accessToken);

      // If admin, preload data
      if (response.user.role === 'admin') {
        await preloadAdminData();
      }
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  const logout = () => {
    try {
      authAPI.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setAdminData({ users: [], lastFetched: 0 });
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  };

  const getUsers = () => adminData.users;

  const refreshUsers = async () => {
    return await preloadAdminData();
  };

  const clearCache = () => {
    setAdminData({ users: [], lastFetched: 0 });
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshUserData,
    getUsers,
    refreshUsers,
    clearCache
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
