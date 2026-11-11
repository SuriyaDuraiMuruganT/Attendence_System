import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { api } from '../api/client';

interface AuthContextType extends AuthState {
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const logout = () => {
    localStorage.removeItem('attendance_token');
    localStorage.removeItem('attendance_user');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const login = (token: string, user: User) => {
    localStorage.setItem('attendance_token', token);
    localStorage.setItem('attendance_user', JSON.stringify(user));
    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const refreshUser = async () => {
    try {
      const user = await api.get<User>('/auth/me');
      localStorage.setItem('attendance_user', JSON.stringify(user));
      setState(prev => ({ ...prev, user, isAuthenticated: true }));
    } catch {
      logout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('attendance_token');
    const savedUser = localStorage.getItem('attendance_user');
    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setState({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        refreshUser();
      } catch {
        logout();
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
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

