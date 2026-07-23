/**
 * Client-side auth state mirrored to localStorage for fast UI restore on refresh.
 *
 * The real session is the HTTP cookie (`withCredentials` on API calls). On startup we
 * validate the cookie via `/auth/verify` instead of trusting localStorage alone.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { verifySession } from '../services/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const handleSetUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      localStorage.setItem('user', JSON.stringify(nextUser));
    } else {
      localStorage.removeItem('user');
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const verifiedUser = await verifySession();
      if (!active) return;
      if (verifiedUser) {
        handleSetUser(verifiedUser);
      } else {
        clearUser();
      }
      setIsLoading(false);
    };

    bootstrap();

    const onSessionExpired = () => {
      clearUser();
    };
    window.addEventListener('auth:session-expired', onSessionExpired);

    return () => {
      active = false;
      window.removeEventListener('auth:session-expired', onSessionExpired);
    };
  }, [clearUser, handleSetUser]);

  const value = useMemo(
    () => ({ user, setUser: handleSetUser, isLoading }),
    [user, handleSetUser, isLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
