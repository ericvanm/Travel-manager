import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Activity, ActivityType, Stage, TimelineActivity, TimelineActivityStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatTime } from '../../utils/localeHelpers';
import { getAccommodationLocationLine, getTransportIdentificationLine, isTransportActivity } from '../../utils/activityDisplayHelpers';

const TIMELINE_STATUS_COLORS: Record<TimelineActivityStatus, string> = {
  starts: 'success.main',
  ends: 'error.main',
  continues: 'warning.main',
};

interface TimelineActivityRowProps {
  activity: TimelineActivity;
  index: number;
  activityTypes: ActivityType[];
  stages: Stage[];
  onEdit: (activity: Activity, stage: Stage) => void;
}

export const TimelineActivityRow: React.FC<TimelineActivityRowProps> = ({
  activity,
  index,
  activityTypes,
  stages,
  onEdit,
}) => {
  const { t, language } = useLanguage();
  const statusColor = TIMELINE_STATUS_COLORS[activity.status];
  const statusText = t(`timeline_status_${activity.status}`);
  const activityTypeLabel = activityTypes.find((type) => type.id === activity.activityTypeId)?.label || 'N/A';
  const accommodationLine = getAccommodationLocationLine(activity);
  const transportLine = getTransportIdentificationLine(activity);

  const handleClick = () => {
    const activityStage = stages.find((stage) => stage.id === activity.stageId);
    if (activityStage) {
      onEdit(activity, activityStage);
    }
  };

  return (
    <Box
      key={`${activity.id}-${index}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        py: 1,
        borderLeft: '3px solid',
        borderColor: statusColor,
        pl: 2,
        mb: 1,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)'
        }
      }}
      onClick={handleClick}
    >
      <Box sx={{ minWidth: 60, fontSize: '0.75rem', fontWeight: 'bold', color: statusColor }}>
        {statusText}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
          {activity.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {activityTypeLabel}
          {activity.city && !accommodationLine && ` • ${activity.city}`}
        </Typography>
        {accommodationLine && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            📍 {accommodationLine}
          </Typography>
        )}
        {transportLine && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            ✈ {transportLine}
          </Typography>
        )}
        {isTransportActivity(activity) && !transportLine && (activity.departureLocation || activity.arrivalLocation) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {activity.departureLocation || '—'} → {activity.arrivalLocation || '—'}
          </Typography>
        )}
        {activity.cost != null && Number(activity.cost) > 0 && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
            {t('cost')}: {activity.cost}
          </Typography>
        )}
        {activity.reservationStatus && (
          <Chip
            size="small"
            variant="outlined"
            color={activity.reservationStatus === 'reserved' ? 'success' : 'warning'}
            label={activity.reservationStatus === 'reserved' ? t('reservation_reserved') : t('reservation_to_book')}
            sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
          />
        )}
      </Box>
      {activity.status === 'starts' && activity.startDateTime && (
        <Typography variant="body2" color="text.secondary">
          {formatTime(activity.startDateTime, language)}
        </Typography>
      )}
      {activity.status === 'ends' && activity.endDateTime && (
        <Typography variant="body2" color="text.secondary">
          {formatTime(activity.endDateTime, language)}
        </Typography>
      )}
    </Box>
  );
};
