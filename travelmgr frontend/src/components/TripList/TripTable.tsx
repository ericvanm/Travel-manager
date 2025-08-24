import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { Trip } from '../../types';

interface TripTableProps {
  trips: Trip[];
  onTripSelect: (trip: Trip) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, trip: Trip) => void;
}

const TripTable: React.FC<TripTableProps> = ({ trips, onTripSelect, onMenuClick }) => {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Name</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Description</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>Start Date</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>End Date</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip) => (
            <tr key={trip.id} style={{ cursor: 'pointer' }} onClick={() => onTripSelect(trip)}>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {trip.name}
                </Typography>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <Typography variant="body2" color="text.secondary">
                  {trip.description || 'No description'}
                </Typography>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <Typography variant="body2">
                  {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '-'}
                </Typography>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <Typography variant="body2">
                  {trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '-'}
                </Typography>
              </td>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    onMenuClick(e, trip);
                  }}
                >
                  <MoreVert />
                </IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default TripTable;