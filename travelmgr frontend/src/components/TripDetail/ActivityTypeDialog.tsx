import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { ActivityType } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('choose_activity_type')}</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="dense">
          <InputLabel>{t('activity_type')}</InputLabel>
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
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button 
          onClick={onContinue}
          disabled={!selectedActivityType}
        >
          {t('continue')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityTypeDialog;