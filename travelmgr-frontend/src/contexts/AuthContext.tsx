/**
 * Client-side auth state backed by the session cookie.
 *
 * On startup we validate the cookie via `/auth/verify` — user profile is not persisted
 * in browser storage (Sonar: avoid tainted data in localStorage).
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

  const handleSetUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const verifiedUser = await verifySession();
      if (!active) return;
      handleSetUser(verifiedUser);
      setIsLoading(false);
    };

    bootstrap();

    const onSessionExpired = () => {
      handleSetUser(null);
    };
    window.addEventListener('auth:session-expired', onSessionExpired);

    return () => {
      active = false;
      window.removeEventListener('auth:session-expired', onSessionExpired);
    };
  }, [handleSetUser]);

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
