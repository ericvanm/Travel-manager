import React, { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

interface ImportMenuProps {
  onICSImport: () => void;
  onCSVImport: () => void;
  onAIImport: () => void;
}

const ImportMenu: React.FC<ImportMenuProps> = ({ onICSImport, onCSVImport, onAIImport }) => {
  const { t } = useLanguage();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleICSImport = () => {
    onICSImport();
    handleClose();
  };

  const handleCSVImport = () => {
    onCSVImport();
    handleClose();
  };

  const handleAIImport = () => {
    onAIImport();
    handleClose();
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        endIcon={<KeyboardArrowDown />}
      >
        {t('create_by_import')}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={handleICSImport}>
          {t('import_ics_file')}
        </MenuItem>
        <MenuItem onClick={handleCSVImport}>
          {t('import_csv_file')}
        </MenuItem>
        <MenuItem onClick={handleAIImport}>
          {t('import_document_ai')}
        </MenuItem>
      </Menu>
    </>
  );
};

export default ImportMenu;