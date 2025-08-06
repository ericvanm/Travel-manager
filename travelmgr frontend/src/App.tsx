import { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import { Button, Divider, Container, Typography } from '@mui/material';

import { apiBaseUrl } from "./constants";
import { Diagnosis, Patient } from "./types";

import patientService from "./services/patients";
import diagnosesService from "./services/diagnoses";

import PatientListPage from "./components/PatientListPage";
import PatientInfo from "./components/PatientInfo";

const App = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [diagnosisCodesList, setDiagnosisCodesList] = useState<Diagnosis[]>([]);

  

  useEffect(() => {
    void axios.get<void>(`${apiBaseUrl}/ping`);

    const fetchPatientList = async () => {
      const patients:Patient[] = await patientService.getAll();
      setPatients(patients);
    };
    void fetchPatientList();
    const fetchDiagnosisList = async () => {
      const diagnosisCodesList:Diagnosis[] = await diagnosesService.getAll();
      setDiagnosisCodesList(diagnosisCodesList);
    };
    void fetchDiagnosisList();
  }, []);

  
  
  return (
    <div className="App">
      <Router>
        <Container>
          <Typography variant="h3" style={{ marginBottom: "0.5em" }}>
            Patientor
          </Typography>
          <Button component={Link} to="/" variant="contained" color="primary">
            Home
          </Button>
          <Divider hidden />
          <Routes>
            <Route path="/" element={<PatientListPage patients={patients} setPatients={setPatients} />} />
            <Route path="/patients/:id" element={<PatientInfo patients={patients} setPatients={setPatients} diagnosisCodesList={diagnosisCodesList} />} />
          </Routes>
        </Container>
      </Router>
    </div>
  );
};

export default App;
