import {Alert, Typography } from '@mui/material';
import { Diagnosis, EntryFormStrings, EntryFormValues, Patient } from "../../types";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import patientService from "../../services/patients";

import MaleIcon from '@mui/icons-material/Male';
import FemaleIcon from '@mui/icons-material/Female';
import OtherIcon from '@mui/icons-material/Transgender';
import EntryDetails from './EntryDetails';
import AddNewEntry from './AddNewEntry';
import axios from 'axios';
import { parseHealthCheckRating } from '../../utils';
import z from 'zod';

type PatientInfoProps = {
  patients: Patient[];
  setPatients: React.Dispatch<React.SetStateAction<Patient[]>>;
  diagnosisCodesList: Diagnosis[];
};

const PatientInfo = ({  patients, setPatients, diagnosisCodesList }: PatientInfoProps) => {
  const [error, setError] = useState<string>("");
    const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient>();

  useEffect(() => {
    if (!id) return;

    const fetchPatient = async () => {
      const fetchedPatient = await patientService.getEntry(id);
      setPatient(fetchedPatient);
    };

    void fetchPatient();
  }, [id]);

    if (!patient) return <div>Loading Patient...</div>;
  console.log(patient);

  const addNewEntry = async (id: string, values: EntryFormStrings) => {
    try {
      const arrayDiagnosisCodes: Array<string> = values.diagnosisCodes; // add the trim() to remove needless spaces
      const parsedHealthCheckRating = parseHealthCheckRating(values.healthCheckRating);
      const parsedType = values.type as EntryFormValues["type"];
      const parsedValues: EntryFormValues = {
        ...values,
        diagnosisCodes: arrayDiagnosisCodes,
        healthCheckRating: parsedHealthCheckRating,
        type: parsedType
      };
      const updatedPatient = await patientService.addEntry(id, parsedValues);
      console.log("updated patient", patient);
      setPatient(updatedPatient);
      setPatients(patients.map((p) => (p.id === updatedPatient.id ? updatedPatient : p)));
      setError("");
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        if (e?.response?.data && typeof e?.response?.data === "string") {
          const message:string = e.response.data.replace('Something went wrong. Error: ', '');
          console.error(message);
          setError(message);
        } else if (e?.response?.data && typeof e?.response?.data?.error[0]?.message === "string") {
          const message:string = "Request error: <" + e.response.data.error[0].message + ">";
          console.error(message);
          setError(message);
        } else {
          console.error("Unrecognized axios error", e.response);
          setError("Unrecognized axios error");
        }
      } else if (e instanceof z.ZodError) {
        console.log("error - Zod", e.errors[0].message);
        setError(e.errors[0].message);
        
      } else {
        console.error("Unknown error", e);
        setError("Unknown error");
      }
    }
  };

  const cancelAddNewEntry = () => {
    setError("");
  };

    return (
      <>
        <Typography variant="h4">{patient?.name} {patient.gender === "male" && <MaleIcon />}{patient.gender === "female" && <FemaleIcon />}{patient.gender !== "male" && patient.gender !== "female" && <OtherIcon />}</Typography>
        <Typography>ssn : {patient?.ssn}</Typography>
        <Typography>occupation : {patient?.occupation}</Typography>
        <br/>
        <Typography variant="h5">entries</Typography>
        <br />
        {error && <Alert severity="error">{error}</Alert>}
        <AddNewEntry id={patient.id} onSubmit={addNewEntry} onCancel={cancelAddNewEntry} setError={setError} diagnosisCodesList={diagnosisCodesList} />
        {patient?.entries?.map((entry) => (
          <EntryDetails key={entry.id} entry={entry} />
        ))}
          
        </>
    );
};

export default PatientInfo;