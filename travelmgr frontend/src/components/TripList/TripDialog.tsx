import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, TextField, DialogActions, Button
} from '@mui/material';
import { Trip } from '../../types';

interface TripDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTrip: Trip | null;
  newTrip: { name: string; description: string };
  setNewTrip: (trip: { name: string; description: string }) => void;
  loading: boolean;
}

const TripDialog: React.FC<TripDialogProps> = ({
  open,
  onClose,
  onSave,
  editingTrip,
  newTrip,
  setNewTrip,
  loading
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingTrip ? 'Edit Trip' : 'Create New Trip'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Trip Name"
          fullWidth
          variant="outlined"
          value={newTrip.name}
          onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={newTrip.description}
          onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} disabled={loading}>
          {loading ? (editingTrip ? 'Updating...' : 'Creating...') : (editingTrip ? 'Update' : 'Create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TripDialog;