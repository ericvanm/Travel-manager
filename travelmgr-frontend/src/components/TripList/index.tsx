/**
 * "My trips" hub: list, inline CRUD, and entry points for AI/import flows.
 *
 * Consistency summaries load in parallel with the trip list; a failure there only hides
 * per-trip indicators — the list itself still renders.
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Fab, AppBar, Toolbar, IconButton, Tooltip, Alert
} from '@mui/material';
import { Add, Logout } from '@mui/icons-material';
import { Trip } from '../../types';
import { getTrips, createTrip, updateTrip, deleteTrip } from '../../services/trips';
import { logout } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useFeatures } from '../../contexts/FeaturesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import TripDialog from './TripDialog';
import TripTable from './TripTable';
import ImportMenu from './ImportMenu';
import ImportDialog from './ImportDialog';
import { AIDocumentImport } from '../AIDocumentImport';
import AITripPlanning from '../AITripPlanning';
import AITripAdapt from '../AITripAdapt';
import UserProfile from '../UserProfile';
import { exportTripToCsv } from './tripCsvExport';
import { getTripConsistencySummary, TripConsistencySummary } from '../../services/tripConsistency';

interface TripListProps {
  onTripSelect: (trip: Trip) => void;
}

const TripList: React.FC<TripListProps> = ({ onTripSelect }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [open, setOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importType, setImportType] = useState<'ICS' | 'CSV'>('ICS');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDetails, setImportDetails] = useState<string[] | null>(null);
  const [aiImportDialog, setAiImportDialog] = useState(false);
  const [aiImportTripId, setAiImportTripId] = useState<number | null>(null);
  const [aiPlanningDialog, setAiPlanningDialog] = useState(false);
  const [aiAdaptDialog, setAiAdaptDialog] = useState(false);
  const [adaptTrip, setAdaptTrip] = useState<Trip | null>(null);
  const [consistencySummaries, setConsistencySummaries] = useState<TripConsistencySummary[]>([]);
  const [profileDialog, setProfileDialog] = useState(false);
  const { user, setUser } = useAuth();
  const { aiEnabled } = useFeatures();
  const { t } = useLanguage();
  const readOnly = Boolean(user?.readOnly);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const [data, summaries] = await Promise.all([
        getTrips(),
        getTripConsistencySummary().catch(() => [] as TripConsistencySummary[])
      ]);
      setTrips(data);
      setConsistencySummaries(summaries);
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
  };

  const consistencyByTripId = Object.fromEntries(
    consistencySummaries.map((s) => [s.tripId, s])
  );

  const handleCreateTrip = async () => {
    if (!newTrip.name.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      if (editingTrip) {
        const updatedTrip = await updateTrip(editingTrip.id, newTrip);
        setTrips(trips.map(t => t.id === editingTrip.id ? updatedTrip : t));
      } else {
        const trip = await createTrip(newTrip);
        setTrips([...trips, trip]);
      }
      handleCloseDialog();
    } catch (error: any) {
      console.error('Failed to save trip:', error);
      if (error.response?.status === 400) {
        setError(t(error.response.data.error));
      } else {
        setError(t('trip_save_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: number) => {
    try {
      await deleteTrip(tripId);
      setTrips(trips.filter(t => t.id !== tripId));
    } catch (error) {
      console.error('Failed to delete trip:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingTrip(null);
    setNewTrip({ name: '', description: '' });
    setError(null);
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setNewTrip({ name: trip.name, description: trip.description || '' });
    setError(null);
    setOpen(true);
  };

  const handleExportTrip = async (trip: Trip) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    try {
      await exportTripToCsv(trip, backendUrl);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('export_failed'));
    }
  };

  const handleImportCsvClick = (trip: Trip) => {
    setSelectedTrip(trip);
    document.getElementById('csv-file-input')?.click();
  };

  const handleAdaptAi = (trip: Trip) => {
    setAdaptTrip(trip);
    setAiAdaptDialog(true);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTrip) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    try {
      const text = await file.text();
      const response = await fetch(`${backendUrl}/trips/${selectedTrip.id}/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`CSV imported successfully: ${result.importedStages} stages, ${result.importedActivities} activities`);
      } else {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        console.error('[CSV Import] Failed:', response.status, errorData);
        alert(`CSV import failed: ${errorData.error}${errorData.details ? '\n' + errorData.details : ''}`);
      }
    } catch (error) {
      console.error('[CSV Import] Network error:', error);
      alert('CSV import failed: network error');
    }

    event.target.value = '';
  };

  const handleNewICSImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportType('ICS');
    setImportError(null);
    setImportDialog(true);
    event.target.value = '';
  };

  const handleNewCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    setImportType('CSV');
    setImportError(null);
    setImportDialog(true);
    event.target.value = '';
  };

  const handleImportConfirm = async (tripName: string) => {
    if (!importFile) return;

    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
    let trip: Trip | null = null;
    try {
      trip = await createTrip({ name: tripName, description: '' });
      const content = await importFile.text();

      if (importType === 'ICS') {
        const response = await fetch(`${backendUrl}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ icsContent: content, userId: user?.id, tripId: trip.id, tripName })
        });
        if (response.ok) {
          await response.json();
          await loadTrips();
          setImportDialog(false);
          setImportFile(null);
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          console.error('[Import] ICS failed:', response.status, errorData);
          const details = [errorData.error, errorData.details, ...(errorData.warnings || [])].filter(Boolean);
          setImportError(t('import_failed'));
          setImportDetails(details);
        }
      } else {
        const response = await fetch(`${backendUrl}/trips/${trip.id}/import-csv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ csvContent: content })
        });
        if (response.ok) {
          await response.json();
          await loadTrips();
          setImportDialog(false);
          setImportFile(null);
        } else {
          const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          console.error('[Import] CSV failed:', response.status, errorData);
          const details = [errorData.error, errorData.details, ...(errorData.warnings || [])].filter(Boolean);
          setImportError(t('import_failed'));
          setImportDetails(details);
        }
      }
    } catch (error: any) {
      console.error('[Import] Unexpected error:', error);
      setImportError(t('import_failed'));
      setImportDetails([error?.message || String(error)]);
    }
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Travel Manager - {t('welcome')} {user?.name}
          </Typography>
          <IconButton color="inherit" onClick={() => setProfileDialog(true)}>
            <Typography variant="body2" sx={{ mr: 1 }}>{t('profile')}</Typography>
          </IconButton>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        {readOnly && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('read_only_mode_banner')}
          </Alert>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">{t('my_trips')}</Typography>
          {!readOnly && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <ImportMenu
              onICSImport={() => document.getElementById('new-ics-file-input')?.click()}
              onCSVImport={() => document.getElementById('new-csv-file-input')?.click()}
              onAIImport={() => aiEnabled && setAiImportDialog(true)}
              onAIPlanning={() => aiEnabled && setAiPlanningDialog(true)}
              aiEnabled={aiEnabled}
            />
            <Tooltip title={!aiEnabled ? t('ai_features_disabled') : ''}>
              <span>
                <Button
                  variant="outlined"
                  color="secondary"
                  disabled={!aiEnabled}
                  onClick={() => aiEnabled && setAiPlanningDialog(true)}
                >
                  {t('plan_trip_ai')}
                </Button>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
            >
              {t('create_trip')}
            </Button>
          </Box>
          )}
        </Box>

        <TripTable
          trips={trips}
          consistencyByTripId={consistencyByTripId}
          onTripSelect={onTripSelect}
          onEdit={handleEditTrip}
          onExport={handleExportTrip}
          onImportCsv={handleImportCsvClick}
          onDelete={handleDeleteTrip}
          onAdaptAi={handleAdaptAi}
          aiEnabled={aiEnabled}
          readOnly={readOnly}
        />

        {!readOnly && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setOpen(true)}
        >
          <Add />
        </Fab>
        )}

        <TripDialog
          open={open}
          onClose={handleCloseDialog}
          onSave={handleCreateTrip}
          editingTrip={editingTrip}
          newTrip={newTrip}
          setNewTrip={setNewTrip}
          loading={loading}
          error={error}
          onErrorClear={() => setError(null)}
        />


        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleImportCSV}
        />
        
        <input
          id="new-ics-file-input"
          type="file"
          accept=".ics"
          style={{ display: 'none' }}
          onChange={handleNewICSImport}
        />
        
        <input
          id="new-csv-file-input"
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={handleNewCSVImport}
        />
        
        <ImportDialog
          open={importDialog}
          onClose={() => {
            setImportDialog(false);
            setImportError(null);
            setImportDetails(null);
          }}
          onConfirm={handleImportConfirm}
          importType={importType}
          fileName={importFile?.name || ''}
          error={importError}
          details={importDetails}
          onErrorClear={() => { setImportError(null); setImportDetails(null); }}
        />
        
        {aiImportDialog && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '90%',
              overflow: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Import Document IA</h2>
                <Button onClick={() => setAiImportDialog(false)}>✕</Button>
              </div>
              <p>Sélectionnez d'abord un voyage existant pour y ajouter des activités :</p>
              <div style={{ marginBottom: '20px' }}>
                {trips.map(trip => (
                  <Button
                    key={trip.id}
                    variant="outlined"
                    onClick={() => {
                      setAiImportTripId(trip.id)
                    }}
                    style={{ margin: '5px', display: 'block', width: '100%', textAlign: 'left' }}
                  >
                    {trip.name} ({trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'Pas de date'})
                  </Button>
                ))}
              </div>
              
              {aiImportTripId && (
                <AIDocumentImport 
                  tripId={aiImportTripId}
                  onImportComplete={() => {
                    loadTrips()
                    setAiImportDialog(false)
                    setAiImportTripId(null)
                  }}
                />
              )}
            </div>
          </div>
        )}
        
        <UserProfile
          open={profileDialog}
          onClose={() => setProfileDialog(false)}
        />

        <AITripPlanning
          open={aiPlanningDialog}
          onClose={() => setAiPlanningDialog(false)}
          onTripCreated={async (trip) => {
            await loadTrips();
            onTripSelect(trip);
          }}
        />

        <AITripAdapt
          open={aiAdaptDialog}
          trip={adaptTrip}
          onClose={() => {
            setAiAdaptDialog(false);
            setAdaptTrip(null);
          }}
          onApplied={loadTrips}
        />
      </Box>
    </Box>
  );
};

export default TripList;