import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Alert } from '@mui/material';
import { register } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translateApiError } from '../utils/localeHelpers';
import LanguageSelector from './LanguageSelector';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin }) => {
  const [data, setData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    password: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register({
        username: data.username,
        name: `${data.firstName} ${data.lastName}`.trim(),
        password: data.password,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName
      });
      setUser(user);
    } catch (err: unknown) {
      const errorCode = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(translateApiError(t, errorCode, 'registration_failed'));
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
        {t('register')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label={t('username')}
          value={data.username}
          onChange={(e) => setData({ ...data, username: e.target.value })}
          margin="normal"
          required
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            fullWidth
            label={t('first_name')}
            value={data.firstName}
            onChange={(e) => setData({ ...data, firstName: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label={t('last_name')}
            value={data.lastName}
            onChange={(e) => setData({ ...data, lastName: e.target.value })}
            margin="normal"
          />
        </Box>
        <TextField
          fullWidth
          label={t('email')}
          type="email"
          value={data.email}
          onChange={(e) => setData({ ...data, email: e.target.value })}
          margin="normal"
        />
        <TextField
          fullWidth
          label={t('auth_credential_label')}
          type="password"
          value={data.password}
          onChange={(e) => setData({ ...data, password: e.target.value })}
          margin="normal"
          required
        />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
          {loading ? t('registering') : t('register')}
        </Button>
        <Button fullWidth variant="text" onClick={onSwitchToLogin}>
          {t('have_account')}
        </Button>
      </Box>
    </Paper>
  );
};

export default Register;
