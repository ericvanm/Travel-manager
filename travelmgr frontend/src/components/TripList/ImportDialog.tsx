import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box
} from '@mui/material';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tripName: string) => void;
  importType: 'ICS' | 'CSV';
  fileName: string;
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  open,
  onClose,
  onConfirm,
  importType,
  fileName
}) => {
  const [tripName, setTripName] = useState('');

  const handleConfirm = () => {
    if (tripName.trim()) {
      onConfirm(tripName.trim());
      setTripName('');
    }
  };

  const handleClose = () => {
    setTripName('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import {importType} File</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            File: {fileName}
          </Typography>
        </Box>
        <TextField
          autoFocus
          margin="dense"
          label="Trip Name"
          fullWidth
          variant="outlined"
          value={tripName}
          onChange={(e) => setTripName(e.target.value)}
          placeholder="Enter a name for the new trip"
        />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          A new trip will be created with the data from the {importType} file.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={!tripName.trim()}>
          Import
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;