import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Trip } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TripActionsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  selectedTrip: Trip | null;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: number) => void;
}

const handleExportCSV = async (trip: Trip) => {
  try {
    const response = await fetch(`http://localhost:8080/api/trips/${trip.id}`, {
      credentials: 'include'
    });
    const tripData = await response.json();
    
    const stagesResponse = await fetch(`http://localhost:8080/api/stages/trip/${trip.id}`, {
      credentials: 'include'
    });
    const stages = await stagesResponse.json();
    
    // Get activity types for mapping
    const activityTypesResponse = await fetch('http://localhost:8080/api/activity-types', {
      credentials: 'include'
    });
    const activityTypes = await activityTypesResponse.json();
    const activityTypeMap = new Map(activityTypes.map(at => [at.id, at.label]));
    
    const csvData = [];
    
    // Headers
    csvData.push([
      'Trip Name', 'Trip Description', 'Trip Start Date', 'Trip End Date', 'Trip Budget', 'Trip Currency',
      'Stage Name', 'Stage Country', 'Stage Start Date', 'Stage End Date', 'Stage Timezone',
      'Activity Name', 'Activity Type', 'Activity Start DateTime', 'Activity End DateTime', 'Activity City', 'Activity Cost',
      'Airline', 'Flight Number', 'Departure Airport', 'Arrival Airport', 'Seat', 'Gate', 'Terminal',
      'Hotel Address', 'Hotel Phone', 'Check-in Date', 'Check-out Date', 'Room Type', 'Confirmation Number',
      'Car Company', 'Pickup Location', 'Dropoff Location', 'Pickup Date', 'Dropoff Date', 'Car Type'
    ]);

    // Data rows
    for (const stage of stages) {
      // Fetch activities for this stage
      const activitiesResponse = await fetch(`http://localhost:8080/api/activities/stage/${stage.id}`, {
        credentials: 'include'
      });
      const activities = await activitiesResponse.json();
      
      if (activities.length > 0) {
        activities.forEach(activity => {
          csvData.push([
            trip.name || '',
            trip.description || '',
            trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '',
            trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '',
            trip.budget || '',
            trip.currency || '',
            stage.name || '',
            stage.Country?.name || '',
            stage.startDate ? new Date(stage.startDate).toLocaleDateString() : '',
            stage.endDate ? new Date(stage.endDate).toLocaleDateString() : '',
            stage.Country?.timezone || 'UTC',
            activity.name || '',
            activity.ActivityType?.label || activityTypeMap.get(activity.activityTypeId) || '',
            activity.startDateTime ? new Date(activity.startDateTime).toISOString() : '',
            activity.endDateTime ? new Date(activity.endDateTime).toISOString() : '',
            activity.city || '',
            activity.cost || '',
            activity.airline || '',
            activity.flightNumber || '',
            activity.departureAirport || '',
            activity.arrivalAirport || '',
            activity.seat || '',
            activity.gate || '',
            activity.terminal || '',
            activity.address || '',
            activity.phone || '',
            activity.checkInDate ? new Date(activity.checkInDate).toISOString() : '',
            activity.checkOutDate ? new Date(activity.checkOutDate).toISOString() : '',
            activity.roomType || '',
            activity.confirmationNumber || activity.confirmationCode || '',
            activity.company || '',
            activity.pickupLocation || '',
            activity.dropoffLocation || '',
            activity.pickupDate ? new Date(activity.pickupDate).toISOString().split('T')[0] : '',
            activity.dropoffDate ? new Date(activity.dropoffDate).toISOString().split('T')[0] : '',
            activity.carType || ''
          ]);
        });
      } else {
        csvData.push([
          trip.name || '',
          trip.description || '',
          trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '',
          trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '',
          trip.budget || '',
          trip.currency || '',
          stage.name || '',
          stage.Country?.name || '',
          stage.startDate ? new Date(stage.startDate).toLocaleDateString() : '',
          stage.endDate ? new Date(stage.endDate).toLocaleDateString() : '',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
        ]);
      }
    }

    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${trip.name.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    alert('Export failed');
  }
};

const TripActionsMenu: React.FC<TripActionsMenuProps> = ({
  anchorEl,
  open,
  onClose,
  selectedTrip,
  onEdit,
  onDelete
}) => {
  const { t } = useLanguage();
  
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem onClick={() => {
        if (selectedTrip) {
          onEdit(selectedTrip);
        }
        onClose();
      }}>
        {t('edit')}
      </MenuItem>
      <MenuItem onClick={() => {
        if (selectedTrip) {
          handleExportCSV(selectedTrip);
        }
        onClose();
      }}>
        {t('export_csv')}
      </MenuItem>
      <MenuItem onClick={() => {
        document.getElementById('csv-file-input')?.click();
        onClose();
      }}>
        {t('import_csv')}
      </MenuItem>
      <MenuItem onClick={() => {
        if (selectedTrip && window.confirm(t('delete_trip_confirm'))) {
          onDelete(selectedTrip.id);
        }
        onClose();
      }}>
        {t('delete')}
      </MenuItem>
    </Menu>
  );
};

export default TripActionsMenu;