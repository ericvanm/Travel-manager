import React, { useState } from 'react';
import {
  Box, Button, TextField, Typography, Paper, Alert,
} from '@mui/material';
import { setupInitialPassword } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SetInitialPasswordProps {
  username: string;
  onCancel: () => void;
}

const SetInitialPassword: React.FC<SetInitialPasswordProps> = ({ username, onCancel }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const { t, setLanguage } = useLanguage();

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
      const user = await setupInitialPassword(username, newPassword);
      setUser(user);
      if (user.language) {
        setLanguage(user.language);
      }
    } catch {
      setError(t('password_setup_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Travel Manager
      </Typography>
      <Typography variant="h6" gutterBottom align="center">
        {t('setup_admin_password')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} align="center">
        {t('setup_admin_password_hint', { username })}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label={t('username')}
          value={username}
          margin="normal"
          disabled
        />
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
        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 1 }} disabled={loading}>
          {loading ? t('saving') : t('set_password_and_login')}
        </Button>
        <Button fullWidth variant="text" onClick={onCancel}>
          {t('cancel')}
        </Button>
      </Box>
    </Paper>
  );
};

export default SetInitialPassword;
