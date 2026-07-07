import React, { useState, useEffect } from 'react';
import {
  Box, Typography, AppBar, Toolbar, IconButton, Paper, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Fab, Checkbox
} from '@mui/material';
import { ArrowBack, Add, MergeType, AccountTree } from '@mui/icons-material';
import { Trip, Stage, Activity, ActivityFormState, ActivityInput, Country, ActivityType, DuplicateActivity, TimelineActivityStatus, TimelineDay, emptyActivityForm } from '../../types';
import { getTrip, getActivityTypes, getStagesByTrip, createStage, createActivity, updateStage, deleteStage, updateActivity, deleteActivity, mergeStages, structureTrip, getTripTimeline, analyzeDuplicates } from '../../services/trips';
import { useCountries } from '../../contexts/CountriesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import StageDialog from './StageDialog';
import ActivityTypeDialog from './ActivityTypeDialog';
import ActivityDialog from './ActivityDialog';
import MergeStagesDialog from './MergeStagesDialog';

const TIMELINE_STATUS_COLORS: Record<TimelineActivityStatus, string> = {
  starts: 'success.main',
  ends: 'error.main',
  continues: 'warning.main',
};

const TIMELINE_STATUS_LABELS: Record<TimelineActivityStatus, string> = {
  starts: 'Début',
  ends: 'Fin',
  continues: 'En cours',
};

