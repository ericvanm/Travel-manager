export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  name: string;
  password: string;
  email?: string;
}

export interface Trip {
  id: number;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  stages?: Stage[];
}

export interface Stage {
  id: number;
  tripId: number;
  countryId: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  activities?: Activity[];
}

export interface Activity {
  id: number;
  stageId: number;
  activityTypeId: number;
  name?: string;
  bookingCode?: string;
  startDateTime?: string;
  endDateTime?: string;
  addressLine?: string;
  city?: string;
  country?: string;
  comments?: string;
  notes?: string;
  cost?: number;
}

export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface ActivityType {
  id: number;
  label: string;
}