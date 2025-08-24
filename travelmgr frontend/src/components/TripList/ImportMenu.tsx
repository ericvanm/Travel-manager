import React, { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';

interface ImportMenuProps {
  onICSImport: () => void;
  onCSVImport: () => void;
}

const ImportMenu: React.FC<ImportMenuProps> = ({ onICSImport, onCSVImport }) => {
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

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        endIcon={<KeyboardArrowDown />}
      >
        Create by Import
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={handleICSImport}>
          Import ICS File
        </MenuItem>
        <MenuItem onClick={handleCSVImport}>
          Import CSV File
        </MenuItem>
      </Menu>
    </>
  );
};

export default ImportMenu;