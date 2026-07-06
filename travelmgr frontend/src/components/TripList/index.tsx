import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Fab, AppBar, Toolbar, IconButton
} from '@mui/material';
import { Add, Logout } from '@mui/icons-material';
import { Trip } from '../../types';
import { getTrips, createTrip, updateTrip, deleteTrip } from '../../services/trips';
import { logout } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import TripDialog from './TripDialog';
import TripTable from './TripTable';
import TripActionsMenu from './TripActionsMenu';
import ImportMenu from './ImportMenu';
import ImportDialog from './ImportDialog';
import { AIDocumentImport } from '../AIDocumentImport';
import UserProfile from '../UserProfile';

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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importType, setImportType] = useState<'ICS' | 'CSV'>('ICS');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [aiImportDialog, setAiImportDialog] = useState(false);
  const [aiImportTripId, setAiImportTripId] = useState<number | null>(null);
  const [profileDialog, setProfileDialog] = useState(false);
  const { user, setUser } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await getTrips();
      setTrips(data);
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
  };

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

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, trip: Trip) => {
    setSelectedTrip(trip);
    setAnchorEl(event.currentTarget);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTrip) return;

    try {
      const text = await file.text();
      const response = await fetch(`http://localhost:8080/api/trips/${selectedTrip.id}/import-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csvContent: text })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('CSV import successful:', result);
        alert(`CSV imported successfully: ${result.importedStages} stages, ${result.importedActivities} activities`);
      } else {
        const errorText = await response.text();
        console.error('CSV import failed:', response.status, errorText);
        alert(`CSV import failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('CSV import error:', error);
      alert('CSV import failed');
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
    
    try {
      const trip = await createTrip({ name: tripName, description: '' });
      const content = await importFile.text();
      
      if (importType === 'ICS') {
        const response = await fetch('http://localhost:8080/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ 
            icsContent: content, 
            userId: user?.id,
            tripId: trip.id,
            tripName: tripName
          })
        });
        
        if (response.ok) {
          alert('ICS imported successfully!');
        } else {
          const errorText = await response.text();
          alert(`ICS import failed: ${response.status} - ${errorText}`);
        }
      } else {
        const response = await fetch(`http://localhost:8080/api/trips/${trip.id}/import-csv`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ csvContent: content })
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`CSV imported successfully: ${result.importedStages} stages, ${result.importedActivities} activities`);
        } else {
          const errorText = await response.text();
          alert(`CSV import failed: ${response.status} - ${errorText}`);
        }
      }
      
      await loadTrips();
      setImportDialog(false);
      setImportFile(null);
    } catch (error: any) {
      console.error('Import error:', error);
      if (error.response?.status === 400 && error.response?.data?.error) {
        setImportError(t(error.response.data.error));
      } else {
        setImportError(t('import_failed'));
      }
      // Ne pas fermer le dialogue en cas d'erreur pour permettre la correction
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">{t('my_trips')}</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <ImportMenu
              onICSImport={() => document.getElementById('new-ics-file-input')?.click()}
              onCSVImport={() => document.getElementById('new-csv-file-input')?.click()}
              onAIImport={() => setAiImportDialog(true)}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
            >
              {t('create_trip')}
            </Button>
          </Box>
        </Box>

        <TripTable
          trips={trips}
          onTripSelect={onTripSelect}
          onMenuClick={handleMenuClick}
        />

        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setOpen(true)}
        >
          <Add />
        </Fab>

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

        <TripActionsMenu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          selectedTrip={selectedTrip}
          onEdit={handleEditTrip}
          onDelete={handleDeleteTrip}
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
          }}
          onConfirm={handleImportConfirm}
          importType={importType}
          fileName={importFile?.name || ''}
          error={importError}
          onErrorClear={() => setImportError(null)}
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
      </Box>
    </Box>
  );
};

export default TripList;