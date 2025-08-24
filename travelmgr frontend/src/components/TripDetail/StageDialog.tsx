import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete
} from '@mui/material';
import { Country } from '../../types';

interface StageDialogProps {
  open: boolean;
  onClose: () => void;
  editingStage: any;
  newStage: {
    name: string;
    countryId: string;
    startDate: string;
    endDate: string;
  };
  setNewStage: (stage: any) => void;
  selectedCountry: Country | null;
  setSelectedCountry: (country: Country | null) => void;
  countries: Country[];
  countriesLoading: boolean;
  onSubmit: () => void;
}

const StageDialog: React.FC<StageDialogProps> = ({
  open,
  onClose,
  editingStage,
  newStage,
  setNewStage,
  selectedCountry,
  setSelectedCountry,
  countries,
  countriesLoading,
  onSubmit
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingStage ? 'Edit Stage' : 'Add New Stage'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Stage Name"
          fullWidth
          variant="outlined"
          value={newStage.name}
          onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
        />
        <Autocomplete
          options={countries || []}
          getOptionLabel={(option) => option?.name || ''}
          value={selectedCountry}
          onChange={(event, newValue) => {
            setSelectedCountry(newValue);
            setNewStage({ ...newStage, countryId: newValue ? newValue.id.toString() : '' });
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Country"
              margin="dense"
              variant="outlined"
              fullWidth
            />
          )}
          loading={countriesLoading}
          noOptionsText={countriesLoading ? "Loading countries..." : "No countries found"}
          filterOptions={(options, { inputValue }) =>
            options.filter((option) =>
              option?.name?.toLowerCase().includes(inputValue.toLowerCase())
            )
          }
        />
        <TextField
          margin="dense"
          label="Start Date"
          type="date"
          fullWidth
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={newStage.startDate}
          onChange={(e) => setNewStage({ ...newStage, startDate: e.target.value })}
        />
        <TextField
          margin="dense"
          label="End Date"
          type="date"
          fullWidth
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={newStage.endDate}
          onChange={(e) => setNewStage({ ...newStage, endDate: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSubmit}>
          {editingStage ? 'Update Stage' : 'Add Stage'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StageDialog;