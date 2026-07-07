const HOTEL_ACTIVITY_TYPE_ID = 7

const applyHotelDateSync = (updateData, body, activity) => {
  if (activity.activityTypeId !== HOTEL_ACTIVITY_TYPE_ID && body.activityTypeId !== HOTEL_ACTIVITY_TYPE_ID) {
    return updateData
  }

  const synced = { ...updateData }
  if (body.checkInDate) {
    synced.startDateTime = body.checkInDate
  }
  if (body.checkOutDate) {
    synced.endDateTime = body.checkOutDate
  }
  return synced
}

const haveDatesChanged = (activity, updateData) => (
  (updateData.startDateTime && updateData.startDateTime !== activity.startDateTime)
  || (updateData.endDateTime && updateData.endDateTime !== activity.endDateTime)
)

const extractCommonGroupFields = (updateData) => {
  const commonFields = {}
  const fieldNames = [
    'name', 'address', 'phone', 'confirmationNumber', 'cost',
    'checkInTime', 'checkOutTime', 'company', 'carType', 'pickupDate', 'dropoffDate'
  ]

  fieldNames.forEach((field) => {
    if (updateData[field] !== undefined) {
      commonFields[field] = updateData[field]
    }
  })

  return commonFields
}

const resetGroupedActivity = async (Activity, activity, updateData) => {
  await Activity.destroy({
    where: {
      groupId: activity.groupId,
      isGroupMaster: false
    }
  })

  await activity.update({
    ...updateData,
    groupId: null,
    isGroupMaster: null
  })

  return [activity]
}

const updateGroupedActivities = async (Activity, activity, updateData) => {
  const groupActivities = await Activity.findAll({
    where: { groupId: activity.groupId }
  })

  const commonFields = extractCommonGroupFields(updateData)
  for (const groupActivity of groupActivities) {
    await groupActivity.update(commonFields)
  }

  return groupActivities
}

module.exports = {
  applyHotelDateSync,
  haveDatesChanged,
  resetGroupedActivity,
  updateGroupedActivities
}
