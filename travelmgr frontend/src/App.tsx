import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

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
    return <div>Loading...</div>;
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LanguageProvider>
        <AuthProvider>
          <CountriesProvider>
            <AppContent />
          </CountriesProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;