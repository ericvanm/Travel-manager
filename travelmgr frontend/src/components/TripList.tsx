import React, { useState, useEffect } from 'react';
import {
  Box, Button, Card, CardContent, Typography, Grid, Fab, Dialog,
  DialogTitle, DialogContent, TextField, DialogActions, AppBar,
  Toolbar, IconButton
} from '@mui/material';
import { Add, Logout } from '@mui/icons-material';
import { Trip } from '../types';
import { getTrips, createTrip } from '../services/trips';
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
      const trip = await createTrip(newTrip);
      setTrips([...trips, trip]);
      setNewTrip({ name: '', description: '' });
      setOpen(false);
    } catch (error) {
      console.error('Failed to create trip:', error);
    } finally {
      setLoading(false);
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
        <Typography variant="h4" gutterBottom>
          My Trips
        </Typography>

        <Grid container spacing={3}>
          {trips.map((trip) => (
            <Grid item xs={12} sm={6} md={4} key={trip.id}>
              <Card 
                sx={{ cursor: 'pointer', '&:hover': { elevation: 4 } }}
                onClick={() => onTripSelect(trip)}
              >
                <CardContent>
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

        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Trip</DialogTitle>
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
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTrip} disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default TripList;