import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete
} from '@mui/material';
import { Country } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const { t } = useLanguage();
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingStage ? t('edit_stage') : t('add_new_stage')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={t('stage_name')}
          fullWidth
          variant="outlined"
          value={newStage.name}
          onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
        />
        <Autocomplete
          options={countries || []}
          getOptionLabel={(option) => option?.name || ''}
          value={selectedCountry}
          onChange={(_event, newValue) => {
            setSelectedCountry(newValue);
            setNewStage({ ...newStage, countryId: newValue ? newValue.id.toString() : '' });
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('country')}
              margin="dense"
              variant="outlined"
              fullWidth
            />
          )}
          loading={countriesLoading}
          noOptionsText={countriesLoading ? t('loading_countries') : t('no_countries_found')}
          filterOptions={(options, { inputValue }) =>
            options.filter((option) =>
              option?.name?.toLowerCase().includes(inputValue.toLowerCase())
            )
          }
        />
        <TextField
          margin="dense"
          label={t('start_date')}
          type="date"
          fullWidth
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={newStage.startDate}
          onChange={(e) => setNewStage({ ...newStage, startDate: e.target.value })}
        />
        <TextField
          margin="dense"
          label={t('end_date')}
          type="date"
          fullWidth
          variant="outlined"
          InputLabelProps={{ shrink: true }}
          value={newStage.endDate}
          onChange={(e) => setNewStage({ ...newStage, endDate: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={onSubmit}>
          {editingStage ? t('update_stage') : t('add_stage')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StageDialog;