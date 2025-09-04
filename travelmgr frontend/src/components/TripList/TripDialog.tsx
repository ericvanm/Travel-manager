import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button, Alert
} from '@mui/material';
import { Trip } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TripDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTrip: Trip | null;
  newTrip: { name: string; description: string };
  setNewTrip: (trip: { name: string; description: string }) => void;
  loading: boolean;
  error: string | null;
  onErrorClear?: () => void;
}

const TripDialog: React.FC<TripDialogProps> = ({
  open,
  onClose,
  onSave,
  editingTrip,
  newTrip,
  setNewTrip,
  loading,
  error,
  onErrorClear
}) => {
  const { t } = useLanguage();
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTrip({ ...newTrip, name: e.target.value });
    if (error && onErrorClear) {
      onErrorClear();
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingTrip ? t('edit_trip') : t('create_new_trip')}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label={t('trip_name')}
          fullWidth
          variant="outlined"
          value={newTrip.name}
          onChange={handleNameChange}
        />
        <TextField
          margin="dense"
          label={t('description')}
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={newTrip.description}
          onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={onSave} disabled={loading}>
          {loading ? (editingTrip ? t('updating') : t('creating')) : (editingTrip ? t('update') : t('create'))}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TripDialog;