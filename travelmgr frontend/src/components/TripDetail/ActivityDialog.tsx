import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box
} from '@mui/material';
import { ActivityType, Stage } from '../../types';

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
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingActivity ? `Edit ${activityTypes.find(t => t.id.toString() === newActivity.activityTypeId)?.label}` : `Add ${activityTypes.find(t => t.id.toString() === newActivity.activityTypeId)?.label} to ${selectedStage?.name}`}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Activity Name"
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
              label="Airline" 
              fullWidth 
              variant="outlined" 
              value={newActivity.airline}
              onChange={(e) => setNewActivity({ ...newActivity, airline: e.target.value })}
            />
            <TextField 
              margin="dense" 
              label="Flight Number" 
              fullWidth 
              variant="outlined" 
              value={newActivity.flightNumber}
              onChange={(e) => setNewActivity({ ...newActivity, flightNumber: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label="Departure Airport" 
                variant="outlined" 
                sx={{ flex: 1 }}
                value={newActivity.departureAirport}
                onChange={(e) => setNewActivity({ ...newActivity, departureAirport: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label="Arrival Airport" 
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
              label="Address" 
              fullWidth 
              variant="outlined" 
              value={newActivity.address}
              onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
            />
            <TextField 
              margin="dense" 
              label="Phone" 
              fullWidth 
              variant="outlined" 
              value={newActivity.phone}
              onChange={(e) => setNewActivity({ ...newActivity, phone: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label="Check-in Date" 
                type="date" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                value={newActivity.checkInDate}
                onChange={(e) => setNewActivity({ ...newActivity, checkInDate: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label="Check-out Date" 
                type="date" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                value={newActivity.checkOutDate}
                onChange={(e) => setNewActivity({ ...newActivity, checkOutDate: e.target.value })}
              />
            </Box>
          </>
        )}
        
        <TextField
          margin="dense"
          label="City"
          fullWidth
          variant="outlined"
          value={newActivity.city}
          onChange={(e) => setNewActivity({ ...newActivity, city: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Cost"
          type="number"
          fullWidth
          variant="outlined"
          value={newActivity.cost}
          onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
        />
        <TextField
          margin="dense"
          label="Confirmation"
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
                label="Start Date"
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={newActivity.startDateTime ? (newActivity.startDateTime.includes('T') ? newActivity.startDateTime.split('T')[0] : newActivity.startDateTime.split(' ')[0]) : ''}
                onChange={(e) => {
                  const time = newActivity.startDateTime ? (newActivity.startDateTime.includes('T') ? newActivity.startDateTime.split('T')[1] : newActivity.startDateTime.split(' ')[1] || '09:00') : '09:00';
                  setNewActivity({ ...newActivity, startDateTime: e.target.value ? `${e.target.value}T${time}` : '' });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                margin="dense"
                label="Start Time"
                type="time"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={newActivity.startDateTime ? (newActivity.startDateTime.includes('T') ? newActivity.startDateTime.split('T')[1] || '09:00' : newActivity.startDateTime.split(' ')[1] || '09:00') : '09:00'}
                onChange={(e) => {
                  const date = newActivity.startDateTime ? (newActivity.startDateTime.includes('T') ? newActivity.startDateTime.split('T')[0] : newActivity.startDateTime.split(' ')[0]) : '';
                  setNewActivity({ ...newActivity, startDateTime: date ? `${date}T${e.target.value}` : '' });
                }}
                sx={{ width: 120 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label="End Date"
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={newActivity.endDateTime ? (newActivity.endDateTime.includes('T') ? newActivity.endDateTime.split('T')[0] : newActivity.endDateTime.split(' ')[0]) : ''}
                onChange={(e) => {
                  const time = newActivity.endDateTime ? (newActivity.endDateTime.includes('T') ? newActivity.endDateTime.split('T')[1] : newActivity.endDateTime.split(' ')[1] || '18:00') : '18:00';
                  setNewActivity({ ...newActivity, endDateTime: e.target.value ? `${e.target.value}T${time}` : '' });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                margin="dense"
                label="End Time"
                type="time"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={newActivity.endDateTime ? (newActivity.endDateTime.includes('T') ? newActivity.endDateTime.split('T')[1] || '18:00' : newActivity.endDateTime.split(' ')[1] || '18:00') : '18:00'}
                onChange={(e) => {
                  const date = newActivity.endDateTime ? (newActivity.endDateTime.includes('T') ? newActivity.endDateTime.split('T')[0] : newActivity.endDateTime.split(' ')[0]) : '';
                  setNewActivity({ ...newActivity, endDateTime: date ? `${date}T${e.target.value}` : '' });
                }}
                sx={{ width: 120 }}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit}>
          {editingActivity ? 'Update Activity' : 'Add Activity'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityDialog;