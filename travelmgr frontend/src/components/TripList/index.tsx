import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Fab, AppBar, Toolbar, IconButton
} from '@mui/material';
import { Add, Logout } from '@mui/icons-material';
import { Trip } from '../../types';
import { getTrips, createTrip, updateTrip, deleteTrip } from '../../services/trips';
import { logout } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';
import TripDialog from './TripDialog';
import TripTable from './TripTable';
import TripActionsMenu from './TripActionsMenu';

interface TripListProps {
  onTripSelect: (trip: Trip) => void;
}

const TripList: React.FC<TripListProps> = ({ onTripSelect }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [open, setOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const { user, setUser } = useAuth();

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
    try {
      if (editingTrip) {
        const updatedTrip = await updateTrip(editingTrip.id, newTrip);
        setTrips(trips.map(t => t.id === editingTrip.id ? updatedTrip : t));
      } else {
        const trip = await createTrip(newTrip);
        setTrips([...trips, trip]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save trip:', error);
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

  const handleICSImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      const content = await file.text();
      const response = await fetch('http://localhost:8080/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ icsContent: content, userId: user?.id })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Import successful:', result);
        await loadTrips();
      } else {
        const errorText = await response.text();
        console.error('Import failed:', response.status, errorText);
        alert(`Import failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Import error:', error);
    }
    
    event.target.value = '';
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setEditingTrip(null);
    setNewTrip({ name: '', description: '' });
  };

  const handleEditTrip = (trip: Trip) => {
    setEditingTrip(trip);
    setNewTrip({ name: trip.name, description: trip.description || '' });
    setOpen(true);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, trip: Trip) => {
    setSelectedTrip(trip);
    setAnchorEl(event.currentTarget);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Travel Manager - Welcome {user?.name}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">My Trips</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => document.getElementById('ics-file-input')?.click()}
            >
              Import ICS
            </Button>
            <input
              id="ics-file-input"
              type="file"
              accept=".ics"
              style={{ display: 'none' }}
              onChange={handleICSImport}
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpen(true)}
            >
              Create Trip
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
        />

        <TripActionsMenu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          selectedTrip={selectedTrip}
          onEdit={handleEditTrip}
          onDelete={handleDeleteTrip}
        />
      </Box>
    </Box>
  );
};

export default TripList;