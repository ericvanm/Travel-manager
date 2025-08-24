import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { ActivityType } from '../../types';

interface ActivityTypeDialogProps {
  open: boolean;
  onClose: () => void;
  selectedActivityType: string;
  setSelectedActivityType: (type: string) => void;
  activityTypes: ActivityType[];
  onContinue: () => void;
}

const ActivityTypeDialog: React.FC<ActivityTypeDialogProps> = ({
  open,
  onClose,
  selectedActivityType,
  setSelectedActivityType,
  activityTypes,
  onContinue
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Choose Activity Type</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>Activity Type</InputLabel>
          <Select
            value={selectedActivityType}
            onChange={(e) => setSelectedActivityType(e.target.value)}
          >
            {activityTypes.map((type) => (
              <MenuItem key={type.id} value={type.id.toString()}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={onContinue}
          disabled={!selectedActivityType}
        >
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityTypeDialog;