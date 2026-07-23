import React, { useState } from 'react';
import { Button, Menu, MenuItem, Tooltip } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';

interface ImportMenuProps {
  onICSImport: () => void;
  onCSVImport: () => void;
  onAIImport: () => void;
  onAIPlanning: () => void;
  aiEnabled?: boolean;
}

const ImportMenu: React.FC<ImportMenuProps> = ({
  onICSImport,
  onCSVImport,
  onAIImport,
  onAIPlanning,
  aiEnabled = true,
}) => {
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

  const handleAIPlanning = () => {
    onAIPlanning();
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
        <Tooltip title={!aiEnabled ? t('ai_features_disabled') : ''} placement="left">
          <span>
            <MenuItem disabled={!aiEnabled} onClick={aiEnabled ? handleAIImport : undefined}>
              {t('import_document_ai')}
            </MenuItem>
          </span>
        </Tooltip>
        <Tooltip title={!aiEnabled ? t('ai_features_disabled') : ''} placement="left">
          <span>
            <MenuItem disabled={!aiEnabled} onClick={aiEnabled ? handleAIPlanning : undefined}>
              {t('plan_trip_ai')}
            </MenuItem>
          </span>
        </Tooltip>
      </Menu>
    </>
  );
};

export default ImportMenu;