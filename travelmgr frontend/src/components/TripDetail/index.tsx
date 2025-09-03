import React, { useState, useEffect } from 'react';
import {
  Box, Typography, AppBar, Toolbar, IconButton, Paper, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Fab, Checkbox
} from '@mui/material';
import { ArrowBack, Add, MergeType } from '@mui/icons-material';
import { Trip, Stage, Activity, Country, ActivityType } from '../../types';
import { getTrip, getActivityTypes, getStagesByTrip, createStage, createActivity, updateStage, deleteStage, updateActivity, deleteActivity, mergeStages } from '../../services/trips';
import { useCountries } from '../../contexts/CountriesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import StageDialog from './StageDialog';
import ActivityTypeDialog from './ActivityTypeDialog';
import ActivityDialog from './ActivityDialog';
import MergeStagesDialog from './MergeStagesDialog';

interface TripDetailProps {
  tripId: number;
  onBack: () => void;
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId, onBack }) => {
  const { t } = useLanguage();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const { countries, isLoading: countriesLoading } = useCountries();
  const [stageDialog, setStageDialog] = useState(false);
  const [activityDialog, setActivityDialog] = useState(false);
  const [activityTypeDialog, setActivityTypeDialog] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedStageIds, setSelectedStageIds] = useState<number[]>([]);
  const [mergeDialog, setMergeDialog] = useState(false);
  const [newStage, setNewStage] = useState({
    name: '',
    countryId: '',
    startDate: '',
    endDate: ''
  });
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<string>('');
  const [newActivity, setNewActivity] = useState({
    name: '',
    activityTypeId: '',
    startDateTime: '',
    endDateTime: '',
    city: '',
    cost: '',
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    seat: '',
    confirmationCode: '',
    gate: '',
    terminal: '',
    address: '',
    phone: '',
    checkInDate: '',
    checkOutDate: '',
    confirmationNumber: '',
    roomType: '',
    company: '',
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    dropoffDate: '',
    carType: ''
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
      const sortedStages = [...data].sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
        const dateB = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
        return dateA.getTime() - dateB.getTime();
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
    if (!newStage.name.trim() || !selectedCountry) return;
    
    try {
      const stageData = {
        name: newStage.name,
        tripId,
        countryId: selectedCountry.id,
        startDate: newStage.startDate || null,
        endDate: newStage.endDate || null
      };
      await createStage(stageData);
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
        cost: newActivity.cost ? parseFloat(newActivity.cost) : null,
        confirmationNumber: newActivity.confirmationNumber || null
      };

      if (parseInt(newActivity.activityTypeId) === 6) {
        activityData.airline = newActivity.airline || null;
        activityData.flightNumber = newActivity.flightNumber || null;
        activityData.departureAirport = newActivity.departureAirport || null;
        activityData.arrivalAirport = newActivity.arrivalAirport || null;
        activityData.seat = newActivity.seat || null;
        activityData.confirmationCode = newActivity.confirmationCode || null;
        activityData.gate = newActivity.gate || null;
        activityData.terminal = newActivity.terminal || null;
      }

      if (parseInt(newActivity.activityTypeId) === 7) {
        activityData.checkInDate = newActivity.checkInDate || null;
        activityData.checkOutDate = newActivity.checkOutDate || null;
        activityData.address = newActivity.address || null;
        activityData.phone = newActivity.phone || null;
        activityData.confirmationNumber = newActivity.confirmationNumber || null;
        activityData.roomType = newActivity.roomType || null;
      }

      await createActivity(activityData);
      await loadStagesData();
      setActivityDialog(false);
      setNewActivity({ name: '', activityTypeId: '', startDateTime: '', endDateTime: '', city: '', cost: '', airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '', seat: '', confirmationCode: '', gate: '', terminal: '', address: '', phone: '', checkInDate: '', checkOutDate: '', confirmationNumber: '', roomType: '', company: '', pickupLocation: '', dropoffLocation: '', pickupDate: '', dropoffDate: '', carType: '' });
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
        cost: newActivity.cost ? parseFloat(newActivity.cost) : null,
        confirmationNumber: newActivity.confirmationNumber || null
      };

      if (parseInt(newActivity.activityTypeId) === 6) {
        activityData.airline = newActivity.airline || null;
        activityData.flightNumber = newActivity.flightNumber || null;
        activityData.departureAirport = newActivity.departureAirport || null;
        activityData.arrivalAirport = newActivity.arrivalAirport || null;
        activityData.seat = newActivity.seat || null;
        activityData.confirmationCode = newActivity.confirmationCode || null;
        activityData.gate = newActivity.gate || null;
        activityData.terminal = newActivity.terminal || null;
      }

      if (parseInt(newActivity.activityTypeId) === 7) {
        activityData.checkInDate = newActivity.checkInDate || null;
        activityData.checkOutDate = newActivity.checkOutDate || null;
        activityData.address = newActivity.address || null;
        activityData.phone = newActivity.phone || null;
        activityData.confirmationNumber = newActivity.confirmationNumber || null;
        activityData.roomType = newActivity.roomType || null;
      }

      await updateActivity(editingActivity.id, activityData);
      await loadStagesData();
      setActivityDialog(false);
      setEditingActivity(null);
      setNewActivity({ name: '', activityTypeId: '', startDateTime: '', endDateTime: '', city: '', cost: '', airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '', seat: '', confirmationCode: '', gate: '', terminal: '', address: '', phone: '', checkInDate: '', checkOutDate: '', confirmationNumber: '', roomType: '', company: '', pickupLocation: '', dropoffLocation: '', pickupDate: '', dropoffDate: '', carType: '' });
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  };

  const handleEditActivity = (activity: Activity, stage: Stage) => {
    setEditingActivity(activity);
    setSelectedStage(stage);
    const timezone = stage.Country?.timezone || 'UTC';
    const formatDateTimeForInput = (dateTime) => {
      if (!dateTime) return '';
      const date = new Date(dateTime);
      return date.toLocaleString('sv-SE', { timeZone: timezone }).slice(0, 16);
    };
    const formatDateForInput = (dateTime) => {
      if (!dateTime) return '';
      const date = new Date(dateTime);
      return date.toLocaleDateString('sv-SE', { timeZone: timezone });
    };

    setNewActivity({
      name: activity.name || '',
      activityTypeId: activity.activityTypeId?.toString() || '',
      startDateTime: formatDateTimeForInput(activity.startDateTime),
      endDateTime: formatDateTimeForInput(activity.endDateTime),
      city: activity.city || '',
      cost: activity.cost?.toString() || '',
      airline: activity.airline || '',
      flightNumber: activity.flightNumber || '',
      departureAirport: activity.departureAirport || '',
      arrivalAirport: activity.arrivalAirport || '',
      seat: activity.seat || '',
      confirmationCode: activity.confirmationCode || '',
      gate: activity.gate || '',
      terminal: activity.terminal || '',
      checkInDate: activity.activityTypeId === 7 ? formatDateForInput(activity.checkInDate || activity.startDateTime) : '',
      checkOutDate: activity.activityTypeId === 7 ? formatDateForInput(activity.checkOutDate || activity.endDateTime) : '',
      checkInTime: activity.activityTypeId === 7 && (activity.checkInDate || activity.startDateTime) ? new Date(activity.checkInDate || activity.startDateTime).toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false }).slice(0, 5) : '',
      checkOutTime: activity.activityTypeId === 7 && (activity.checkOutDate || activity.endDateTime) ? new Date(activity.checkOutDate || activity.endDateTime).toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false }).slice(0, 5) : '',
      address: activity.address || '',
      phone: activity.phone || '',
      confirmationNumber: activity.confirmationNumber || '',
      roomType: activity.roomType || '',
      company: activity.company || '',
      pickupLocation: activity.pickupLocation || '',
      dropoffLocation: activity.dropoffLocation || '',
      pickupDate: activity.pickupDate ? formatDateForInput(activity.pickupDate) : '',
      dropoffDate: activity.dropoffDate ? formatDateForInput(activity.dropoffDate) : '',
      carType: activity.carType || ''
    });
    setActivityDialog(true);
  };

  const handleStageSelection = (stageId: number, checked: boolean) => {
    if (checked) {
      setSelectedStageIds(prev => [...prev, stageId]);
    } else {
      setSelectedStageIds(prev => prev.filter(id => id !== stageId));
    }
  };

  const areStagesConsecutive = (stageIds: number[]): boolean => {
    if (stageIds.length < 2) return false;
    const positions = stageIds.map(id => stages.findIndex(stage => stage.id === id)).sort((a, b) => a - b);
    for (let i = 1; i < positions.length; i++) {
      if (positions[i] !== positions[i-1] + 1) return false;
    }
    return true;
  };

  const handleMergeStages = async (newName: string) => {
    try {
      await mergeStages(selectedStageIds, newName);
      await loadStagesData();
      setMergeDialog(false);
      setMergeMode(false);
      setSelectedStageIds([]);
    } catch (error) {
      console.error('Failed to merge stages:', error);
    }
  };

  const toggleMergeMode = () => {
    setMergeMode(!mergeMode);
    setSelectedStageIds([]);
  };

  const canMerge = selectedStageIds.length >= 2 && areStagesConsecutive(selectedStageIds);
  const selectedStages = stages.filter(stage => selectedStageIds.includes(stage.id));



  if (!trip) {
    return <Typography>{t('loading')}</Typography>;
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
          <Typography variant="h5">
            {t('stages')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {mergeMode && (
              <Button
                variant="contained"
                color="primary"
                disabled={!canMerge}
                onClick={() => setMergeDialog(true)}
                startIcon={<MergeType />}
              >
                {t('merge_stages', { count: selectedStageIds.length })}
              </Button>
            )}
            <Button
              variant={mergeMode ? "contained" : "outlined"}
              color={mergeMode ? "secondary" : "primary"}
              onClick={toggleMergeMode}
            >
              {mergeMode ? t('cancel') : t('merge')}
            </Button>
          </Box>
        </Box>

        {stages.map((stage) => (
          <Paper key={stage.id} sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {mergeMode && (
                  <Checkbox
                    checked={selectedStageIds.includes(stage.id)}
                    onChange={(e) => handleStageSelection(stage.id, e.target.checked)}
                  />
                )}
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
              </Box>
              {!mergeMode && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => {
                      setSelectedStage(stage);
                      setActivityTypeDialog(true);
                    }}
                  >
                    {t('add_activity')}
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
                    {t('edit')}
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined"
                    color="error"
                    onClick={async () => {
                      if (window.confirm(t('delete_stage_confirm'))) {
                        try {
                          await deleteStage(stage.id);
                          await loadStagesData();
                        } catch (error) {
                          console.error('Failed to delete stage:', error);
                        }
                      }
                    }}
                  >
                    {t('delete')}
                  </Button>
                </Box>
              )}
            </Box>
            
            {stage.activities && stage.activities.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('activity_name')}</TableCell>
                      <TableCell>{t('type')}</TableCell>
                      <TableCell>{t('city')}</TableCell>
                      <TableCell>{t('start_time')}</TableCell>
                      <TableCell>{t('end_time')}</TableCell>
                      <TableCell>{t('cost')}</TableCell>
                      <TableCell>{t('actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...stage.activities].sort((a, b) => {
                      if (!a.startDateTime && !b.startDateTime) return 0;
                      if (!a.startDateTime) return 1;
                      if (!b.startDateTime) return -1;
                      return new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime();
                    }).map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.name}</TableCell>
                        <TableCell>
                          {activityTypes.find(type => type.id === activity.activityTypeId)?.label || t('na')}
                        </TableCell>
                        <TableCell>{activity.city || t('na')}</TableCell>
                        <TableCell>
                          {activity.startDateTime ? new Date(activity.startDateTime).toLocaleString('en-GB', { timeZone: stage.Country?.timezone || 'UTC' }) : t('na')}
                        </TableCell>
                        <TableCell>
                          {activity.endDateTime ? new Date(activity.endDateTime).toLocaleString('en-GB', { timeZone: stage.Country?.timezone || 'UTC' }) : t('na')}
                        </TableCell>
                        <TableCell>
                          {activity.cost ? `$${activity.cost}` : t('na')}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleEditActivity(activity, stage)}
                            >
                              {t('edit')}
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              color="error"
                              onClick={async () => {
                                if (window.confirm(t('delete_activity_confirm'))) {
                                  try {
                                    await deleteActivity(activity.id);
                                    await loadStagesData();
                                  } catch (error) {
                                    console.error('Failed to delete activity:', error);
                                  }
                                }
                              }}
                            >
                              {t('delete')}
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
                {t('no_activities')}
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
            {t('add_stage')}
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

        <StageDialog
          open={stageDialog}
          onClose={() => {
            setStageDialog(false);
            setEditingStage(null);
            setNewStage({ name: '', countryId: '', startDate: '', endDate: '' });
            setSelectedCountry(null);
          }}
          editingStage={editingStage}
          newStage={newStage}
          setNewStage={setNewStage}
          selectedCountry={selectedCountry}
          setSelectedCountry={setSelectedCountry}
          countries={countries}
          countriesLoading={countriesLoading}
          onSubmit={editingStage ? handleUpdateStage : handleCreateStage}
        />

        <ActivityTypeDialog
          open={activityTypeDialog}
          onClose={() => setActivityTypeDialog(false)}
          selectedActivityType={selectedActivityType}
          setSelectedActivityType={setSelectedActivityType}
          activityTypes={activityTypes}
          onContinue={() => {
            if (selectedActivityType) {
              setNewActivity({ ...newActivity, activityTypeId: selectedActivityType });
              setActivityTypeDialog(false);
              setActivityDialog(true);
            }
          }}
        />

        <ActivityDialog
          open={activityDialog}
          onClose={() => {
            setActivityDialog(false);
            setEditingActivity(null);
            setSelectedActivityType('');
            setNewActivity({ name: '', activityTypeId: '', startDateTime: '', endDateTime: '', city: '', cost: '', airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '', seat: '', confirmationCode: '', gate: '', terminal: '', address: '', phone: '', checkInDate: '', checkOutDate: '', confirmationNumber: '', roomType: '', company: '', pickupLocation: '', dropoffLocation: '', pickupDate: '', dropoffDate: '', carType: '' });
          }}
          editingActivity={editingActivity}
          selectedStage={selectedStage}
          newActivity={newActivity}
          setNewActivity={setNewActivity}
          activityTypes={activityTypes}
          onSubmit={editingActivity ? handleUpdateActivity : handleCreateActivity}
        />

        <MergeStagesDialog
          open={mergeDialog}
          onClose={() => setMergeDialog(false)}
          selectedStages={selectedStages}
          onMerge={handleMergeStages}
        />
      </Box>
    </Box>
  );
};

export default TripDetail;