import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { supportedLanguages } from '../translations';

const LanguageSelector: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
      <ToggleButtonGroup
        value={language}
        exclusive
        onChange={(_, val) => val && setLanguage(val)}
        size="small"
      >
        {supportedLanguages.map((lang) => (
          <ToggleButton key={lang.code} value={lang.code} sx={{ px: 1.5, py: 0.5, fontSize: '0.75rem' }}>
            {lang.code.toUpperCase()}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default LanguageSelector;
