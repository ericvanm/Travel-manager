import React from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Activity, ActivityType, Stage, TimelineActivity, TimelineActivityStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatTime } from '../../utils/localeHelpers';
import { getActivityStageTimezone } from '../../utils/tripTimezoneHelpers';
import { getAccommodationLocationLine, getTransportIdentificationLine, getTransportIconPrefix, isTransportActivity } from '../../utils/activityDisplayHelpers';

const TIMELINE_STATUS_COLORS: Record<TimelineActivityStatus, string> = {
  starts: 'success.main',
  ends: 'error.main',
  continues: 'warning.main',
  starts_ends: 'success.main',
};

interface TimelineActivityRowProps {
  activity: TimelineActivity;
  index: number;
  activityTypes: ActivityType[];
  stages: Stage[];
  onEdit?: (activity: Activity, stage: Stage) => void;
  onDelete?: (activityId: number) => void;
}

export const TimelineActivityRow: React.FC<TimelineActivityRowProps> = ({
  activity,
  index,
  activityTypes,
  stages,
  onEdit,
  onDelete,
}) => {
  const { t, language } = useLanguage();
  const statusColor = TIMELINE_STATUS_COLORS[activity.status];
  const statusText = t(`timeline_status_${activity.status}`);
  const activityTypeLabel = activityTypes.find((type) => type.id === activity.activityTypeId)?.label || 'N/A';
  const accommodationLine = getAccommodationLocationLine(activity);
  const transportLine = getTransportIdentificationLine(activity);
  const transportIcon = getTransportIconPrefix(activity);
  const timeZone = activity.stage?.timezone || getActivityStageTimezone(activity.stageId, stages);

  const handleClick = () => {
    if (!onEdit) return;
    const activityStage = stages.find((stage) => stage.id === activity.stageId);
    if (activityStage) {
      onEdit(activity, activityStage);
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onDelete) {
      onDelete(activity.id);
    }
  };

  const renderTime = () => {
    if (activity.status === 'starts' && activity.startDateTime) {
      return formatTime(activity.startDateTime, language, timeZone);
    }
    if (activity.status === 'ends' && activity.endDateTime) {
      return formatTime(activity.endDateTime, language, timeZone);
    }
    if (activity.status === 'starts_ends' && activity.startDateTime && activity.endDateTime) {
      return `${formatTime(activity.startDateTime, language, timeZone)} – ${formatTime(activity.endDateTime, language, timeZone)}`;
    }
    return null;
  };

  const timeLabel = renderTime();

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
        cursor: onEdit ? 'pointer' : 'default',
        '&:hover': onEdit ? {
          backgroundColor: 'rgba(0, 0, 0, 0.04)'
        } : undefined
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
            {transportIcon ? `${transportIcon} ` : ''}{transportLine}
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
      {timeLabel && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {timeLabel}
        </Typography>
      )}
      {onDelete && (
        <IconButton
          size="small"
          color="error"
          aria-label={t('delete')}
          onClick={handleDelete}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};
