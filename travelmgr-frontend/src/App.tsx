/**
 * Application shell without React Router — navigation is driven by local React state.
 *
 * - Regular users: TripList ↔ TripDetail via `selectedTrip`.
 * - Admins: AdminPanel only (TripDetail opens read-only for inspection).
 * - Password reset: reads `resetToken` from the URL once, then clears the query string.
 */
import React, { useEffect, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { appTheme } from './theme';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FeaturesProvider } from './contexts/FeaturesContext';
import { CountriesProvider } from './contexts/CountriesContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import AdminPanel from './components/AdminPanel';
import { logout } from './services/auth';
import { Trip } from './types';

type AuthView = 'login' | 'register' | 'forgot' | 'reset';

const AppContent: React.FC = () => {
  const { user, setUser, isLoading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('resetToken');
    if (token) {
      setResetToken(token);
      setAuthView('reset');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setSelectedTrip(null);
  };

  if (isLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!user) {
    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'reset' && resetToken) {
      return (
        <ResetPassword
          token={resetToken}
          onBackToLogin={() => {
            setResetToken(null);
            setAuthView('login');
          }}
        />
      );
    }
    return (
      <Login
        onSwitchToRegister={() => setAuthView('register')}
        onForgotPassword={() => setAuthView('forgot')}
      />
    );
  }

  if (isAdmin) {
    if (selectedTrip) {
      return (
        <TripDetail
          tripId={selectedTrip.id}
          onBack={() => setSelectedTrip(null)}
          readOnly
        />
      );
    }

    return (
      <AdminPanel
        onLogout={handleLogout}
        onTripSelect={setSelectedTrip}
      />
    );
  }

  if (selectedTrip) {
    return (
      <TripDetail
        tripId={selectedTrip.id}
        onBack={() => setSelectedTrip(null)}
      />
    );
  }

  return (
    <TripList
      onTripSelect={setSelectedTrip}
    />
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      <LanguageProvider>
        <FeaturesProvider>
          <AuthProvider>
            <CountriesProvider>
              <AppContent />
            </CountriesProvider>
          </AuthProvider>
        </FeaturesProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;