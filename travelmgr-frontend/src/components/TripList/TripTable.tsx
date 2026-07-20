import React from 'react';
import { Box, Typography } from '@mui/material';
import { Trip } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import TripActionsToolbar from '../shared/TripActionsToolbar';
import TripConsistencyIndicator from '../shared/TripConsistencyIndicator';
import { TripConsistencySummary } from '../../services/tripConsistency';

interface TripTableProps {
  trips: Trip[];
  consistencyByTripId?: Record<number, TripConsistencySummary>;
  onTripSelect: (trip: Trip) => void;
  onEdit: (trip: Trip) => void;
  onExport: (trip: Trip) => void;
  onImportCsv: (trip: Trip) => void;
  onDelete: (tripId: number) => void;
  onAdaptAi: (trip: Trip) => void;
}

const TripTable: React.FC<TripTableProps> = ({
  trips,
  consistencyByTripId = {},
  onTripSelect,
  onEdit,
  onExport,
  onImportCsv,
  onDelete,
  onAdaptAi,
}) => {
  const { t } = useLanguage();

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('name')}</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('description')}</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('start_date')}</th>
            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>{t('end_date')}</th>
            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>{t('trip_consistency_title')}</th>
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
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                <TripConsistencyIndicator summary={consistencyByTripId[trip.id]} />
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                <Box onClick={stop}>
                  <TripActionsToolbar
                    onEdit={() => onEdit(trip)}
                    onExport={() => onExport(trip)}
                    onImportCsv={() => onImportCsv(trip)}
                    onAdaptAi={() => onAdaptAi(trip)}
                    onDelete={() => {
                      if (window.confirm(t('delete_trip_confirm', { name: trip.name }))) onDelete(trip.id);
                    }}
                  />
                </Box>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
};

export default TripTable;
