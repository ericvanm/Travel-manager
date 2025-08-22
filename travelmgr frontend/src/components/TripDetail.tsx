import React, { useState, useEffect } from 'react';
import {
  Box, Typography, AppBar, Toolbar, IconButton, Card, CardContent,
  Grid, Fab, Dialog, DialogTitle, DialogContent, TextField,
  DialogActions, Button, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, Autocomplete
} from '@mui/material';
import { ArrowBack, Add } from '@mui/icons-material';
import { Trip, Stage, Activity, Country, ActivityType } from '../types';
import { getTrip, getActivityTypes, getStagesByTrip, createStage, createActivity, updateStage, deleteStage, updateActivity } from '../services/trips';
import { useCountries } from '../contexts/CountriesContext';

interface TripDetailProps {
  tripId: number;
  onBack: () => void;
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId, onBack }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const { countries, isLoading: countriesLoading } = useCountries();
  const [stageDialog, setStageDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [newStage, setNewStage] = useState({
    name: '',
    countryId: '',
    startDate: '',
    endDate: ''
  });
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [newActivity, setNewActivity] = useState({
    name: '',
    activityTypeId: '',
    startDateTime: '',
    endDateTime: '',
    city: '',
    cost: ''
  });

  useEffect(() => {
    loadTripData();
    loadStagesData();
    loadActivityTypes();
  }, [tripId]);

  const loadTripData = async () => {
    try {
      const data = await getTrip(tripId);
      setTrip(data);
    } catch (error) {
      console.error('Failed to load trip:', error);
    }
  };

  const loadStagesData = async () => {
    try {
      const data = await getStagesByTrip(tripId);
      // Sort stages by startDate in ascending order
      const sortedStages = data.sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      });
      setStages(sortedStages);
    } catch (error) {
      console.error('Failed to load stages:', error);
    }
  };

  const loadActivityTypes = async () => {
    try {
      const activityTypesData = await getActivityTypes();
      setActivityTypes(activityTypesData);
    } catch (error) {
      console.error('Failed to load activity types:', error);
    }
  };

  const handleCreateStage = async () => {
    console.log('Creating stage with data:', newStage);
    if (!newStage.name.trim()) {
      console.log('Stage name is required');
      return;
    }
    if (!selectedCountry) {
      console.log('Country is required');
      return;
    }
    
    try {
      const stageData = {
        name: newStage.name,
        tripId,
        countryId: selectedCountry.id,
        startDate: newStage.startDate || null,
        endDate: newStage.endDate || null
      };
      console.log('Sending stage data:', stageData);
      const createdStage = await createStage(stageData);
      console.log('Stage created:', createdStage);
      await loadStagesData();
      setStageDialog(false);
      setNewStage({ name: '', countryId: '', startDate: '', endDate: '' });
      setSelectedCountry(null);
    } catch (error) {
      console.error('Failed to create stage:', error);
    }
  };

  const handleUpdateStage = async () => {
    if (!newStage.name.trim() || !selectedCountry || !editingStage) return;
    
    try {
      const stageData = {
        name: newStage.name,
        countryId: selectedCountry.id,
        startDate: newStage.startDate || null,
        endDate: newStage.endDate || null
      };
      await updateStage(editingStage.id, stageData);
      await loadStagesData();
      setStageDialog(false);
      setEditingStage(null);
      setNewStage({ name: '', countryId: '', startDate: '', endDate: '' });
      setSelectedCountry(null);
    } catch (error) {
      console.error('Failed to update stage:', error);
    }
  };

  const handleCreateActivity = async () => {
    if (!newActivity.name.trim() || !newActivity.activityTypeId || !selectedStage) return;
    
    try {
      const activityData = {
        name: newActivity.name,
        stageId: selectedStage.id,
        activityTypeId: parseInt(newActivity.activityTypeId),
        startDateTime: newActivity.startDateTime || null,
        endDateTime: newActivity.endDateTime || null,
        city: newActivity.city || null,
        cost: newActivity.cost ? parseFloat(newActivity.cost) : null
      };
      await createActivity(activityData);
      await loadStagesData(); // Reload stages data
      setActivityDialog(false);
      setNewActivity({ name: '', activityTypeId: '', startDateTime: '', endDateTime: '', city: '', cost: '' });
      setSelectedStage(null);
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  };

  const handleUpdateActivity = async () => {
    if (!newActivity.name.trim() || !newActivity.activityTypeId || !editingActivity) return;
    
    try {
      const activityData = {
        name: newActivity.name,
        activityTypeId: parseInt(newActivity.activityTypeId),
        startDateTime: newActivity.startDateTime || null,
        endDateTime: newActivity.endDateTime || null,
        city: newActivity.city || null,
        cost: newActivity.cost ? parseFloat(newActivity.cost) : null
      };
      await updateActivity(editingActivity.id, activityData);
      await loadStagesData();
      setActivityDialog(false);
      setEditingActivity(null);
      setNewActivity({ name: '', activityTypeId: '', startDateTime: '', endDateTime: '', city: '', cost: '' });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  };

  if (!trip) {
    return <Typography>Loading...</Typography>;
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onBack}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {trip.name}
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="body1" paragraph>
          {trip.description}
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 3 }}>
          Stages
        </Typography>

        {stages.map((stage) => (
          <Paper key={stage.id} sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {stage.name || `Stage ${stage.id}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stage.Country?.name || 'N/A'} • 
                  {stage.startDate ? new Date(stage.startDate).toLocaleDateString() : 'N/A'} - 
                  {stage.endDate ? new Date(stage.endDate).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => {
                    setSelectedStage(stage);
                    setActivityDialog(true);
                  }}
                >
                  Add Activity
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => {
                    setEditingStage(stage);
                    setNewStage({
                      name: stage.name || '',
                      countryId: stage.countryId?.toString() || '',
                      startDate: stage.startDate ? stage.startDate.split('T')[0] : '',
                      endDate: stage.endDate ? stage.endDate.split('T')[0] : ''
                    });
                    const country = countries.find(c => c.id === stage.countryId);
                    setSelectedCountry(country || null);
                    setStageDialog(true);
                  }}
                >
                  Edit
                </Button>
                <Button 
                  size="small" 
                  variant="outlined"
                  color="error"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this stage?')) {
                      try {
                        await deleteStage(stage.id);
                        await loadStagesData();
                      } catch (error) {
                        console.error('Failed to delete stage:', error);
                      }
                    }
                  }}
                >
                  Delete
                </Button>
              </Box>
            </Box>
            
            {stage.activities && stage.activities.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Activity Name</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>City</TableCell>
                      <TableCell>Start Time</TableCell>
                      <TableCell>End Time</TableCell>
                      <TableCell>Cost</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stage.activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.name}</TableCell>
                        <TableCell>
                          {activityTypes.find(type => type.id === activity.activityTypeId)?.label || 'N/A'}
                        </TableCell>
                        <TableCell>{activity.city || 'N/A'}</TableCell>
                        <TableCell>
                          {activity.startDateTime ? new Date(activity.startDateTime).toLocaleString('en-GB', { timeZone: 'UTC' }) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {activity.endDateTime ? new Date(activity.endDateTime).toLocaleString('en-GB', { timeZone: 'UTC' }) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {activity.cost ? `$${activity.cost}` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => {
                                setEditingActivity(activity);
                                setSelectedStage(stage);
                                setNewActivity({
                                  name: activity.name || '',
                                  activityTypeId: activity.activityTypeId?.toString() || '',
                                  startDateTime: activity.startDateTime ? activity.startDateTime.slice(0, 16) : '',
                                  endDateTime: activity.endDateTime ? activity.endDateTime.slice(0, 16) : '',
                                  city: activity.city || '',
                                  cost: activity.cost?.toString() || ''
                                });
                                setActivityDialog(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button size="small" variant="outlined" color="error">
                              Delete
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No activities yet. Click "Add Activity" to create one.
              </Typography>
            )}
          </Paper>
        ))}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setStageDialog(true)}
          >
            Add Stage
          </Button>
        </Box>

        <Fab
          color="primary"
          aria-label="add stage"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setStageDialog(true)}
        >
          <Add />
        </Fab>

        {/* Stage Dialog */}
        <Dialog open={stageDialog} onClose={() => setStageDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingStage ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Stage Name"
              fullWidth
              variant="outlined"
              value={newStage.name}
              onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
            />
            <Autocomplete
              options={countries || []}
              getOptionLabel={(option) => option?.name || ''}
              value={selectedCountry}
              onChange={(event, newValue) => {
                setSelectedCountry(newValue);
                setNewStage({ ...newStage, countryId: newValue ? newValue.id.toString() : '' });
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                  margin="dense"
                  variant="outlined"
                  fullWidth
                />
              )}
              loading={countriesLoading}
              noOptionsText={countriesLoading ? "Loading countries..." : "No countries found"}
              filterOptions={(options, { inputValue }) =>
                options.filter((option) =>
                  option?.name?.toLowerCase().includes(inputValue.toLowerCase())
                )
              }
            />
            <TextField
              margin="dense"
              label="Start Date"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={newStage.startDate}
              onChange={(e) => setNewStage({ ...newStage, startDate: e.target.value })}
            />
            <TextField
              margin="dense"
              label="End Date"
              type="date"
              fullWidth
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              value={newStage.endDate}
              onChange={(e) => setNewStage({ ...newStage, endDate: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setStageDialog(false);
              setEditingStage(null);
              setNewStage({ name: '', countryId: '', startDate: '', endDate: '' });
              setSelectedCountry(null);
            }}>Cancel</Button>
            <Button onClick={editingStage ? handleUpdateStage : handleCreateStage}>
              {editingStage ? 'Update Stage' : 'Add Stage'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Activity Dialog */}
        <Dialog open={activityDialog} onClose={() => setActivityDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingActivity ? `Edit Activity` : `Add Activity to ${selectedStage?.name}`}</DialogTitle>
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
            <FormControl fullWidth margin="dense">
              <InputLabel>Activity Type</InputLabel>
              <Select
                value={newActivity.activityTypeId}
                onChange={(e) => setNewActivity({ ...newActivity, activityTypeId: e.target.value })}
              >
                {activityTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label="Start Date"
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={newActivity.startDateTime ? newActivity.startDateTime.split('T')[0] : ''}
                onChange={(e) => {
                  const time = newActivity.startDateTime ? newActivity.startDateTime.split('T')[1] : '09:00';
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
                value={newActivity.startDateTime ? newActivity.startDateTime.split('T')[1] || '09:00' : '09:00'}
                onChange={(e) => {
                  const date = newActivity.startDateTime ? newActivity.startDateTime.split('T')[0] : '';
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
                value={newActivity.endDateTime ? newActivity.endDateTime.split('T')[0] : ''}
                onChange={(e) => {
                  const time = newActivity.endDateTime ? newActivity.endDateTime.split('T')[1] : '18:00';
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
                value={newActivity.endDateTime ? newActivity.endDateTime.split('T')[1] || '18:00' : '18:00'}
                onChange={(e) => {
                  const date = newActivity.endDateTime ? newActivity.endDateTime.split('T')[0] : '';
                  setNewActivity({ ...newActivity, endDateTime: date ? `${date}T${e.target.value}` : '' });
                }}
                sx={{ width: 120 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setActivityDialog(false);
              setEditingActivity(null);
              setNewActivity({ name: '', activityTypeId: '', startDateTime: '', endDateTime: '', city: '', cost: '' });
            }}>Cancel</Button>
            <Button onClick={editingActivity ? handleUpdateActivity : handleCreateActivity}>
              {editingActivity ? 'Update Activity' : 'Add Activity'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default TripDetail;