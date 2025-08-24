import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Trip } from '../../types';

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
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem onClick={() => {
        if (selectedTrip) {
          onEdit(selectedTrip);
        }
        onClose();
      }}>
        Edit
      </MenuItem>
      <MenuItem onClick={() => {
        if (selectedTrip && window.confirm('Are you sure you want to delete this trip?')) {
          onDelete(selectedTrip.id);
        }
        onClose();
      }}>
        Delete
      </MenuItem>
    </Menu>
  );
};

export default TripActionsMenu;