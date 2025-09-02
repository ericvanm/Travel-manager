import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, FormControl, InputLabel, Select, MenuItem, Typography, Box
} from '@mui/material';
import { Stage } from '../../types';

interface MergeStagesDialogProps {
  open: boolean;
  onClose: () => void;
  selectedStages: Stage[];
  onMerge: (newName: string) => void;
}

const MergeStagesDialog: React.FC<MergeStagesDialogProps> = ({
  open,
  onClose,
  selectedStages,
  onMerge
}) => {
  const [nameOption, setNameOption] = useState<'existing' | 'new'>('existing');
  const [selectedName, setSelectedName] = useState('');
  const [customName, setCustomName] = useState('');

  const handleSubmit = () => {
    const finalName = nameOption === 'existing' ? selectedName : customName.trim();
    if (finalName) {
      onMerge(finalName);
      setNameOption('existing');
      setSelectedName('');
      setCustomName('');
    }
  };

  const handleClose = () => {
    onClose();
    setNameOption('existing');
    setSelectedName('');
    setCustomName('');
  };

  const stageNames = selectedStages.map(stage => stage.name || `Stage ${stage.id}`);
  const isValid = nameOption === 'existing' ? selectedName : customName.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Fusionner les étapes</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Vous allez fusionner {selectedStages.length} étapes consécutives :
        </Typography>
        <Box sx={{ mb: 3, pl: 2 }}>
          {stageNames.map((name, index) => (
            <Typography key={index} variant="body2">
              • {name}
            </Typography>
          ))}
        </Box>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Nom de la nouvelle étape</InputLabel>
          <Select
            value={nameOption}
            onChange={(e) => setNameOption(e.target.value as 'existing' | 'new')}
            label="Nom de la nouvelle étape"
          >
            <MenuItem value="existing">Choisir un nom existant</MenuItem>
            <MenuItem value="new">Créer un nouveau nom</MenuItem>
          </Select>
        </FormControl>

        {nameOption === 'existing' ? (
          <FormControl fullWidth>
            <InputLabel>Sélectionner un nom</InputLabel>
            <Select
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              label="Sélectionner un nom"
            >
              {stageNames.map((name, index) => (
                <MenuItem key={index} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <TextField
            fullWidth
            label="Nouveau nom"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Entrez le nom de la nouvelle étape"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained"
          disabled={!isValid}
        >
          Fusionner
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MergeStagesDialog;