export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  firstName?: string;
  lastName?: string;
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
  firstName?: string;
  lastName?: string;
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
  // Continuous activity fields
  groupId?: string;
  isGroupMaster?: boolean;
  // Hotel specific fields
  address?: string;
  phone?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  confirmationNumber?: string;
  // Flight specific fields
  airline?: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
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