import React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box,
  FormControl, InputLabel, Select, MenuItem, Chip, Link, Typography
} from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { ActivityType, ReservationStatus, Stage } from '../../types'
import { useLanguage } from '../../contexts/LanguageContext'
import { combineDateAndTime, getDatePart, getTimePart } from '../../utils/dateTimeInputHelpers'
import { ACTIVITY_TYPE, isGroundTransportActivityType, isPrivateCarActivityType } from '../../utils/activityTypes'

interface ActivityDialogProps {
  open: boolean
  onClose: () => void
  editingActivity: any
  selectedStage: Stage | null
  newActivity: any
  setNewActivity: (activity: any) => void
  activityTypes: ActivityType[]
  onSubmit: () => void
  onReserve?: () => void
}

const ActivityDialog: React.FC<ActivityDialogProps> = ({
  open,
  onClose,
  editingActivity,
  selectedStage,
  newActivity,
  setNewActivity,
  activityTypes,
  onSubmit,
  onReserve
}) => {
  const { t } = useLanguage()
  const activityType = activityTypes.find(at => at.id.toString() === newActivity.activityTypeId)?.label || ''
  const reservationStatus: ReservationStatus = newActivity.reservationStatus || 'to_reserve'
  const typeId = Number.parseInt(newActivity.activityTypeId, 10)
  const isGroundTransport = isGroundTransportActivityType(typeId)
  const isCarRental = typeId === ACTIVITY_TYPE.CAR_RENTAL
  const isPrivateCar = isPrivateCarActivityType(typeId)
  const showGenericDates = typeId !== ACTIVITY_TYPE.HOTEL

  const handleOpenBookingSite = () => {
    if (newActivity.bookingUrl) {
      window.open(newActivity.bookingUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleMarkReserved = () => {
    setNewActivity({ ...newActivity, reservationStatus: 'reserved' })
    if (onReserve) onReserve()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingActivity ? t('edit_activity', { type: activityType }) : t('add_activity_to_stage', { type: activityType, stage: selectedStage?.name })}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, mt: 1 }}>
          <Chip
            size="small"
            color={reservationStatus === 'reserved' ? 'success' : 'warning'}
            label={reservationStatus === 'reserved' ? t('reservation_reserved') : t('reservation_to_book')}
          />
        </Box>

        <FormControl fullWidth margin="dense" variant="outlined">
          <InputLabel>{t('reservation_status')}</InputLabel>
          <Select
            label={t('reservation_status')}
            value={reservationStatus}
            onChange={(e) => setNewActivity({ ...newActivity, reservationStatus: e.target.value })}
          >
            <MenuItem value="to_reserve">{t('reservation_to_book')}</MenuItem>
            <MenuItem value="reserved">{t('reservation_reserved')}</MenuItem>
          </Select>
        </FormControl>

        <TextField
          margin="dense"
          label={t('booking_url')}
          fullWidth
          variant="outlined"
          value={newActivity.bookingUrl || ''}
          onChange={(e) => setNewActivity({ ...newActivity, bookingUrl: e.target.value })}
          helperText={t('booking_url_help')}
        />

        {newActivity.bookingUrl && (
          <Box sx={{ mb: 1 }}>
            <Link href={newActivity.bookingUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              {t('open_booking_site')}
              <OpenInNewIcon fontSize="small" />
            </Link>
          </Box>
        )}

        <TextField
          autoFocus
          margin="dense"
          label={t('activity_name')}
          fullWidth
          variant="outlined"
          value={newActivity.name}
          onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
        />
        
        {newActivity.activityTypeId === '6' && (
          <>
            <TextField 
              margin="dense" 
              label={t('airline')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.airline}
              onChange={(e) => setNewActivity({ ...newActivity, airline: e.target.value })}
            />
            <TextField 
              margin="dense" 
              label={t('flight_number')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.flightNumber}
              onChange={(e) => setNewActivity({ ...newActivity, flightNumber: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label={t('departure_airport')} 
                variant="outlined" 
                sx={{ flex: 1 }}
                value={newActivity.departureAirport}
                onChange={(e) => setNewActivity({ ...newActivity, departureAirport: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label={t('arrival_airport')} 
                variant="outlined" 
                sx={{ flex: 1 }}
                value={newActivity.arrivalAirport}
                onChange={(e) => setNewActivity({ ...newActivity, arrivalAirport: e.target.value })}
              />
            </Box>
          </>
        )}
        
        {isCarRental && (
          <>
            <TextField
              margin="dense"
              label={t('rental_company')}
              fullWidth
              variant="outlined"
              value={newActivity.company}
              onChange={(e) => setNewActivity({ ...newActivity, company: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('pickup_location')}
                variant="outlined"
                sx={{ flex: 1 }}
                value={newActivity.pickupLocation}
                onChange={(e) => setNewActivity({ ...newActivity, pickupLocation: e.target.value })}
              />
              <TextField
                margin="dense"
                label={t('dropoff_location')}
                variant="outlined"
                sx={{ flex: 1 }}
                value={newActivity.dropoffLocation}
                onChange={(e) => setNewActivity({ ...newActivity, dropoffLocation: e.target.value })}
              />
            </Box>
            <TextField
              margin="dense"
              label={t('car_type')}
              fullWidth
              variant="outlined"
              value={newActivity.carType}
              onChange={(e) => setNewActivity({ ...newActivity, carType: e.target.value })}
            />
          </>
        )}

        {isPrivateCar && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('departure_location')}
                variant="outlined"
                sx={{ flex: 1 }}
                value={newActivity.departureLocation}
                onChange={(e) => setNewActivity({ ...newActivity, departureLocation: e.target.value })}
              />
              <TextField
                margin="dense"
                label={t('arrival_location')}
                variant="outlined"
                sx={{ flex: 1 }}
                value={newActivity.arrivalLocation}
                onChange={(e) => setNewActivity({ ...newActivity, arrivalLocation: e.target.value })}
              />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              {t('private_car_cost_hint')}
            </Typography>
          </>
        )}

        {isGroundTransport && (
          <>
            <TextField
              margin="dense"
              label={t('transport_operator')}
              fullWidth
              variant="outlined"
              value={newActivity.company}
              onChange={(e) => setNewActivity({ ...newActivity, company: e.target.value })}
            />
            <TextField
              margin="dense"
              label={t('transport_line')}
              fullWidth
              variant="outlined"
              value={newActivity.transportLine}
              onChange={(e) => setNewActivity({ ...newActivity, transportLine: e.target.value })}
              helperText={t('transport_line_help')}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('departure_station')}
                variant="outlined"
                sx={{ flex: 1 }}
                value={newActivity.departureLocation}
                onChange={(e) => setNewActivity({ ...newActivity, departureLocation: e.target.value })}
              />
              <TextField
                margin="dense"
                label={t('arrival_station')}
                variant="outlined"
                sx={{ flex: 1 }}
                value={newActivity.arrivalLocation}
                onChange={(e) => setNewActivity({ ...newActivity, arrivalLocation: e.target.value })}
              />
            </Box>
            <TextField
              margin="dense"
              label={t('transport_changes')}
              type="number"
              fullWidth
              variant="outlined"
              inputProps={{ min: 0 }}
              value={newActivity.transportChanges}
              onChange={(e) => setNewActivity({ ...newActivity, transportChanges: e.target.value })}
              helperText={t('transport_changes_help')}
            />
          </>
        )}

        {newActivity.activityTypeId === '7' && (
          <>
            <TextField 
              margin="dense" 
              label={t('address')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.address}
              onChange={(e) => setNewActivity({ ...newActivity, address: e.target.value })}
            />
            <TextField 
              margin="dense" 
              label={t('phone')} 
              fullWidth 
              variant="outlined" 
              value={newActivity.phone}
              onChange={(e) => setNewActivity({ ...newActivity, phone: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label={t('check_in_date')} 
                type="date" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                value={newActivity.checkInDate}
                onChange={(e) => setNewActivity({ ...newActivity, checkInDate: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label={t('check_in_time')} 
                type="time" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ width: 120 }}
                value={newActivity.checkInTime || '15:00'}
                onChange={(e) => setNewActivity({ ...newActivity, checkInTime: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField 
                margin="dense" 
                label={t('check_out_date')} 
                type="date" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
                value={newActivity.checkOutDate}
                onChange={(e) => setNewActivity({ ...newActivity, checkOutDate: e.target.value })}
              />
              <TextField 
                margin="dense" 
                label={t('check_out_time')} 
                type="time" 
                variant="outlined" 
                InputLabelProps={{ shrink: true }}
                sx={{ width: 120 }}
                value={newActivity.checkOutTime || '11:00'}
                onChange={(e) => setNewActivity({ ...newActivity, checkOutTime: e.target.value })}
              />
            </Box>
          </>
        )}
        
        <TextField
          margin="dense"
          label={t('city')}
          fullWidth
          variant="outlined"
          value={newActivity.city}
          onChange={(e) => setNewActivity({ ...newActivity, city: e.target.value })}
        />
        <TextField
          margin="dense"
          label={t('cost')}
          type="number"
          fullWidth
          variant="outlined"
          value={newActivity.cost}
          onChange={(e) => setNewActivity({ ...newActivity, cost: e.target.value })}
        />
        <TextField
          margin="dense"
          label={t('confirmation')}
          fullWidth
          variant="outlined"
          value={newActivity.confirmationNumber || ''}
          onChange={(e) => setNewActivity({ ...newActivity, confirmationNumber: e.target.value })}
        />
        
        {showGenericDates && (
          <>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('start_date')}
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getDatePart(newActivity.startDateTime)}
                onChange={(e) => {
                  const time = getTimePart(newActivity.startDateTime, '09:00');
                  setNewActivity({ ...newActivity, startDateTime: combineDateAndTime(e.target.value, time) });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                margin="dense"
                label={t('start_time')}
                type="time"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getTimePart(newActivity.startDateTime, '09:00')}
                onChange={(e) => {
                  const date = getDatePart(newActivity.startDateTime);
                  setNewActivity({ ...newActivity, startDateTime: combineDateAndTime(date, e.target.value) });
                }}
                sx={{ width: 120 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                margin="dense"
                label={t('end_date')}
                type="date"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getDatePart(newActivity.endDateTime)}
                onChange={(e) => {
                  const time = getTimePart(newActivity.endDateTime, '18:00');
                  setNewActivity({ ...newActivity, endDateTime: combineDateAndTime(e.target.value, time) });
                }}
                sx={{ flex: 1 }}
              />
              <TextField
                margin="dense"
                label={t('end_time')}
                type="time"
                variant="outlined"
                InputLabelProps={{ shrink: true }}
                value={getTimePart(newActivity.endDateTime, '18:00')}
                onChange={(e) => {
                  const date = getDatePart(newActivity.endDateTime);
                  setNewActivity({ ...newActivity, endDateTime: combineDateAndTime(date, e.target.value) });
                }}
                sx={{ width: 120 }}
              />
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
        {newActivity.bookingUrl && (
          <Button onClick={handleOpenBookingSite} startIcon={<OpenInNewIcon />}>
            {t('reserve_action')}
          </Button>
        )}
        {reservationStatus === 'to_reserve' && (
          <Button onClick={handleMarkReserved} color="success" variant="outlined">
            {t('mark_as_reserved')}
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={onSubmit} variant="contained">
          {editingActivity ? t('update_activity') : t('add_activity')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ActivityDialog;
