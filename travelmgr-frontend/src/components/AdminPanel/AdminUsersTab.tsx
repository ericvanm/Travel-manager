import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { Delete, Edit, Key } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  setAdminUserPassword,
  updateAdminUser,
} from '../../services/admin';
import { AdminUserRecord } from '../../types';
import { translateApiError } from '../../utils/localeHelpers';

interface AdminUsersTabProps {
  onUsersChanged?: () => void;
}

const emptyCreateForm = {
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  email: '',
  readOnly: false,
  role: 'user' as 'user' | 'admin',
};

const AdminUsersTab: React.FC<AdminUsersTabProps> = ({ onUsersChanged }) => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    readOnly: false,
    disabled: false,
    role: 'user' as 'user' | 'admin',
  });
  const [passwordUser, setPasswordUser] = useState<AdminUserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch {
      setError(t('admin_load_error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const refreshAll = async () => {
    await loadUsers();
    onUsersChanged?.();
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await createAdminUser(createForm);
      setCreateOpen(false);
      setCreateForm(emptyCreateForm);
      await refreshAll();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(translateApiError(t, code, 'admin_user_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user: AdminUserRecord) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      readOnly: Boolean(user.readOnly),
      disabled: Boolean(user.disabled),
      role: (user.role === 'admin' ? 'admin' : 'user'),
    });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setError(null);
    const payload = { ...editForm };
    if (editUser.id === currentUser?.id) {
      payload.readOnly = false;
      payload.disabled = false;
    }
    try {
      await updateAdminUser(editUser.id, payload);
      setEditUser(null);
      await refreshAll();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(translateApiError(t, code, 'admin_user_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async () => {
    if (!passwordUser) return;
    setSaving(true);
    setError(null);
    try {
      await setAdminUserPassword(passwordUser.id, newPassword);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(translateApiError(t, code, 'admin_user_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUserRecord) => {
    if (!window.confirm(t('admin_delete_user_confirm', { username: user.username }))) {
      return;
    }
    setError(null);
    try {
      await deleteAdminUser(user.id);
      await refreshAll();
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(translateApiError(t, code, 'admin_user_save_error'));
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          {t('admin_create_user')}
        </Button>
      </Box>

      <Paper>
        {loading ? (
          <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('username')}</TableCell>
                <TableCell>{t('name')}</TableCell>
                <TableCell>{t('email')}</TableCell>
                <TableCell>{t('admin_user_mode')}</TableCell>
                <TableCell>{t('role')}</TableCell>
                <TableCell>{t('status')}</TableCell>
                <TableCell align="right">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={user.readOnly ? t('admin_mode_read_only') : t('admin_mode_normal')}
                      color={user.readOnly ? 'default' : 'primary'}
                      variant={user.readOnly ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>{user.role || 'user'}</TableCell>
                  <TableCell>
                    {user.disabled ? (
                      <Chip size="small" color="warning" label={t('admin_user_disabled')} />
                    ) : (
                      <Chip size="small" color="success" label={t('admin_user_active')} />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" aria-label={t('edit')} onClick={() => openEdit(user)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      aria-label={t('admin_set_password')}
                      onClick={() => {
                        setPasswordUser(user);
                        setNewPassword('');
                      }}
                    >
                      <Key fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={t('delete')}
                      onClick={() => handleDelete(user)}
                      disabled={user.role === 'admin'}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    {t('admin_no_users')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin_create_user')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label={t('username')}
            required
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
          />
          <TextField
            label={t('new_password')}
            type="password"
            required
            helperText={t('password_min_length_hint')}
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('first_name')}
              fullWidth
              value={createForm.firstName}
              onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
            />
            <TextField
              label={t('last_name')}
              fullWidth
              value={createForm.lastName}
              onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
            />
          </Box>
          <TextField
            label={t('email')}
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>{t('role')}</InputLabel>
            <Select
              label={t('role')}
              value={createForm.role}
              onChange={(e) => setCreateForm({
                ...createForm,
                role: e.target.value as 'user' | 'admin',
              })}
            >
              <MenuItem value="user">{t('admin_role_user')}</MenuItem>
              <MenuItem value="admin">{t('admin_role_admin')}</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={(
              <Switch
                checked={createForm.readOnly}
                onChange={(e) => setCreateForm({ ...createForm, readOnly: e.target.checked })}
              />
            )}
            label={t('admin_mode_read_only')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editUser)} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('admin_edit_user', { username: editUser?.username ?? '' })}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {editUser?.id === currentUser?.id && (
            <Alert severity="info">{t('admin_cannot_self_restrict_hint')}</Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('first_name')}
              fullWidth
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
            />
            <TextField
              label={t('last_name')}
              fullWidth
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
            />
          </Box>
          <TextField
            label={t('email')}
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>{t('role')}</InputLabel>
            <Select
              label={t('role')}
              value={editForm.role}
              onChange={(e) => setEditForm({
                ...editForm,
                role: e.target.value as 'user' | 'admin',
              })}
            >
              <MenuItem value="user">{t('admin_role_user')}</MenuItem>
              <MenuItem value="admin">{t('admin_role_admin')}</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={(
              <Switch
                checked={editForm.readOnly}
                disabled={editUser?.id === currentUser?.id}
                onChange={(e) => setEditForm({ ...editForm, readOnly: e.target.checked })}
              />
            )}
            label={t('admin_mode_read_only')}
          />
          <FormControlLabel
            control={(
              <Switch
                checked={editForm.disabled}
                disabled={editUser?.id === currentUser?.id}
                onChange={(e) => setEditForm({ ...editForm, disabled: e.target.checked })}
              />
            )}
            label={t('admin_user_disabled')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>{t('cancel')}</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={saving}>
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(passwordUser)} onClose={() => setPasswordUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('admin_set_password')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {t('admin_set_password_for', { username: passwordUser?.username ?? '' })}
          </Typography>
          <TextField
            label={t('new_password')}
            type="password"
            fullWidth
            helperText={t('password_min_length_hint')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordUser(null)}>{t('cancel')}</Button>
          <Button variant="contained" onClick={handleSetPassword} disabled={saving}>
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersTab;
