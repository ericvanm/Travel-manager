import {  } from '@mui/material';

import { Entry } from "../../types";
import { assertNever } from "../../utils";
import HospitalEntry from './HospitalEntry';
import OccupationalHealthcareEntry from './OccupationalHealthcareEntry';
import HealthCheckEntry from './HealthCheckEntry';

interface Props {
    entry: Entry;
}


const EntryDetails = ({ entry }: Props) => {
 
    switch (entry.type) {
    case "Hospital":
        return (
            <HospitalEntry entry={entry} />
            );
    case "OccupationalHealthcare":
        return (
            <OccupationalHealthcareEntry entry={entry}/>
            );
    case "HealthCheck":
        return (
            <HealthCheckEntry entry={entry}/>
            );
    default:
        return assertNever(entry);
  }

};

export default EntryDetails;