import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Activity, ActivityType, Stage, TimelineActivity, TimelineActivityStatus } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

const TIMELINE_STATUS_COLORS: Record<TimelineActivityStatus, string> = {
  starts: 'success.main',
  ends: 'error.main',
  continues: 'warning.main',
};

const TIMELINE_STATUS_LABELS: Record<TimelineActivityStatus, string> = {
  starts: 'Début',
  ends: 'Fin',
  continues: 'En cours',
};

interface TimelineActivityRowProps {
  activity: TimelineActivity;
  index: number;
  activityTypes: ActivityType[];
  stages: Stage[];
  onEdit: (activity: Activity, stage: Stage) => void;
}

const formatActivityTime = (dateTime: string) =>
  new Date(dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const TimelineActivityRow: React.FC<TimelineActivityRowProps> = ({
  activity,
  index,
  activityTypes,
  stages,
  onEdit,
}) => {
  const { t } = useLanguage();
  const statusColor = TIMELINE_STATUS_COLORS[activity.status];
  const statusText = TIMELINE_STATUS_LABELS[activity.status];
  const activityTypeLabel = activityTypes.find((type) => type.id === activity.activityTypeId)?.label || 'N/A';

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
          {activity.city && ` • ${activity.city}`}
        </Typography>
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
          {formatActivityTime(activity.startDateTime)}
        </Typography>
      )}
      {activity.status === 'ends' && activity.endDateTime && (
        <Typography variant="body2" color="text.secondary">
          {formatActivityTime(activity.endDateTime)}
        </Typography>
      )}
    </Box>
  );
};
