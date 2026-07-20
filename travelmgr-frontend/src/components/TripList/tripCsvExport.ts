import { Trip, Stage, Activity, ActivityType } from '../../types';

const CSV_HEADERS = [
  'Trip Name', 'Trip Description', 'Trip Start Date', 'Trip End Date', 'Trip Budget', 'Trip Currency',
  'Stage Name', 'Stage Country', 'Stage Start Date', 'Stage End Date', 'Stage Timezone',
  'Activity Name', 'Activity Type', 'Activity Start DateTime', 'Activity End DateTime', 'Activity City', 'Activity Cost',
  'Airline', 'Flight Number', 'Departure Airport', 'Arrival Airport', 'Seat', 'Gate', 'Terminal',
  'Hotel Address', 'Hotel Phone', 'Check-in Date', 'Check-out Date', 'Room Type', 'Confirmation Number',
  'Car Company', 'Pickup Location', 'Dropoff Location', 'Pickup Date', 'Dropoff Date', 'Car Type'
];

const emptyActivityColumns = () => Array(24).fill('');

const toCsvCell = (value: string | number | null | undefined) => String(value ?? '');

const formatTripColumns = (trip: Trip) => [
  toCsvCell(trip.name),
  toCsvCell(trip.description),
  trip.startDate ? new Date(trip.startDate).toLocaleDateString() : '',
  trip.endDate ? new Date(trip.endDate).toLocaleDateString() : '',
  toCsvCell(trip.budget),
  toCsvCell(trip.currency)
];

const formatStageColumns = (stage: Stage) => [
  stage.name || '',
  stage.Country?.name || '',
  stage.startDate ? new Date(stage.startDate).toLocaleDateString() : '',
  stage.endDate ? new Date(stage.endDate).toLocaleDateString() : '',
  stage.Country?.timezone || 'UTC'
];

const formatActivityColumns = (activity: Activity, activityTypeMap: Map<number, string>) => [
  toCsvCell(activity.name),
  toCsvCell(activityTypeMap.get(activity.activityTypeId)),
  activity.startDateTime ? new Date(activity.startDateTime).toISOString() : '',
  activity.endDateTime ? new Date(activity.endDateTime).toISOString() : '',
  toCsvCell(activity.city),
  toCsvCell(activity.cost),
  toCsvCell(activity.airline),
  toCsvCell(activity.flightNumber),
  toCsvCell(activity.departureAirport),
  toCsvCell(activity.arrivalAirport),
  toCsvCell(activity.seat),
  toCsvCell(activity.gate),
  toCsvCell(activity.terminal),
  toCsvCell(activity.address),
  toCsvCell(activity.phone),
  activity.checkInDate ? new Date(activity.checkInDate).toISOString() : '',
  activity.checkOutDate ? new Date(activity.checkOutDate).toISOString() : '',
  toCsvCell(activity.roomType),
  toCsvCell(activity.confirmationNumber || activity.confirmationCode),
  toCsvCell(activity.company),
  toCsvCell(activity.pickupLocation),
  toCsvCell(activity.dropoffLocation),
  activity.pickupDate ? new Date(activity.pickupDate).toISOString().split('T')[0] : '',
  activity.dropoffDate ? new Date(activity.dropoffDate).toISOString().split('T')[0] : '',
  toCsvCell(activity.carType)
];

const buildCsvRows = (trip: Trip, stages: Stage[], activityTypeMap: Map<number, string>) => {
  const rows: string[][] = [CSV_HEADERS];

  for (const stage of stages) {
    if (stage.activities && stage.activities.length > 0) {
      stage.activities.forEach((activity) => {
        rows.push([
          ...formatTripColumns(trip),
          ...formatStageColumns(stage),
          ...formatActivityColumns(activity, activityTypeMap)
        ]);
      });
      continue;
    }

    rows.push([...formatTripColumns(trip), ...formatStageColumns(stage), ...emptyActivityColumns()]);
  }

  return rows;
};

const downloadCsv = (trip: Trip, rows: string[][]) => {
  const csvContent = rows
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${trip.name.replace(/[^a-z0-9]/gi, '_')}_export.csv`;
  link.click();
};

export const exportTripToCsv = async (trip: Trip, apiBaseUrl: string) => {
  const stagesResponse = await fetch(`${apiBaseUrl}/stages/trip/${trip.id}`, { credentials: 'include' });
  const stages: Stage[] = await stagesResponse.json();

  const activityTypesResponse = await fetch(`${apiBaseUrl}/activity-types`, { credentials: 'include' });
  const activityTypes: ActivityType[] = await activityTypesResponse.json();
  const activityTypeMap = new Map(activityTypes.map((type) => [type.id, type.label]));

  downloadCsv(trip, buildCsvRows(trip, stages, activityTypeMap));
};
