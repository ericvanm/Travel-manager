import api from './auth';
import { Trip, Stage, Activity, Country, ActivityType } from '../types';

export const getTrips = async (): Promise<Trip[]> => {
  const response = await api.get('/trips');
  return response.data;
};

export const getTrip = async (id: number): Promise<Trip> => {
  const response = await api.get(`/trips/${id}`);
  return response.data;
};

export const createTrip = async (trip: Omit<Trip, 'id'>): Promise<Trip> => {
  const response = await api.post('/trips', trip);
  return response.data;
};

export const updateTrip = async (id: number, trip: Partial<Trip>): Promise<Trip> => {
  const response = await api.put(`/trips/${id}`, trip);
  return response.data;
};

export const deleteTrip = async (id: number): Promise<void> => {
  await api.delete(`/trips/${id}`);
};

export const getCountries = async (lang = 'en'): Promise<Country[]> => {
  const response = await api.get(`/countries?lang=${lang}`);
  return response.data;
};

export const getActivityTypes = async (): Promise<ActivityType[]> => {
  const response = await api.get('/activity-types');
  return response.data;
};

export const getStagesByTrip = async (tripId: number): Promise<Stage[]> => {
  const response = await api.get(`/stages/trip/${tripId}`);
  return response.data;
};

export const createStage = async (stage: Omit<Stage, 'id'>): Promise<Stage> => {
  const response = await api.post('/stages', stage);
  return response.data;
};

export const updateStage = async (id: number, stage: Partial<Stage>): Promise<Stage> => {
  const response = await api.put(`/stages/${id}`, stage);
  return response.data;
};

export const deleteStage = async (id: number): Promise<void> => {
  await api.delete(`/stages/${id}`);
};

export const createActivity = async (activity: Omit<Activity, 'id'>): Promise<Activity> => {
  const response = await api.post('/activities', activity);
  return response.data;
};

export const updateActivity = async (id: number, activity: Partial<Activity>): Promise<Activity> => {
  const response = await api.put(`/activities/${id}`, activity);
  return response.data;
};

export const deleteActivity = async (id: number): Promise<void> => {
  await api.delete(`/activities/${id}`);
};

export const mergeStages = async (stageIds: number[], newName: string): Promise<{ message: string; mergedStage: Stage }> => {
  const response = await api.post('/stages/merge', { stageIds, newName });
  return response.data;
};