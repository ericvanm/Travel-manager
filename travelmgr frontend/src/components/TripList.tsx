import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid, Fab, Dialog,
  DialogTitle, DialogContent, TextField, DialogActions, AppBar,
  Toolbar, IconButton, Menu, MenuItem
} from '@mui/material';
import { Add, Logout, MoreVert } from '@mui/icons-material';
import { Trip } from '../types';
import { getTrips, createTrip, updateTrip, deleteTrip } from '../services/trips';
import { logout } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

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
      setNewTrip({ name: '', description: '' });
      setEditingTrip(null);
      setOpen(false);
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
    
    // Reset file input
    event.target.value = '';
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
          <Typography variant="h4">
            My Trips
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => document.getElementById('ics-file-input').click()}
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

        <Grid container spacing={3}>
          {trips.map((trip) => (
            <Grid item xs={12} sm={6} md={4} key={trip.id}>
              <Card sx={{ position: 'relative' }}>
                <CardContent onClick={() => onTripSelect(trip)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Typography variant="h6" gutterBottom>
                    {trip.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {trip.description || 'No description'}
                  </Typography>
                  {trip.startDate && (
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                      {new Date(trip.startDate).toLocaleDateString()} - 
                      {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : 'Ongoing'}
                    </Typography>
                  )}
                </CardContent>
                <IconButton
                  sx={{ position: 'absolute', top: 8, right: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrip(trip);
                    setAnchorEl(e.currentTarget);
                  }}
                >
                  <MoreVert />
                </IconButton>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Fab
          color="primary"
          aria-label="add"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          onClick={() => setOpen(true)}
        >
          <Add />
        </Fab>

        <Dialog open={open} onClose={() => {
          setOpen(false);
          setEditingTrip(null);
          setNewTrip({ name: '', description: '' });
        }} maxWidth="sm" fullWidth>
          <DialogTitle>{editingTrip ? 'Edit Trip' : 'Create New Trip'}</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Trip Name"
              fullWidth
              variant="outlined"
              value={newTrip.name}
              onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              value={newTrip.description}
              onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setOpen(false);
              setEditingTrip(null);
              setNewTrip({ name: '', description: '' });
            }}>Cancel</Button>
            <Button onClick={handleCreateTrip} disabled={loading}>
              {loading ? (editingTrip ? 'Updating...' : 'Creating...') : (editingTrip ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            if (selectedTrip) {
              setEditingTrip(selectedTrip);
              setNewTrip({ name: selectedTrip.name, description: selectedTrip.description || '' });
              setOpen(true);
            }
            setAnchorEl(null);
          }}>
            Edit
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedTrip && window.confirm('Are you sure you want to delete this trip?')) {
              handleDeleteTrip(selectedTrip.id);
            }
            setAnchorEl(null);
          }}>
            Delete
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
};

export default TripList;