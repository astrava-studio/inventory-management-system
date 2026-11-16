import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('inventory_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('inventory_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !localStorage.getItem('inventory_token'));

  useEffect(() => {
    const savedToken = localStorage.getItem('inventory_token');
    const savedUser = localStorage.getItem('inventory_user');

    if (savedToken && savedUser) {
      api.get<{ user: User }>('/auth/me')
        .then((res) => {
          setUser(res.user);
          localStorage.setItem('inventory_user', JSON.stringify(res.user));
        })
        .catch(() => {
          logout();
        });
      return;
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    sessionStorage.clear();
    localStorage.setItem('inventory_token', newToken);
    localStorage.setItem('inventory_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('inventory_token');
    localStorage.removeItem('inventory_user');
    sessionStorage.clear();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updatedFields };
      localStorage.setItem('inventory_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
