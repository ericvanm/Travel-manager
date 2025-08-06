import { Box, Button, DialogContent, FormLabel, Grid, MenuItem, OutlinedInput, Select, TextField } from '@mui/material';

import { Diagnosis, EntryFormStrings, HealthCheckRating, TypeEnum } from "../../types";

import { SyntheticEvent, useState } from 'react';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';


interface Props {
    id: string;
    onCancel: () => void;
    onSubmit: (id: string, values: EntryFormStrings) => void;
    setError: (error: string) => void;
    diagnosisCodesList: Diagnosis[];
}


const AddNewEntry = ({ id, onCancel, onSubmit, setError, diagnosisCodesList }: Props) => {
    
    // form fields 
    const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());
    const [description, setDescription] = useState<string>("");
    const [specialist, setSpecialist] = useState<string>("");
    const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
    const [type, setType] = useState<string>("Hospital");
    const [dateDischarge, setDateDischarge] = useState<dayjs.Dayjs | null>(dayjs());
    const [criteriaDischarge, setCriteriaDischarge] = useState<string>("");
    const [healthCheckRating, setHealthCheckRating] = useState<string>("0");
    const [startDateSickLeave, setStartDateSickLeave] = useState<dayjs.Dayjs | null>(dayjs());
    const [endDateSickLeave, setEndDateSickLeave] = useState<dayjs.Dayjs | null>(dayjs());
    const [employerName, setEmployerName] = useState<string>("");



    const addPatientEntry = (event: SyntheticEvent) => {
     
        
       
        
        event.preventDefault();
        const newEntry: EntryFormStrings = {
            type,
            date: date?.format('YYYY-MM-DD') as string,
            description,
            specialist,
            diagnosisCodes,
            healthCheckRating,
            discharge: {
                date: dateDischarge?.format('YYYY-MM-DD') as string,
                criteria: criteriaDischarge
            },
            employerName,
            sickLeave: {
                startDate: startDateSickLeave?.format('YYYY-MM-DD') as string,
                endDate: endDateSickLeave?.format('YYYY-MM-DD') as string
            }
        };

        onSubmit(id, newEntry);
    };
    
    const cleanValues = (): void => {
        setDate(dayjs());
        setDescription("");
        setSpecialist("");
        setDiagnosisCodes([]);
        setDateDischarge(dayjs());
        setCriteriaDischarge("");
        setHealthCheckRating("");
        setStartDateSickLeave(dayjs());
        setEndDateSickLeave(dayjs());    
        
        setError("");
        onCancel();
    };

    const ITEM_HEIGHT = 48;
    const ITEM_PADDING_TOP = 8;
    

    const MenuProps = {
        PaperProps: {
          style: {
            maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
            width: 250,
          },
        },
      };

    return (
        <DialogContent>
            
            <div>
                <form onSubmit={addPatientEntry}>
                <Box
                    sx={{
                    border: "2px solid black",
                    borderRadius: 2,
                    padding: 2,
                    marginTop: 2,
                    backgroundColor: "white",
                    mb: 2
                    }}
                >
                    <Select
                    labelId="multiple-type-label"
                    id="multiple-type"
                    value={type}
                    onChange={({ target }) => setType(target.value)}
                    input={<OutlinedInput label="Type" />}
                    MenuProps={MenuProps}
                    >
                    {Object.values(TypeEnum).map((name) => (
                        <MenuItem
                        key={name}
                        value={name}
                        >
                        {name}
                        </MenuItem>
                    ))}
                </Select>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            label="Select a date"
                            value={date}
                            onChange={(newValue) => setDate(newValue)}
                            format="YYYY-MM-DD"
                            slotProps={{
                                textField: {
                                fullWidth: true
                                }
                            }}
                        />
                    </LocalizationProvider>
                    <TextField
                        label="Description"
                        fullWidth
                        value={description}
                        onChange={({ target }) => setDescription(target.value)}
                    />
                    <TextField
                        label="Specialist"
                        fullWidth
                        value={specialist}
                        onChange={({ target }) => setSpecialist(target.value)}
                        />
                        <Select
                    labelId="multiple-type-label"
                    id="multiple-type"
                    value={diagnosisCodes}
                    multiple
                    onChange={({ target }) => setDiagnosisCodes(target.value as string[])}
                    input={<OutlinedInput label="Diagnosis Codes" />}
                            MenuProps={MenuProps}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  {(selected as string[]).map((code) => (
                                    <span key={code}>{code}</span>
                                  ))}
                                </Box>
                              )}
                    >
                    {diagnosisCodesList.map((diag) => (
                        <MenuItem
                        key={diag.code}
                        value={diag.code}
                        >
                        {diag.code} : {diag.name}
                        </MenuItem>
                    ))}
                </Select>
                        {(type === "Hospital") ? 
                            <>
                            <FormLabel component="legend">Discharge</FormLabel>
                                <Box sx={{ pl: 4 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Select a date"
                                    value={dateDischarge}
                                    onChange={(newValue) => setDateDischarge(newValue)}
                                    format="YYYY-MM-DD"
                                    slotProps={{
                                        textField: {
                                        fullWidth: true
                                        }
                            }}
                                />
                                </LocalizationProvider>
                
                                <TextField
                                label="Criteria"
                                fullWidth
                                value={criteriaDischarge}
                                onChange={({ target }) => setCriteriaDischarge(target.value)}
                                />
                                </Box></>
                : <div/> 
                        }
                        {(type === "HealthCheck") ? 
                           
                           <Select
                           labelId="multiple-type-label"
                           id="multiple-type"
                           value={Number(healthCheckRating)}
                           onChange={({ target }) => setHealthCheckRating(String(target.value))}
                           input={<OutlinedInput label="Healthcheck Rating" />}
                           MenuProps={MenuProps}
                           >
                           {Object.values(HealthCheckRating).filter((v) => typeof v === "number").map((value) => (
                               <MenuItem
                               key={value}
                               value={value}
                               >
                               {HealthCheckRating[Number(value)]}
                               </MenuItem>
                           ))}
                       </Select>
                            
                                
                : <div/> 
                        }
                        {(type === "OccupationalHealthcare") ? 
                            <>
                            <TextField
                            label="Employer Name"
                            fullWidth
                            value={employerName}
                            onChange={({ target }) => setEmployerName(target.value)}
                            />
                            <FormLabel component="legend">Sick Leave</FormLabel>
                                <Box sx={{ pl: 4 }}>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    label="Select a start date - sick leave"
                                    value={startDateSickLeave}
                                    onChange={(newValue) => setStartDateSickLeave(newValue)}
                                    format="YYYY-MM-DD"
                                    slotProps={{
                                        textField: {
                                        fullWidth: true
                                        }
                                    }}
                                        />
                                <DatePicker
                                    label="Select a end date - sick leave"
                                    value={endDateSickLeave}
                                    onChange={(newValue) => setEndDateSickLeave(newValue)}
                                    format="YYYY-MM-DD"
                                    slotProps={{
                                        textField: {
                                        fullWidth: true
                                        }
                                    }}
                                        />     
                                </LocalizationProvider>
                                
                                
                                </Box></>
                : <div/> 
                        }
                        
                    <Grid container justifyContent="space-between" sx={{ mt:2 }}>
                       
                            <Button
                                color="secondary"
                                variant="contained"
                                style={{ float: "left" }}
                                type="button"
                                onClick={cleanValues}
                            >
                                Cancel
                            </Button>
                        
                            <Button
                                style={{
                                    float: "right",
                                }}
                                type="submit"
                                variant="contained"
                            >
                                Add
                            </Button>
                        
                        </Grid>
                        </Box>
                </form>
            </div>
        </DialogContent>
    );
};

export default AddNewEntry;