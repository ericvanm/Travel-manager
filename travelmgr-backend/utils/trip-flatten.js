/** Flatten stage activities for validation (no DB dependency). */

const accommodationToActivity = (acc) => ({
  id: acc.id,
  stageId: acc.stageId,
  activityTypeId: 7,
  activityType: 'hotel',
  name: acc.name,
  city: acc.city,
  address: acc.addressLine || acc.address,
  checkInDate: acc.checkInDate,
  checkOutDate: acc.checkOutDate,
  startDateTime: acc.checkInDate,
  endDateTime: acc.checkOutDate,
  cost: acc.totalCost ?? acc.costPerNight,
  _fromAccommodationTable: true
})

const flattenActivities = (snapshot) =>
  snapshot.stages.flatMap((stage) => (stage.activities || []).map((a) => ({
    ...a,
    stageId: a.stageId ?? stage.id,
    stageName: stage.name
  })))

module.exports = {
  flattenActivities,
  accommodationToActivity
}
