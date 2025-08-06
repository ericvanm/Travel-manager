import { Box, Typography } from '@mui/material';

import { Entry } from "../../types";
import { LocalHospital } from '@mui/icons-material';
import { getIconForDiagnosisCode } from '../../utils';



interface Props {
    entry: Entry;
}


const HospitalEntry = ({ entry }: Props) => {
 
  
  return (
    <Box
    sx={{
      border: '2px solid black',
      borderRadius: 2,
      padding: 2,
        marginTop: 2,
        lineHeight: 1.2,
      }}
    >
      <Typography>{entry.date} <LocalHospital/></Typography>
      <Typography>{entry.description}</Typography>
      {entry.diagnosisCodes?.map((code) => { if (!code) return null;
        const Icon: React.ElementType | null = getIconForDiagnosisCode(code);
        return (
          <div key={code}>
            {(Icon ? <Icon/> : <div/> )}
            <Typography variant="body2">{code}</Typography>
          </div>
        );
      })}
      <Typography>diagnose by {entry.specialist}</Typography>
    </Box>
  );

};

export default HospitalEntry;