/**
 * Main trip editor: timeline or stage table, consistency banner, AI adapt entry points.
 *
 * - `readOnly`: admin inspection mode — hides create/edit/delete actions.
 * - `resolvePreload` / `resolveMode`: opens AI adapt on the proposal step after
 *   "fix consistency" without running the manual synthesis step again.
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Typography, AppBar, Toolbar, IconButton, Paper, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Fab, Checkbox, Alert
} from '@mui/material';
import { ArrowBack, Add, MergeType, AccountTree } from '@mui/icons-material';
import { Trip, Stage, Activity, ActivityFormState, ActivityInput, Country, ActivityType, TimelineDay, emptyActivityForm } from '../../types';
import { getTrip, getActivityTypes, getStagesByTrip, createStage, createActivity, updateStage, deleteStage, updateActivity, deleteActivity, mergeStages, structureTrip, getTripTimeline, analyzeDuplicates, reserveActivity, updateTrip, deleteTrip } from '../../services/trips';
import { ACTIVITY_TYPE, isGroundTransportActivityType, isPrivateCarActivityType } from '../../utils/activityTypes';
import { useCountries } from '../../contexts/CountriesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import StageDialog from './StageDialog';
import ActivityTypeDialog from './ActivityTypeDialog';
import ActivityDialog from './ActivityDialog';
import TripMapDialog from './TripMapDialog';
import TripBudgetSummary from './TripBudgetSummary';
import TripBudgetDetailDialog from './TripBudgetDetailDialog';
import MergeStagesDialog from './MergeStagesDialog';
import { TimelineActivityRow } from './TimelineActivityRow';
import { buildStructureConfirmMessage, buildStructureSuccessMessage } from './structureTripHelpers';
import TripActionsToolbar from '../shared/TripActionsToolbar';
import AITripAdapt from '../AITripAdapt';
import TripDialog from '../TripList/TripDialog';
import { exportTripToCsv } from '../TripList/tripCsvExport';
import { formatDateLong, formatDateTime, formatDateOnly } from '../../utils/localeHelpers';
import { getStageTimezone } from '../../utils/tripTimezoneHelpers';
import {
  formatDateTimeForInputInTimezone,
  formatDateForInputInTimezone,
  formatTimeForInputInTimezone,
  localInputToUtcIso,
  combineDateAndTimeInTimezone
} from '../../utils/dateTimeInputHelpers';
import TripConsistencyBanner from '../shared/TripConsistencyBanner';
import TripConsistencyIndicator from '../shared/TripConsistencyIndicator';
import { getTripConsistency, TripConsistencyReport } from '../../services/tripConsistency';
import { resolveTripConsistency } from '../../services/ai-adapt';

interface TripDetailProps {
  tripId: number;
  onBack: () => void;
  viewMode?: 'timeline' | 'stages';
  readOnly?: boolean;
}

const TripDetail: React.FC<TripDetailProps> = ({ tripId, onBack, viewMode = 'timeline', readOnly = false }) => {
  const { t, language } = useLanguage();
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
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [budgetDetailOpen, setBudgetDetailOpen] = useState(false);
  const [editTripDialog, setEditTripDialog] = useState(false);
  const [editTripForm, setEditTripForm] = useState({ name: '', description: '' });
  const [editTripLoading, setEditTripLoading] = useState(false);
  const [editTripError, setEditTripError] = useState<string | null>(null);
  const [aiAdaptOpen, setAiAdaptOpen] = useState(false);
  const [consistencyReport, setConsistencyReport] = useState<TripConsistencyReport | null>(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [resolvingConsistency, setResolvingConsistency] = useState(false);
  const [resolvePreload, setResolvePreload] = useState<{
    sessionId: number
    adaptationRequest: string
    proposedChanges: import('../../services/ai-adapt').ProposedAdaptation
    reservedImpacts: import('../../services/ai-adapt').ReservedImpact[]
    accommodationWarnings?: import('../../services/ai-adapt').AccommodationWarnings
  } | null>(null);
  const [resolveMode, setResolveMode] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * Converts form fields from the stage timezone to UTC ISO strings for the API.
   * Hotels use separate check-in/out date+time fields; other activities use one datetime input.
   */
  const resolveFormUtcDateTimes = (
    form: ActivityFormState,
    timezone: string,
    activityTypeId: number
  ) => {
    if (activityTypeId === 7) {
      const startDateTime = form.checkInDate
        ? combineDateAndTimeInTimezone(form.checkInDate, form.checkInTime || '15:00', timezone)
        : null;
      const endDateTime = form.checkOutDate
        ? combineDateAndTimeInTimezone(form.checkOutDate, form.checkOutTime || '11:00', timezone)
        : null;
      return {
        startDateTime,
        endDateTime,
        checkInDate: form.checkInDate || null,
        checkOutDate: form.checkOutDate || null,
        checkInTime: form.checkInTime || '15:00',
        checkOutTime: form.checkOutTime || '11:00',
      };
    }
    return {
      startDateTime: localInputToUtcIso(form.startDateTime, timezone),
      endDateTime: localInputToUtcIso(form.endDateTime, timezone),
    };
  };

  useEffect(() => {
    loadTripData();
    loadStagesData();
    loadActivityTypes();
    loadTimeline();
    loadConsistency();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConsistency = async () => {
    setConsistencyLoading(true);
    try {
      const report = await getTripConsistency(tripId);
      setConsistencyReport(report);
    } catch (error) {
      console.error('Failed to load trip consistency:', error);
    } finally {
      setConsistencyLoading(false);
    }
  };

  const buildActivityPayload = (form: ActivityFormState, stageId: number, timezone: string): ActivityInput => {
    const activityTypeId = Number.parseInt(form.activityTypeId, 10)
    const dateTimes = resolveFormUtcDateTimes(form, timezone, activityTypeId)
    const activityData: ActivityInput = {
      name: form.name,
      stageId,
      activityTypeId,
      startDateTime: dateTimes.startDateTime,
      endDateTime: dateTimes.endDateTime,
      city: form.city || null,
      cost: form.cost ? Number.parseFloat(form.cost) : null,
      confirmationNumber: form.confirmationNumber || null,
      reservationStatus: form.reservationStatus || 'to_reserve',
      bookingUrl: form.bookingUrl || null,
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
      activityData.checkInDate = (dateTimes.checkInDate ?? form.checkInDate) || null
      activityData.checkOutDate = (dateTimes.checkOutDate ?? form.checkOutDate) || null
      activityData.checkInTime = (dateTimes.checkInTime ?? form.checkInTime) || '15:00'
      activityData.checkOutTime = (dateTimes.checkOutTime ?? form.checkOutTime) || '11:00'
      activityData.address = form.address || null
      activityData.phone = form.phone || null
      activityData.confirmationNumber = form.confirmationNumber || null
      activityData.roomType = form.roomType || null
    }

    if (activityTypeId === ACTIVITY_TYPE.CAR_RENTAL) {
      activityData.company = form.company || null
      activityData.pickupLocation = form.pickupLocation || null
      activityData.dropoffLocation = form.dropoffLocation || null
      activityData.carType = form.carType || null
      activityData.confirmationNumber = form.confirmationNumber || null
    }

    if (isPrivateCarActivityType(activityTypeId)) {
      activityData.departureLocation = form.departureLocation || null
      activityData.arrivalLocation = form.arrivalLocation || null
      activityData.cost = form.cost ? Number.parseFloat(form.cost) : 0
    }

    if (isGroundTransportActivityType(activityTypeId)) {
      activityData.company = form.company || null
      activityData.departureLocation = form.departureLocation || null
      activityData.arrivalLocation = form.arrivalLocation || null
      activityData.transportLine = form.transportLine || null
      activityData.transportChanges = form.transportChanges
        ? Number.parseInt(form.transportChanges, 10)
        : null
      activityData.confirmationNumber = form.confirmationNumber || null
    }

    return activityData
  }

  const appendTransportFieldsToUpdate = (
    activityData: Partial<Activity>,
    form: ActivityFormState,
    activityTypeId: number
  ) => {
    if (activityTypeId === ACTIVITY_TYPE.CAR_RENTAL) {
      activityData.company = form.company || null
      activityData.pickupLocation = form.pickupLocation || null
      activityData.dropoffLocation = form.dropoffLocation || null
      activityData.carType = form.carType || null
    }
    if (isPrivateCarActivityType(activityTypeId)) {
      activityData.departureLocation = form.departureLocation || null
      activityData.arrivalLocation = form.arrivalLocation || null
      activityData.cost = form.cost ? Number.parseFloat(form.cost) : 0
    }
    if (isGroundTransportActivityType(activityTypeId)) {
      activityData.company = form.company || null
      activityData.departureLocation = form.departureLocation || null
      activityData.arrivalLocation = form.arrivalLocation || null
      activityData.transportLine = form.transportLine || null
      activityData.transportChanges = form.transportChanges
        ? Number.parseInt(form.transportChanges, 10)
        : null
    }
  }

  const buildActivityUpdatePayload = (form: ActivityFormState, timezone: string): Partial<Activity> => {
    const activityTypeId = Number.parseInt(form.activityTypeId, 10)
    const dateTimes = resolveFormUtcDateTimes(form, timezone, activityTypeId)
    const activityData: Partial<Activity> = {
      name: form.name,
      activityTypeId,
      startDateTime: dateTimes.startDateTime,
      endDateTime: dateTimes.endDateTime,
      city: form.city || null,
      cost: form.cost ? Number.parseFloat(form.cost) : null,
      confirmationNumber: form.confirmationNumber || null,
      reservationStatus: form.reservationStatus || 'to_reserve',
      bookingUrl: form.bookingUrl || null,
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
      activityData.checkInDate = (dateTimes.checkInDate ?? form.checkInDate) || null
      activityData.checkOutDate = (dateTimes.checkOutDate ?? form.checkOutDate) || null
      activityData.checkInTime = (dateTimes.checkInTime ?? form.checkInTime) || '15:00'
      activityData.checkOutTime = (dateTimes.checkOutTime ?? form.checkOutTime) || '11:00'
      activityData.address = form.address || null
      activityData.phone = form.phone || null
      activityData.roomType = form.roomType || null
    }

    appendTransportFieldsToUpdate(activityData, form, activityTypeId)

    return activityData
  }

  const loadTripData = async () => {
    try {
      const data = await getTrip(tripId);
      setTrip(data);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to load trip:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setLoadError('session_expired');
          return;
        }
        if (error.response?.status === 404) {
          setLoadError('trip_not_found');
          return;
        }
      }
      setLoadError('trip_load_error');
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

  const reloadAll = async () => {
    await loadTripData();
    await loadStagesData();
    await loadTimeline();
    await loadConsistency();
  };

  const handleResolveConsistency = async () => {
    setResolvingConsistency(true);
    try {
      const result = await resolveTripConsistency(tripId);
      if (result.alreadyConsistent) {
        if (result.consistency) setConsistencyReport(result.consistency);
        else await loadConsistency();
        return;
      }
      if (result.sessionId && result.proposedChanges) {
        setResolvePreload({
          sessionId: result.sessionId,
          adaptationRequest: result.adaptationRequest || '',
          proposedChanges: result.proposedChanges,
          reservedImpacts: result.reservedImpacts || [],
          accommodationWarnings: result.accommodationWarnings
        });
        setResolveMode(true);
        setAiAdaptOpen(true);
      }
    } catch (error) {
      console.error('Failed to resolve consistency:', error);
      alert(t('trip_consistency_resolve_error'));
    } finally {
      setResolvingConsistency(false);
    }
  };

  const handleAdaptAiOpen = () => {
    setResolvePreload(null);
    setResolveMode(false);
    setAiAdaptOpen(true);
  };

  const handleExportTrip = async () => {
    if (!trip) return;
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    try {
      await exportTripToCsv(trip, backendUrl);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('export_failed'));
    }
  };

  const handleImportCsvClick = () => {
    document.getElementById(`csv-file-input-${tripId}`)?.click();
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    try {
      const text = await file.text();
      const response = await fetch(`${backendUrl}/trips/${tripId}/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${t('import_csv_success')}: ${result.importedStages} ${t('stages').toLowerCase()}, ${result.importedActivities} ${t('activities').toLowerCase()}`);
        await reloadAll();
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        alert(`${t('import_csv_failed')}: ${errorData.error}`);
      }
    } catch (error) {
      console.error('[CSV Import] Network error:', error);
      alert(t('import_csv_failed'));
    }

    event.target.value = '';
  };

  const handleEditTripOpen = () => {
    if (!trip) return;
    setEditTripForm({ name: trip.name, description: trip.description || '' });
    setEditTripError(null);
    setEditTripDialog(true);
  };

  const handleEditTripSave = async () => {
    if (!editTripForm.name.trim()) return;
    setEditTripLoading(true);
    setEditTripError(null);
    try {
      const updated = await updateTrip(tripId, editTripForm);
      setTrip(updated);
      setEditTripDialog(false);
    } catch (error) {
      console.error('Failed to update trip:', error);
      setEditTripError(t('trip_save_error'));
    } finally {
      setEditTripLoading(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!window.confirm(t('delete_trip_confirm', { name: trip?.name || '' }))) return;
    try {
      await deleteTrip(tripId);
      onBack();
    } catch (error) {
      console.error('Failed to delete trip:', error);
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
      await createActivity(buildActivityPayload(newActivity, selectedStage.id, getStageTimezone(selectedStage)));
      await loadStagesData();
      await loadTimeline();
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
      await updateActivity(
        editingActivity.id,
        buildActivityUpdatePayload(newActivity, getStageTimezone(selectedStage))
      );
      await loadStagesData();
      await loadTimeline();
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
    const timezone = getStageTimezone(stage);

    const checkInSource = activity.startDateTime || activity.checkInDate;
    const checkOutSource = activity.endDateTime || activity.checkOutDate;

    setNewActivity({
      name: activity.name || '',
      activityTypeId: activity.activityTypeId?.toString() || '',
      startDateTime: formatDateTimeForInputInTimezone(activity.startDateTime, timezone),
      endDateTime: formatDateTimeForInputInTimezone(activity.endDateTime, timezone),
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
      checkInDate: activity.activityTypeId === 7 ? formatDateForInputInTimezone(checkInSource, timezone) : '',
      checkOutDate: activity.activityTypeId === 7 ? formatDateForInputInTimezone(checkOutSource, timezone) : '',
      checkInTime: activity.activityTypeId === 7
        ? (activity.checkInTime
          || (checkInSource ? formatTimeForInputInTimezone(checkInSource, timezone, '15:00') : '15:00'))
        : '',
      checkOutTime: activity.activityTypeId === 7
        ? (activity.checkOutTime
          || (checkOutSource ? formatTimeForInputInTimezone(checkOutSource, timezone, '11:00') : '11:00'))
        : '',
      address: activity.address || '',
      phone: activity.phone || '',
      confirmationNumber: activity.confirmationNumber || '',
      roomType: activity.roomType || '',
      company: activity.company || '',
      pickupLocation: activity.pickupLocation || '',
      dropoffLocation: activity.dropoffLocation || '',
      pickupDate: activity.pickupDate ? formatDateForInputInTimezone(activity.pickupDate, timezone) : '',
      dropoffDate: activity.dropoffDate ? formatDateForInputInTimezone(activity.dropoffDate, timezone) : '',
      carType: activity.carType || '',
      departureLocation: activity.departureLocation || '',
      arrivalLocation: activity.arrivalLocation || '',
      transportLine: activity.transportLine || '',
      transportChanges: activity.transportChanges != null ? String(activity.transportChanges) : '',
      reservationStatus: activity.reservationStatus || 'to_reserve',
      bookingUrl: activity.bookingUrl || ''
    });
    setActivityDialog(true);
  };

  const handleReserveActivity = async () => {
    if (!editingActivity) return;
    try {
      await reserveActivity(editingActivity.id, {
        reservationStatus: 'reserved',
        bookingUrl: newActivity.bookingUrl || undefined,
        confirmationNumber: newActivity.confirmationNumber || undefined
      });
      await loadStagesData();
      await loadTimeline();
    } catch (error) {
      console.error('Failed to reserve activity:', error);
    }
  };

  const toggleActivitySelection = (activityId: number) => {
    setSelectedActivityIds((prev) =>
      prev.includes(activityId) ? prev.filter((id) => id !== activityId) : [...prev, activityId]
    );
  };

  const toggleStageActivitiesSelection = (stage: Stage, selected: boolean) => {
    const stageActivityIds = (stage.activities || []).map((a) => a.id);
    setSelectedActivityIds((prev) => {
      if (selected) {
        return [...new Set([...prev, ...stageActivityIds])];
      }
      return prev.filter((id) => !stageActivityIds.includes(id));
    });
  };

  const handleDeleteActivity = async (activityId: number) => {
    if (!window.confirm(t('delete_activity_confirm'))) return;
    try {
      await deleteActivity(activityId);
      setSelectedActivityIds((prev) => prev.filter((id) => id !== activityId));
      await loadStagesData();
      await loadTimeline();
    } catch (error) {
      console.error('Failed to delete activity:', error);
    }
  };

  const handleDeleteSelectedActivities = async () => {
    if (selectedActivityIds.length === 0) return;
    if (!window.confirm(t('delete_activities_confirm', { count: selectedActivityIds.length }))) return;
    try {
      await Promise.all(selectedActivityIds.map((id) => deleteActivity(id)));
      setSelectedActivityIds([]);
      await loadStagesData();
      await loadTimeline();
    } catch (error) {
      console.error('Failed to delete activities:', error);
    }
  };

  const selectStage = (stageId: number) => {
    setSelectedStageIds(prev => [...prev, stageId]);
  };

  const deselectStage = (stageId: number) => {
    setSelectedStageIds(prev => prev.filter(id => id !== stageId));
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
      const duplicateAnalysis = await analyzeDuplicates(tripId);
      const confirmMessage = buildStructureConfirmMessage(t('structure_trip_confirm'), duplicateAnalysis);

      if (!window.confirm(confirmMessage)) {
        return;
      }

      const result = await structureTrip(tripId);
      const count = result.message.match(/\d+/)?.[0] || '0';

      if (count === '0' && duplicateAnalysis.count === 0) {
        alert(t('structure_trip_no_activities'));
        return;
      }

      alert(buildStructureSuccessMessage(count, duplicateAnalysis.count, t));
      await loadStagesData();
      await loadTimeline();
    } catch (error) {
      console.error('Failed to structure trip:', error);
      alert(t('structure_trip_error'));
    }
  };

  const canMerge = selectedStageIds.length >= 2 && areStagesConsecutive(selectedStageIds);
  const selectedStages = stages.filter(stage => selectedStageIds.includes(stage.id));



  if (loadError) {
    return (
      <Box sx={{ p: 3, maxWidth: 480, mx: 'auto', mt: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{t(loadError)}</Alert>
        <Button variant="contained" onClick={onBack}>{t('back')}</Button>
      </Box>
    );
  }

  if (!trip) {
    return <Typography sx={{ p: 3 }}>{t('loading')}</Typography>;
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
          {consistencyReport && (
            <Box sx={{ mr: 1 }}>
              <TripConsistencyIndicator
                summary={{
                  tripId: consistencyReport.tripId,
                  health: consistencyReport.health,
                  budgetStatus: consistencyReport.budget.status,
                  issueCount: consistencyReport.issueCount,
                  errorCount: consistencyReport.errorCount,
                  warningCount: consistencyReport.warningCount
                }}
              />
            </Box>
          )}
          <TripActionsToolbar
            color="inherit"
            onExport={handleExportTrip}
            onMap={() => setMapDialogOpen(true)}
            showMap
            {...(!readOnly && {
              onEdit: handleEditTripOpen,
              onImportCsv: handleImportCsvClick,
              onAdaptAi: handleAdaptAiOpen,
              onDelete: handleDeleteTrip,
            })}
          />
        </Toolbar>
      </AppBar>

      <input
        id={`csv-file-input-${tripId}`}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleImportCSV}
      />

      <Box sx={{ p: 3 }}>
        <TripConsistencyBanner
          report={consistencyReport}
          loading={consistencyLoading}
          onResolve={readOnly ? undefined : handleResolveConsistency}
          resolving={resolvingConsistency}
        />

        <Typography variant="body1" paragraph>
          {trip.description}
        </Typography>

        <TripBudgetSummary
          trip={trip}
          stages={stages}
          onViewDetail={() => setBudgetDetailOpen(true)}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, mb: 2 }}>
          <Typography variant="h5">
            {currentViewMode === 'timeline' ? t('trip_timeline_title') : t('stages')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!readOnly && currentViewMode === 'stages' && selectedActivityIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteSelectedActivities}
              >
                {t('delete_selected', { count: selectedActivityIds.length })}
              </Button>
            )}
            {!readOnly && mergeMode && (
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
              {currentViewMode === 'timeline' ? t('trip_view_stages') : t('trip_view_timeline')}
            </Button>
            {!readOnly && (
              <>
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
              </>
            )}
          </Box>
        </Box>

        {currentViewMode === 'timeline' ? (
          timeline.map((day) => (
            <Paper key={day.date} sx={{ mb: 2, p: 2 }}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                  {formatDateLong(day.date, language, getStageTimezone(day.stage, stages))}
                </Typography>
                {day.stage && (
                  <Typography variant="body2" color="text.secondary">
                    {day.stage.name}
                  </Typography>
                )}
              </Box>
              
              {day.activities.length > 0 ? (
                <Box sx={{ pl: 2 }}>
                  {day.activities.map((activity, index) => (
                    <TimelineActivityRow
                      key={`${activity.id}-${index}`}
                      activity={activity}
                      index={index}
                      activityTypes={activityTypes}
                      stages={stages}
                      onEdit={readOnly ? undefined : handleEditActivity}
                      onDelete={readOnly ? undefined : handleDeleteActivity}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', pl: 2 }}>
                  {t('trip_timeline_no_activities')}
                </Typography>
              )}
            </Paper>
          ))
        ) : (
          stages.map((stage) => (
            <Paper key={stage.id} sx={{ mb: 3, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {!readOnly && mergeMode && (
                    <Checkbox
                      checked={selectedStageIds.includes(stage.id)}
                      onChange={(e) => (e.target.checked ? selectStage(stage.id) : deselectStage(stage.id))}
                    />
                  )}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {stage.name || `Stage ${stage.id}`}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stage.Country?.name || 'N/A'} • 
                      {stage.startDate ? formatDateOnly(stage.startDate, language, getStageTimezone(stage)) : 'N/A'} -
                      {stage.endDate ? formatDateOnly(stage.endDate, language, getStageTimezone(stage)) : 'N/A'}
                    </Typography>
                  </Box>
                </Box>
                {!readOnly && !mergeMode && (
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
                        {!readOnly && (
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={
                                stage.activities.some((a) => selectedActivityIds.includes(a.id))
                                && !stage.activities.every((a) => selectedActivityIds.includes(a.id))
                              }
                              checked={stage.activities.every((a) => selectedActivityIds.includes(a.id))}
                              onChange={(e) => toggleStageActivitiesSelection(stage, e.target.checked)}
                              inputProps={{ 'aria-label': t('select_all_activities') }}
                            />
                          </TableCell>
                        )}
                        <TableCell>{t('activity_name')}</TableCell>
                        <TableCell>{t('type')}</TableCell>
                        <TableCell>{t('city')}</TableCell>
                        <TableCell>{t('start_time')}</TableCell>
                        <TableCell>{t('end_time')}</TableCell>
                        <TableCell>{t('cost')}</TableCell>
                        {!readOnly && <TableCell>{t('actions')}</TableCell>}
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
                            {!readOnly && (
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedActivityIds.includes(activity.id)}
                                  onChange={() => toggleActivitySelection(activity.id)}
                                />
                              </TableCell>
                            )}
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
                              {activity.startDateTime
                                ? formatDateTime(activity.startDateTime, language, getStageTimezone(stage))
                                : t('na')}
                            </TableCell>
                            <TableCell>
                              {activity.endDateTime
                                ? formatDateTime(activity.endDateTime, language, getStageTimezone(stage))
                                : t('na')}
                            </TableCell>
                            <TableCell>
                              {activity.cost ? `$${activity.cost}` : t('na')}
                            </TableCell>
                            {!readOnly && (
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
                                    onClick={() => handleDeleteActivity(activity.id)}
                                  >
                                    {t('delete')}
                                  </Button>
                                </Box>
                              </TableCell>
                            )}
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

        {!readOnly && (
          <>
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
          </>
        )}

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
          onReserve={editingActivity ? handleReserveActivity : undefined}
        />

        <TripMapDialog
          tripId={tripId}
          open={mapDialogOpen}
          onClose={() => setMapDialogOpen(false)}
        />

        <TripBudgetDetailDialog
          open={budgetDetailOpen}
          onClose={() => setBudgetDetailOpen(false)}
          trip={trip}
          stages={stages}
        />

        <MergeStagesDialog
          open={mergeDialog}
          onClose={() => setMergeDialog(false)}
          selectedStages={selectedStages}
          onMerge={handleMergeStages}
        />

        <TripDialog
          open={editTripDialog}
          onClose={() => setEditTripDialog(false)}
          onSave={handleEditTripSave}
          editingTrip={trip}
          newTrip={editTripForm}
          setNewTrip={setEditTripForm}
          loading={editTripLoading}
          error={editTripError}
          onErrorClear={() => setEditTripError(null)}
        />

        {!readOnly && trip && (
          <AITripAdapt
            open={aiAdaptOpen}
            trip={trip}
            resolveMode={resolveMode}
            preloadedSession={resolvePreload}
            onClose={() => {
              setAiAdaptOpen(false);
              setResolvePreload(null);
              setResolveMode(false);
            }}
            onApplied={reloadAll}
          />
        )}
      </Box>
    </Box>
  );
};

export default TripDetail;
