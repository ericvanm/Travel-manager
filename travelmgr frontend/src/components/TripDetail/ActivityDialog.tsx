import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box
} from '@mui/material';
import { ActivityType, Stage } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { combineDateAndTime, getDatePart, getTimePart } from '../../utils/dateTimeInputHelpers';

interface ActivityDialogProps {
  open: boolean;
  onClose: () => void;
  editingActivity: any;
  selectedStage: Stage | null;
  newActivity: any;
  setNewActivity: (activity: any) => void;
  activityTypes: ActivityType[];
  onSubmit: () => void;
}

const ActivityDialog: React.FC<ActivityDialogProps> = ({
  open,
  onClose,
  editingActivity,
  selectedStage,
  newActivity,
  setNewActivity,
  activityTypes,
  onSubmit
}) => {
  const { t } = useLanguage();
  const activityType = activityTypes.find(t => t.id.toString() === newActivity.activityTypeId)?.label || '';
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingActivity ? t('edit_activity', { type: activityType }) : t('add_activity_to_stage', { type: activityType, stage: selectedStage?.name })}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t('activity_name')}
          fullWidth
          variant="outlined"
          value={newActivity.name}
          onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
        />
        
        {/* Flight fields */}
        {newActivity.activityTypeId === '6' && (
          <>
            <TextField 
              margin="dense" 
              label={t('airline')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.airline}
              onChange={(e) => setNewActivity({ ...newActivity, airline: e.target.value })}
            />
            <TextField 
              margin="dense" 
              label={t('flight_number')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.flightNumber}
              onChange={(e) => setNewActivity({ ...newActivity, flightNumber: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label={t('departure_airport')} 
                variant="outlined" 
                sx={{ flex: 1 }}
                value={newActivity.departureAirport}
                onChange={(e) => setNewActivity({ ...newActivity, departureAirport: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label={t('arrival_airport')} 
                variant="outlined" 
                sx={{ flex: 1 }}
                value={newActivity.arrivalAirport}
                onChange={(e) => setNewActivity({ ...newActivity, arrivalAirport: e.target.value })}
              />
            </Box>
          </>
        )}
        
        {/* Hotel fields */}
        {newActivity.activityTypeId === '7' && (
          <>
            <TextField 
              margin="dense" 
              label={t('address')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.address}
              onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
            />
            <TextField 
              margin="dense" 
              label={t('phone')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.phone}
              onChange={(e) => setNewActivity({ ...newActivity, phone: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label={t('check_in_date')} 
                type="date" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                value={newActivity.checkInDate}
                onChange={(e) => setNewActivity({ ...newActivity, checkInDate: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label={t('check_in_time')} 
                type="time" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ width: 120 }}
                value={newActivity.checkInTime || '15:00'}
                onChange={(e) => setNewActivity({ ...newActivity, checkInTime: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label={t('check_out_date')} 
                type="date" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                value={newActivity.checkOutDate}
                onChange={(e) => setNewActivity({ ...newActivity, checkOutDate: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label={t('check_out_time')} 
                type="time" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ width: 120 }}
                value={newActivity.checkOutTime || '11:00'}
                onChange={(e) => setNewActivity({ ...newActivity, checkOutTime: e.target.value })}
              />
            </Box>
          </>
        )}
        
        <TextField
          margin="dense"
          label={t('city')}
          fullWidth
          variant="outlined"
          value={newActivity.city}
          onChange={(e) => setNewActivity({ ...newActivity, city: e.target.value })}
        />
        <TextField
          margin="dense"
          label={t('cost')}
          type="number"
          fullWidth
          variant="outlined"
          value={newActivity.cost}
          onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
        />
        <TextField
          margin="dense"
          label={t('confirmation')}
          fullWidth
          variant="outlined"
          value={newActivity.confirmationNumber || ''}
          onChange={(e) => setNewActivity({ ...newActivity, confirmationNumber: e.target.value })}
        />
        
        {/* Generic Start/End Date fields for non-hotel activities */}
        {newActivity.activityTypeId !== '7' && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('start_date')}
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getDatePart(newActivity.startDateTime)}
                onChange={(e) => {
                  const time = getTimePart(newActivity.startDateTime, '09:00');
                  setNewActivity({ ...newActivity, startDateTime: combineDateAndTime(e.target.value, time) });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                margin="dense"
                label={t('start_time')}
                type="time"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getTimePart(newActivity.startDateTime, '09:00')}
                onChange={(e) => {
                  const date = getDatePart(newActivity.startDateTime);
                  setNewActivity({ ...newActivity, startDateTime: combineDateAndTime(date, e.target.value) });
                }}
                sx={{ width: 120 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('end_date')}
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getDatePart(newActivity.endDateTime)}
                onChange={(e) => {
                  const time = getTimePart(newActivity.endDateTime, '18:00');
                  setNewActivity({ ...newActivity, endDateTime: combineDateAndTime(e.target.value, time) });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                margin="dense"
                label={t('end_time')}
                type="time"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getTimePart(newActivity.endDateTime, '18:00')}
                onChange={(e) => {
                  const date = getDatePart(newActivity.endDateTime);
                  setNewActivity({ ...newActivity, endDateTime: combineDateAndTime(date, e.target.value) });
                }}
                sx={{ width: 120 }}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={onSubmit}>
          {editingActivity ? t('update_activity') : t('add_activity')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityDialog;