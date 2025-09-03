import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CountriesProvider } from './contexts/CountriesContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Login from './components/Login';
import Register from './components/Register';
import TripList from './components/TripList';
import TripDetail from './components/TripDetail';
import { Trip } from './types';

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
  const { user, isLoading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return showRegister ? (
      <Register onSwitchToLogin={() => setShowRegister(false)} />
    ) : (
      <Login onSwitchToRegister={() => setShowRegister(true)} />
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

  return <TripList onTripSelect={setSelectedTrip} />;
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