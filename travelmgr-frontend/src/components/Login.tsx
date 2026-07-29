import React, { useEffect, useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert, Tooltip,
} from '@mui/material';
import { login, PasswordSetupRequiredError, getPublicConfig } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LoginCredentials } from '../types';
import LanguageSelector from './LanguageSelector';
import SetInitialPassword from './SetInitialPassword';

interface LoginProps {
  onSwitchToRegister: () => void;
  onForgotPassword?: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onForgotPassword }) => {
  const [credentials, setCredentials] = useState<LoginCredentials>({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordSetupUsername, setPasswordSetupUsername] = useState<string | null>(null);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const { setUser } = useAuth();
  const { t, setLanguage } = useLanguage();

  useEffect(() => {
    getPublicConfig()
      .then((config) => setAllowRegistration(config.allowRegistration))
      .catch(() => setAllowRegistration(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(credentials);
      setUser(user);
      if (user.language) {
        setLanguage(user.language);
      }
    } catch (err) {
      if (err instanceof PasswordSetupRequiredError) {
        setPasswordSetupUsername(err.username);
      } else {
        setError(t('invalid_credentials'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (passwordSetupUsername) {
    return (
      <SetInitialPassword
        username={passwordSetupUsername}
        onCancel={() => {
          setPasswordSetupUsername(null);
          setCredentials({ username: '', password: '' });
        }}
      />
    );
  }

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
          helperText={t('login_password_optional_hint')}
        />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 1 }} disabled={loading}>
          {loading ? t('logging_in') : t('login')}
        </Button>
        {onForgotPassword && (
          <Button fullWidth variant="text" onClick={onForgotPassword} sx={{ mb: 1 }}>
            {t('forgot_password')}
          </Button>
        )}
        <Tooltip title={!allowRegistration ? t('registration_disabled_hint') : ''}>
          <span>
            <Button
              fullWidth
              variant="text"
              onClick={onSwitchToRegister}
              disabled={!allowRegistration}
              sx={!allowRegistration ? { color: 'text.disabled' } : undefined}
            >
              {t('no_account')}
            </Button>
          </span>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default Login;
