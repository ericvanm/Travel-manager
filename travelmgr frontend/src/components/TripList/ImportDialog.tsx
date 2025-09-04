import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, Alert
} from '@mui/material';
import { useLanguage } from '../../contexts/LanguageContext';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tripName: string) => void;
  importType: 'ICS' | 'CSV';
  fileName: string;
  error?: string | null;
  onErrorClear?: () => void;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onConfirm,
  importType,
  fileName,
  error,
  onErrorClear
}) => {
  const { t } = useLanguage();
  const [tripName, setTripName] = useState('');

  const handleConfirm = () => {
    if (tripName.trim()) {
      onConfirm(tripName.trim());
    }
  };

  const handleClose = () => {
    setTripName('');
    onClose();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripName(e.target.value);
    if (error && onErrorClear) {
      onErrorClear();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('import_file', { type: importType })}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {t('file')}: {fileName}
          </Typography>
        </Box>
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
          value={tripName}
          onChange={handleNameChange}
          placeholder={t('enter_trip_name')}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('new_trip_created', { type: importType })}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t('cancel')}</Button>
        <Button onClick={handleConfirm} disabled={!tripName.trim()}>
          {t('import')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;