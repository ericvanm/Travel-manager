const { parseDateOnly, compareDateOnly } = require('./date-only')
const { buildAccommodationDateTimes } = require('./hotel-datetime')

const accommodationCoversNight = (day, accommodation) => {
  const checkIn = parseDateOnly(accommodation.checkInDate)
  const checkOut = parseDateOnly(accommodation.checkOutDate)
  if (!checkIn || !checkOut) return false
  return checkIn <= day && day < checkOut
}

const stripReturnDayAccommodations = (itinerary) => {
  const tripEnd = parseDateOnly(itinerary?.trip?.endDate)
  if (!tripEnd) return itinerary

  for (const stage of itinerary.stages || []) {
    stage.accommodations = (stage.accommodations || []).filter((acc) => {
      const checkIn = parseDateOnly(acc.checkInDate)
      if (!checkIn) return true
      return compareDateOnly(checkIn, tripEnd) < 0
    })
  }

  return itinerary
}

const normalizeAccommodationCheckoutDates = (itinerary) => {
  const tripEnd = parseDateOnly(itinerary?.trip?.endDate)
  if (!tripEnd) return itinerary

  const stages = itinerary.stages || []
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]
    const isLastStage = index === stages.length - 1
    const stageEnd = parseDateOnly(stage.endDate)

    for (const acc of stage.accommodations || []) {
      const checkOut = parseDateOnly(acc.checkOutDate)
      if (!checkOut) continue

      if (isLastStage && stageEnd && compareDateOnly(stageEnd, tripEnd) >= 0) {
        if (compareDateOnly(checkOut, tripEnd) > 0) {
          acc.checkOutDate = tripEnd
        }
      }
    }
  }

  return itinerary
}

const buildAccommodationComments = (accommodation, formData) => {
  const parts = []
  if (accommodation.comments) parts.push(accommodation.comments)
  if (accommodation.address) parts.push(`Adresse : ${accommodation.address}`)
  if (accommodation.phone) parts.push(`Tél. : ${accommodation.phone}`)
  const checkInTime = accommodation.checkInTime
  const checkOutTime = accommodation.checkOutTime
  if (checkInTime || checkOutTime) {
    parts.push(`Check-in ${checkInTime || '—'} / Check-out ${checkOutTime || '—'}`)
  }
  if (accommodation.estimatedCost != null && formData?.currency) {
    parts.push(`Prix estimé : ${accommodation.estimatedCost} ${formData.currency}`)
  }
  return parts.filter(Boolean).join(' — ') || `Type : ${accommodation.type || formData?.accommodationType || 'hôtel'}`
}

const normalizeAccommodationDetails = (itinerary, formData = null) => {
  for (const stage of itinerary.stages || []) {
    stage.accommodations = (stage.accommodations || []).map((acc) => {
      const next = { ...acc }
      const { startDateTime, endDateTime } = buildAccommodationDateTimes(next)
      next.startDateTime = startDateTime
      next.endDateTime = endDateTime
      next.comments = buildAccommodationComments(next, formData)
      if (next.address && !next.addressHint) {
        next.addressHint = next.address
      }
      return next
    })
  }
  return itinerary
}

module.exports = {
  accommodationCoversNight,
  stripReturnDayAccommodations,
  normalizeAccommodationCheckoutDates,
  normalizeAccommodationDetails,
  buildAccommodationComments
}