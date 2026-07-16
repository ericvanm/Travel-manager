import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert,
} from '@mui/material';
import { requestPasswordReset } from '../services/auth';
import { useLanguage } from '../contexts/LanguageContext';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch {
      setError(t('password_reset_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h5" gutterBottom align="center">
        {t('forgot_password')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t('forgot_password_hint')}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{t('password_reset_requested')}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label={t('email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
        />
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={loading}>
          {loading ? t('sending') : t('send_reset_link')}
        </Button>
        <Button fullWidth variant="text" onClick={onBackToLogin}>
          {t('back_to_login')}
        </Button>
      </Box>
    </Paper>
  );
};

export default ForgotPassword;
