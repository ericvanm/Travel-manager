import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { MoreVert } from '@mui/icons-material';
import { Trip } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface TripTableProps {
  trips: Trip[];
  onTripSelect: (trip: Trip) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, trip: Trip) => void;
}

const TripTable: React.FC<TripTableProps> = ({ trips, onTripSelect, onMenuClick }) => {
  const { t } = useLanguage();
  
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('name')}</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('description')}</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('start_date')}</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('end_date')}</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{t('actions')}</th>
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
                  {trip.description || t('no_description')}
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