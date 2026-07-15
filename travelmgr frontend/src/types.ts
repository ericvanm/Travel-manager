export interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  language?: string;
  defaultDepartureLocation?: string | null;
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
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  currency?: string | null;
  departureLocation?: string | null;
  stages?: Stage[];
}

export type ReservationStatus = 'to_reserve' | 'reserved';

export interface Stage {
  id: number;
  tripId: number;
  countryId: number;
  name?: string;
  startDate?: string | null;
  endDate?: string | null;
  activities?: Activity[];
  Country?: Country;
}

export interface Activity {
  id: number;
  stageId: number;
  activityTypeId: number;
  name?: string;
  bookingCode?: string;
  startDateTime?: string | null;
  endDateTime?: string | null;
  addressLine?: string;
  city?: string | null;
  country?: string;
  comments?: string;
  notes?: string;
  cost?: number | null;
  groupId?: string;
  isGroupMaster?: boolean;
  address?: string | null;
  phone?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  confirmationNumber?: string | null;
  airline?: string | null;
  flightNumber?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  seat?: string | null;
  confirmationCode?: string | null;
  gate?: string | null;
  terminal?: string | null;
  roomType?: string | null;
  company?: string | null;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  pickupDate?: string | null;
  dropoffDate?: string | null;
  carType?: string | null;
  reservationStatus?: ReservationStatus;
  bookingUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  departureLocation?: string | null;
  arrivalLocation?: string | null;
  transportLine?: string | null;
  transportChanges?: number | null;
}

export type ActivityInput = Omit<Activity, 'id'>;

export interface ActivityFormState {
  name: string;
  activityTypeId: string;
  startDateTime: string;
  endDateTime: string;
  city: string;
  cost: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  seat: string;
  confirmationCode: string;
  gate: string;
  terminal: string;
  address: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime: string;
  checkOutTime: string;
  confirmationNumber: string;
  roomType: string;
  company: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  carType: string;
  reservationStatus: ReservationStatus;
  bookingUrl: string;
  departureLocation: string;
  arrivalLocation: string;
  transportLine: string;
  transportChanges: string;
}

export interface TripMapPoint {
  lat: number;
  lng: number;
  label: string;
  type: 'departure' | 'stage' | 'activity' | 'accommodation' | 'transport';
  estimatedCost?: number | null;
  transportMode?: string;
  reservationStatus?: ReservationStatus;
}

export interface TripMapRouteSegment {
  from: TripMapPoint;
  to: TripMapPoint;
  transportMode?: string;
  estimatedCost?: number | null;
  label?: string;
  isLocal?: boolean;
}

export interface TripMapData {
  departureLocation?: string | null;
  currency: string;
  mapPoints: TripMapPoint[];
  routeSegments: TripMapRouteSegment[];
}

export type MapFocusMode = 'trip' | 'global';

export const emptyActivityForm = (): ActivityFormState => ({
  name: '',
  activityTypeId: '',
  startDateTime: '',
  endDateTime: '',
  city: '',
  cost: '',
  airline: '',
  flightNumber: '',
  departureAirport: '',
  arrivalAirport: '',
  seat: '',
  confirmationCode: '',
  gate: '',
  terminal: '',
  address: '',
  phone: '',
  checkInDate: '',
  checkOutDate: '',
  checkInTime: '',
  checkOutTime: '',
  confirmationNumber: '',
  roomType: '',
  company: '',
  pickupLocation: '',
  dropoffLocation: '',
  pickupDate: '',
  dropoffDate: '',
  carType: '',
  reservationStatus: 'to_reserve',
  bookingUrl: '',
  departureLocation: '',
  arrivalLocation: '',
  transportLine: '',
  transportChanges: '',
});

export interface Country {
  id: number;
  name: string;
  code: string;
  timezone?: string;
}

export interface ActivityType {
  id: number;
  label: string;
}

export type TimelineActivityStatus = 'starts' | 'ends' | 'continues';

export interface TimelineStageRef {
  id: number;
  name?: string;
}

export interface TimelineActivity extends Activity {
  status: TimelineActivityStatus;
  stage?: TimelineStageRef;
}

export interface TimelineDay {
  date: string;
  stage?: TimelineStageRef;
  activities: TimelineActivity[];
}

export interface DuplicateActivity {
  id: number;
  name?: string;
  type: string;
  stage: string;
  startDateTime?: string | null;
  endDateTime?: string | null;
}

export interface DuplicateAnalysis {
  duplicates: DuplicateActivity[];
  count: number;
}