interface TripDetailProps {
  tripId: number;
  onBack: () => void;
  viewMode?: 'timeline' | 'stages';
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId, onBack, viewMode = 'timeline' }) => {
  const { t } = useLanguage();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [timeline, setTimeline] = useState<TimelineDay[]>([]);
  const [currentViewMode, setCurrentViewMode] = useState<'timeline' | 'stages'>(viewMode);
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
  const [newActivity, setNewActivity] = useState<ActivityFormState>(emptyActivityForm());

  useEffect(() => {
    loadTripData();
    loadStagesData();
    loadActivityTypes();
    loadTimeline();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildActivityPayload = (form: ActivityFormState, stageId: number): ActivityInput => {
    const activityTypeId = parseInt(form.activityTypeId)
    const activityData: ActivityInput = {
      name: form.name,
      stageId,
      activityTypeId,
      startDateTime: form.startDateTime || null,
      endDateTime: form.endDateTime || null,
      city: form.city || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      confirmationNumber: form.confirmationNumber || null,
    }

    if (activityTypeId === 6) {
      activityData.airline = form.airline || null
      activityData.flightNumber = form.flightNumber || null
      activityData.departureAirport = form.departureAirport || null
      activityData.arrivalAirport = form.arrivalAirport || null
      activityData.seat = form.seat || null
      activityData.confirmationCode = form.confirmationCode || null
      activityData.gate = form.gate || null
      activityData.terminal = form.terminal || null
    }

    if (activityTypeId === 7) {
      activityData.checkInDate = form.checkInDate || null
      activityData.checkOutDate = form.checkOutDate || null
      activityData.address = form.address || null
      activityData.phone = form.phone || null
      activityData.confirmationNumber = form.confirmationNumber || null
      activityData.roomType = form.roomType || null
    }

    return activityData
  }

  const buildActivityUpdatePayload = (form: ActivityFormState): Partial<Activity> => {
    const activityTypeId = parseInt(form.activityTypeId)
    const activityData: Partial<Activity> = {
      name: form.name,
      activityTypeId,
      startDateTime: form.startDateTime || null,
      endDateTime: form.endDateTime || null,
      city: form.city || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      confirmationNumber: form.confirmationNumber || null,
    }

    if (activityTypeId === 6) {
      activityData.airline = form.airline || null
      activityData.flightNumber = form.flightNumber || null
      activityData.departureAirport = form.departureAirport || null
      activityData.arrivalAirport = form.arrivalAirport || null
      activityData.seat = form.seat || null
      activityData.confirmationCode = form.confirmationCode || null
      activityData.gate = form.gate || null
      activityData.terminal = form.terminal || null
    }

    if (activityTypeId === 7) {
      activityData.checkInDate = form.checkInDate || null
      activityData.checkOutDate = form.checkOutDate || null
      activityData.address = form.address || null
      activityData.phone = form.phone || null
      activityData.confirmationNumber = form.confirmationNumber || null
      activityData.roomType = form.roomType || null
    }

    return activityData
  }

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

  const loadTimeline = async () => {
    try {
      const timelineData = await getTripTimeline(tripId);
      setTimeline(timelineData);
    } catch (error) {
      console.error('Failed to load timeline:', error);
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
      await createActivity(buildActivityPayload(newActivity, selectedStage.id));
      await loadStagesData();
      setActivityDialog(false);
      setNewActivity(emptyActivityForm());
      setSelectedStage(null);
    } catch (error) {
      console.error('Failed to create activity:', error);
    }
  };

  const handleUpdateActivity = async () => {
    if (!newActivity.name.trim() || !newActivity.activityTypeId || !editingActivity) return;
    
    try {
      await updateActivity(editingActivity.id, buildActivityUpdatePayload(newActivity));
      await loadStagesData();
      setActivityDialog(false);
      setEditingActivity(null);
      setNewActivity(emptyActivityForm());
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  };

  const handleEditActivity = (activity: Activity, stage: Stage) => {
    setEditingActivity(activity);
    setSelectedStage(stage);
    const timezone = stage.Country?.timezone || 'UTC';
    const formatDateTimeForInput = (dateTime: string | null | undefined): string => {
      if (!dateTime) return '';
      const date = new Date(dateTime);
      return date.toLocaleString('sv-SE', { timeZone: timezone }).slice(0, 16);
    };
    const formatDateForInput = (dateTime: string | null | undefined): string => {
      if (!dateTime) return '';
      const date = new Date(dateTime);
      return date.toLocaleDateString('sv-SE', { timeZone: timezone });
    };

    const checkInSource = activity.checkInDate || activity.startDateTime;
    const checkOutSource = activity.checkOutDate || activity.endDateTime;

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
      checkInDate: activity.activityTypeId === 7 ? formatDateForInput(checkInSource) : '',
      checkOutDate: activity.activityTypeId === 7 ? formatDateForInput(checkOutSource) : '',
      checkInTime: activity.activityTypeId === 7 && checkInSource
        ? new Date(checkInSource).toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false }).slice(0, 5)
        : '',
      checkOutTime: activity.activityTypeId === 7 && checkOutSource
        ? new Date(checkOutSource).toLocaleTimeString('en-GB', { timeZone: timezone, hour12: false }).slice(0, 5)
        : '',
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

  const handleStructureTrip = async () => {
    try {
      // First, analyze duplicates
      const duplicateAnalysis = await analyzeDuplicates(tripId);
      
      let confirmMessage = t('structure_trip_confirm');
      if (duplicateAnalysis.count > 0) {
        confirmMessage += `\n\n${duplicateAnalysis.count} doublons détectés :\n`;
        duplicateAnalysis.duplicates.slice(0, 5).forEach((dup: DuplicateActivity, index: number) => {
          confirmMessage += `${index + 1}. ${dup.name} (${dup.type}) - ${dup.stage}\n`;
        });
        if (duplicateAnalysis.count > 5) {
          confirmMessage += `... et ${duplicateAnalysis.count - 5} autres\n`;
        }
        confirmMessage += '\nCes doublons seront supprimés automatiquement.';
      }
      
      if (window.confirm(confirmMessage)) {
        const result = await structureTrip(tripId);
        const count = result.message.match(/\d+/)?.[0] || '0';
        if (count === '0' && duplicateAnalysis.count === 0) {
          alert(t('structure_trip_no_activities'));
        } else {
          let successMessage = '';
          if (count !== '0') {
            successMessage += t('structure_trip_success', { count });
          }
          if (duplicateAnalysis.count > 0) {
            if (successMessage) successMessage += '\n';
            successMessage += `${duplicateAnalysis.count} doublons supprimés.`;
          }
          alert(successMessage || 'Voyage structuré avec succès.');
          await loadStagesData();
          await loadTimeline();
        }
      }
    } catch (error) {
      console.error('Failed to structure trip:', error);
      alert(t('structure_trip_error'));
    }
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
            {currentViewMode === 'timeline' ? 'Chronologie du voyage' : t('stages')}
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
              variant="outlined"
              color="primary"
              onClick={() => setCurrentViewMode(currentViewMode === 'timeline' ? 'stages' : 'timeline')}
            >
              {currentViewMode === 'timeline' ? 'Vue par étapes' : 'Vue chronologique'}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={handleStructureTrip}
              startIcon={<AccountTree />}
            >
              {t('structure_trip')}
            </Button>
            <Button
              variant={mergeMode ? "contained" : "outlined"}
              color={mergeMode ? "secondary" : "primary"}
              onClick={toggleMergeMode}
            >
              {mergeMode ? t('cancel') : t('merge')}
            </Button>
          </Box>
        </Box>

        {currentViewMode === 'timeline' ? (
          timeline.map((day) => (
            <Paper key={day.date} sx={{ mb: 2, p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {new Date(day.date).toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Typography>
                {day.stage && (
                  <Typography variant="body2" color="text.secondary">
                    {day.stage.name}
                  </Typography>
                )}
              </Box>
              
              {day.activities.length > 0 ? (
                <Box sx={{ pl: 2 }}>
                  {day.activities.map((activity, index) => {
                    const statusColor = TIMELINE_STATUS_COLORS[activity.status];
                    const statusText = TIMELINE_STATUS_LABELS[activity.status];
                    
                    return (
                      <Box 
                        key={`${activity.id}-${index}`} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2, 
                          py: 1,
                          borderLeft: `3px solid`,
                          borderColor: statusColor,
                          pl: 2,
                          mb: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.04)'
                          }
                        }}
                        onClick={() => {
                          const activityStage = stages.find(s => s.id === activity.stageId);
                          if (activityStage) {
                            handleEditActivity(activity, activityStage);
                          }
                        }}
                      >
                        <Box sx={{ 
                          minWidth: 60,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          color: statusColor
                        }}>
                          {statusText}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {activity.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {activityTypes.find(type => type.id === activity.activityTypeId)?.label || 'N/A'}
                            {activity.city && ` • ${activity.city}`}
                          </Typography>
                        </Box>
                        {activity.status === 'starts' && activity.startDateTime && (
                          <Typography variant="body2" color="text.secondary">
                            {new Date(activity.startDateTime).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Typography>
                        )}
                        {activity.status === 'ends' && activity.endDateTime && (
                          <Typography variant="body2" color="text.secondary">
                            {new Date(activity.endDateTime).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 2 }}>
                  Aucune activité prévue
                </Typography>
              )}
            </Paper>
          ))
        ) : (
          stages.map((stage) => (
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
                      }).map((activity) => {
                        const isMultiDay = activity.startDateTime && activity.endDateTime && 
                          (new Date(activity.endDateTime).getTime() - new Date(activity.startDateTime).getTime()) > (24 * 60 * 60 * 1000);
                        const isGrouped = Boolean(activity.groupId);
                        
                        return (
                          <TableRow 
                            key={activity.id}
                            sx={{
                              backgroundColor: isGrouped ? 'rgba(25, 118, 210, 0.08)' : 'inherit',
                              borderLeft: isMultiDay ? '4px solid #1976d2' : 'none'
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {activity.name}
                                {isMultiDay && (
                                  <Box 
                                    sx={{ 
                                      fontSize: '0.75rem', 
                                      fontWeight: 'bold',
                                      px: 1,
                                      py: 0.25,
                                      borderRadius: 1,
                                      bgcolor: 'primary.main',
                                      color: 'white'
                                    }}
                                  >
                                    Multi-jour
                                  </Box>
                                )}
                                {isGrouped && (
                                  <Box 
                                    sx={{ 
                                      fontSize: '0.75rem', 
                                      fontWeight: 'bold',
                                      px: 1,
                                      py: 0.25,
                                      borderRadius: 1,
                                      bgcolor: 'success.main',
                                      color: 'white'
                                    }}
                                  >
                                    Groupé
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
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
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  {t('no_activities')}
                </Typography>
              )}
            </Paper>
          ))
        )}

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
            setNewActivity(emptyActivityForm());
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