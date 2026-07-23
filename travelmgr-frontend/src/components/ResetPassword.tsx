import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert,
} from '@mui/material';
import { resetPassword } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { translateApiError } from '../utils/localeHelpers';

interface ResetPasswordProps {
  token: string;
  onBackToLogin: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError(t('password_too_short'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('passwords_do_not_match'));
      return;
    }

    setLoading(true);
    try {
      const user = await resetPassword(token, newPassword);
      setUser(user);
    } catch (err: unknown) {
      const errorCode = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      setError(translateApiError(t, errorCode, 'reset_token_invalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom align="center">
        {t('reset_password')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('reset_password_hint')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label={t('new_password')}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label={t('confirm_password')}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          margin="normal"
          required
        />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
          {loading ? t('saving') : t('reset_password')}
        </Button>
        <Button fullWidth variant="text" onClick={onBackToLogin}>
          {t('back_to_login')}
        </Button>
      </Box>
    </Paper>
  );
};

export default ResetPassword;
