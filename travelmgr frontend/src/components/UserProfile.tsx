import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, FormControl, InputLabel, Select, MenuItem, Alert, Tabs, Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supportedLanguages } from '../translations';

interface UserProfileProps {
  open: boolean;
  onClose: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const UserProfile: React.FC<UserProfileProps> = ({ open, onClose }) => {
  const { user, setUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user && open) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        username: user.username || '',
        email: user.email || ''
      });
    }
  }, [user, open]);

  const handleProfileSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('http://localhost:8080/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...profile, language })
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setSuccess(t('profile_updated'));
      } else {
        const errorData = await response.json();
        setError(t(errorData.error) || t('profile_save_error'));
      }
    } catch (error) {
      setError(t('profile_save_error'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t('password_mismatch'));
      return;
    }
    
    if (!passwordData.currentPassword) {
      setError(t('current_password_required'));
      return;
    }
    
    if (!passwordData.newPassword) {
      setError(t('new_password_required'));
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('http://localhost:8080/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(passwordData)
      });
      
      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setSuccess(t('password_changed'));
      } else {
        const errorData = await response.json();
        setError(t(errorData.error) || t('profile_save_error'));
      }
    } catch (error) {
      setError(t('profile_save_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    setTabValue(0);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('profile')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={t('profile')} />
          <Tab label={t('change_password')} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label={t('first_name')}
              fullWidth
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
            <TextField
              label={t('last_name')}
              fullWidth
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            />
          </Box>
          
          <TextField
            label={t('username')}
            fullWidth
            margin="dense"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
          />
          
          <TextField
            label={t('email')}
            fullWidth
            margin="dense"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          
          <FormControl fullWidth margin="dense">
            <InputLabel>{t('language')}</InputLabel>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              label={t('language')}
            >
              {supportedLanguages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {t(`lang_${lang.code}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TextField
            label={t('current_password')}
            type="password"
            fullWidth
            margin="dense"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
          />
          
          <TextField
            label={t('new_password')}
            type="password"
            fullWidth
            margin="dense"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
          />
          
          <TextField
            label={t('confirm_password')}
            type="password"
            fullWidth
            margin="dense"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
          />
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>{t('cancel')}</Button>
        <Button 
          onClick={tabValue === 0 ? handleProfileSave : handlePasswordChange}
          variant="contained"
          disabled={loading}
        >
          {t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserProfile;