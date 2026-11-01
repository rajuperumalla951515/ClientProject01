import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { api } from '../services/api';

interface AdminAuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const existingToken = api.getToken();
    const existingUser = api.getUser();

    if (existingToken && existingUser && existingUser.role === 'admin') {
      setToken(existingToken);
      setAdmin(existingUser);
    } else {
      api.clearSession();
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const authData = await api.login(email, password);
    setToken(authData.access_token);
    setAdmin(authData.user);
  };

  const logout = () => {
    api.clearSession();
    setToken(null);
    setAdmin(null);
    window.location.href = '/login';
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
};
