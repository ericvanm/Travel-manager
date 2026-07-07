import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Trip } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { exportTripToCsv } from './tripCsvExport';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

interface TripActionsMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  selectedTrip: Trip | null;
  onEdit: (trip: Trip) => void;
  onDelete: (tripId: number) => void;
}

const TripActionsMenu: React.FC<TripActionsMenuProps> = ({
  anchorEl,
  open,
  onClose,
  selectedTrip,
  onEdit,
  onDelete
}) => {
  const { t } = useLanguage();

  const handleExport = async (trip: Trip) => {
    try {
      await exportTripToCsv(trip, API_BASE_URL);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

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
          handleExport(selectedTrip);
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
