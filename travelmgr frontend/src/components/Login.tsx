import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { login } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoginCredentials } from '../types';
import LanguageSelector from './LanguageSelector';

interface LoginProps {
  onSwitchToRegister: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(credentials);
      setUser(user);
    } catch {
      setError(t('invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Travel Manager
      </Typography>
      <LanguageSelector />
      <Typography variant="h6" gutterBottom align="center">
        {t('login')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label={t('username')}
          value={credentials.username}
          onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label={t('auth_credential_label')}
          type="password"
          value={credentials.password}
          onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
          margin="normal"
          required
        />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
          {loading ? t('logging_in') : t('login')}
        </Button>
        <Button fullWidth variant="text" onClick={onSwitchToRegister}>
          {t('no_account')}
        </Button>
      </Box>
    </Paper>
  );
};

export default Login;
