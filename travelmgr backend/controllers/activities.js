const router = require('express').Router()
const { Activity, ActivityType, Stage, Trip, Country } = require('../models/DBmodels')
const { v4: uuidv4 } = require('uuid')
const { Op } = require('sequelize')
const { buildTripTimeline } = require('../utils/trip-timeline')
const {
  applyHotelDateSync,
  haveDatesChanged,
  resetGroupedActivity,
  updateGroupedActivities
} = require('../utils/activity-update-helpers')
const logger = require('../utils/logger')
const { sanitizeBookingUrl } = require('../utils/booking-urls')

const normalizeIncomingBookingUrl = (data) => {
  if (!data?.bookingUrl) return data
  const sanitized = sanitizeBookingUrl(
    data.bookingUrl,
    { name: data.name, city: data.city, activityTypeId: data.activityTypeId },
    null,
    'activity'
  )
  return { ...data, bookingUrl: sanitized || null }
}

// GET all activities for a stage
router.get('/stage/:stageId', async (req, res) => {
  try {
    const activities = await Activity.findAll({
      where: { stageId: req.params.stageId },
      include: [{ model: ActivityType }]
    })
    res.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    res.status(500).json({ error: 'Failed to fetch activities' })
  }
})

// POST reserve activity (mark as reserved with optional booking URL)
router.post('/:id/reserve', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id)
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    const updates = {
      reservationStatus: req.body.reservationStatus || 'reserved'
    }
    if (req.body.bookingUrl !== undefined) {
      updates.bookingUrl = normalizeIncomingBookingUrl({
        bookingUrl: req.body.bookingUrl,
        name: activity.name,
        city: activity.city,
        activityTypeId: activity.activityTypeId
      }).bookingUrl
    }
    if (req.body.confirmationNumber !== undefined) {
      updates.confirmationNumber = req.body.confirmationNumber
    }

    await activity.update(updates)
    res.json(activity)
  } catch (error) {
    console.error('Error reserving activity:', error)
    res.status(500).json({ error: 'Failed to update reservation' })
  }
})

// GET single activity
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id, {
      include: [{ model: ActivityType }]
    })
    if (activity) {
      res.json(activity)
    } else {
      res.status(404).json({ error: 'Activity not found' })
    }
  } catch (error) {
    console.error('Error fetching activity:', error)
    res.status(500).json({ error: 'Failed to fetch activity' })
  }
})

// Helper function to check if activity spans multiple dates
const checkContinuousActivity = async (stageId, startDateTime, endDateTime) => {
  if (!startDateTime || !endDateTime) return { isContinuous: false, stages: [] }
  
  const stage = await Stage.findByPk(stageId)
  if (!stage) return { isContinuous: false, stages: [] }
  
  const activityStart = new Date(startDateTime)
  const activityEnd = new Date(endDateTime)
  
  // Check if activity spans multiple days (more than 24 hours)
  const durationHours = (activityEnd - activityStart) / (1000 * 60 * 60)
  const spansMultipleDays = durationHours > 24
  
  if (!spansMultipleDays) {
    return { isContinuous: false, stages: [] }
  }
  
  // Get all stages for the trip to distribute the activity
  const tripStages = await Stage.findAll({
    where: { tripId: stage.tripId },
    order: [['startDate', 'ASC']]
  })
  
  // Find stages that overlap with the activity period
  const coveredStages = tripStages.filter(s => {
    if (!s.startDate || !s.endDate) return false
    const stageStart = new Date(s.startDate)
    const stageEnd = new Date(s.endDate)
    return (activityStart <= stageEnd && activityEnd >= stageStart)
  })
  
  return {
    isContinuous: coveredStages.length > 0,
    stages: coveredStages.length > 0 ? coveredStages : [stage]
  }
}

// POST new activity
router.post('/', async (req, res) => {
  try {
    logger.info('Creating activity')
    
    let activityData = normalizeIncomingBookingUrl({ ...req.body })

    // For hotel activities (activityTypeId = 7), initialize start/end dates with checkIn/checkOut dates
    if (req.body.activityTypeId === 7) {
      if (req.body.checkInDate) {
        activityData.startDateTime = req.body.checkInDate
      }
      if (req.body.checkOutDate) {
        activityData.endDateTime = req.body.checkOutDate
      }
    }

    // Check if this is a continuous activity
    const { isContinuous, stages } = await checkContinuousActivity(
      activityData.stageId, 
      activityData.startDateTime, 
      activityData.endDateTime
    )

    if (isContinuous) {
      const groupId = uuidv4()
      const activities = []
      
      for (let i = 0; i < stages.length; i++) {
        const stageActivity = {
          ...activityData,
          stageId: stages[i].id,
          groupId,
          isGroupMaster: i === 0
        }
        const activity = await Activity.create(stageActivity)
        activities.push(activity)
      }
      
      res.json(activities)
    } else {
      const activity = await Activity.create(activityData)
      res.json(activity)
    }
  } catch (error) {
    console.error('Error creating activity:', error)
    console.error('Error details:', error.message)
    res.status(500).json({ error: 'Failed to create activity', details: error.message })
  }
})

// PUT update activity
router.put('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id, {
      include: [{ model: ActivityType }]
    })
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    const updateData = normalizeIncomingBookingUrl(applyHotelDateSync({ ...req.body }, req.body, activity))

    if (activity.groupId && haveDatesChanged(activity, updateData)) {
      const updated = await resetGroupedActivity(Activity, activity, updateData)
      return res.json(updated)
    }

    if (activity.groupId) {
      const groupActivities = await updateGroupedActivities(Activity, activity, updateData)
      return res.json(groupActivities)
    }

    await activity.update(updateData)
    return res.json([activity])
  } catch (error) {
    console.error('Error updating activity:', error)
    res.status(500).json({ error: 'Failed to update activity' })
  }
})

// DELETE activity
router.delete('/:id', async (req, res) => {
  try {
    const activity = await Activity.findByPk(req.params.id)
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' })
    }

    // If this is part of a continuous activity group, delete all activities in the group
    if (activity.groupId) {
      await Activity.destroy({
        where: { groupId: activity.groupId }
      })
    } else {
      await activity.destroy()
    }
    
    res.status(204).end()
  } catch (error) {
    console.error('Error deleting activity:', error)
    res.status(500).json({ error: 'Failed to delete activity' })
  }
})

// GET analyze duplicates for a trip
router.get('/analyze-duplicates/:tripId', async (req, res) => {
  try {
    const tripId = Number.parseInt(req.params.tripId, 10)
    
    // Get all stages for the trip
    const stages = await Stage.findAll({
      where: { tripId },
      order: [['startDate', 'ASC']]
    })
    
    if (stages.length === 0) {
      return res.json({ duplicates: [], count: 0 })
    }
    
    // Get all activities for these stages
    const stageIds = stages.map(s => s.id)
    const activities = await Activity.findAll({
      where: { stageId: { [Op.in]: stageIds } },
      include: [{ model: ActivityType }]
    })
    
    // Identify duplicates
    const processedActivities = new Map()
    const duplicates = []
    
    for (const activity of activities) {
      // Key without stageId to detect true duplicates across stages
      const key = `${activity.name || 'unnamed'}-${activity.activityTypeId}-${activity.startDateTime || 'no-start'}-${activity.endDateTime || 'no-end'}-${activity.address || ''}-${activity.confirmationNumber || ''}`
      
      if (processedActivities.has(key)) {
        duplicates.push({
          id: activity.id,
          name: activity.name,
          type: activity.ActivityType?.label || 'N/A',
          stage: stages.find(s => s.id === activity.stageId)?.name || 'N/A',
          startDateTime: activity.startDateTime,
          endDateTime: activity.endDateTime
        })
      } else {
        processedActivities.set(key, activity)
      }
    }
    
    res.json({ duplicates, count: duplicates.length })
  } catch (error) {
    console.error('Error analyzing duplicates:', error)
    res.status(500).json({ error: 'Failed to analyze duplicates' })
  }
})

// POST structure trip - apply continuous activities
router.post('/structure-trip/:tripId', async (req, res) => {
  try {
    const tripId = Number.parseInt(req.params.tripId, 10)
    // Get all stages for the trip
    const stages = await Stage.findAll({
      where: { tripId },
      order: [['startDate', 'ASC']]
    })
    
    if (stages.length === 0) {
      return res.json({ message: '0 activities structured across multiple stages' })
    }
    
    // Get all activities for these stages
    const stageIds = stages.map(s => s.id)
    const allActivities = await Activity.findAll({
      where: { stageId: { [Op.in]: stageIds } }
    })
    let structuredCount = 0
    let duplicatesRemoved = 0

    const processedActivities = new Map()
    const duplicatesToRemove = []

    for (const activity of allActivities) {
      const key = `${activity.name || 'unnamed'}-${activity.activityTypeId}-${activity.startDateTime || 'no-start'}-${activity.endDateTime || 'no-end'}-${activity.address || ''}-${activity.confirmationNumber || ''}`

      if (processedActivities.has(key)) {
        duplicatesToRemove.push(activity.id)
      } else {
        processedActivities.set(key, activity)
      }
    }

    if (duplicatesToRemove.length > 0) {
      await Activity.destroy({
        where: { id: { [Op.in]: duplicatesToRemove } }
      })
      duplicatesRemoved = duplicatesToRemove.length
      logger.infoWithCounts('Removed duplicate activities', duplicatesRemoved)
    }
    
    const duplicateSuffix = duplicatesRemoved > 0 ? `, ${duplicatesRemoved} duplicates removed` : ''
    const message = `${structuredCount} activities structured across multiple stages${duplicateSuffix}`
    res.json({ message })
  } catch (error) {
    console.error('Error structuring trip:', error)
    res.status(500).json({ error: 'Failed to structure trip', details: error.message })
  }
})

// GET trip timeline - activities organized by date
router.get('/timeline/:tripId', async (req, res) => {
  try {
    const tripId = Number.parseInt(req.params.tripId, 10)
    
    // Get all stages for the trip
    const stages = await Stage.findAll({
      where: { tripId },
      include: [{ model: Country, as: 'Country' }],
      order: [['startDate', 'ASC']]
    })
    
    if (stages.length === 0) {
      return res.json([])
    }
    
    // Get all activities for these stages
    const stageIds = stages.map(s => s.id)
    const activities = await Activity.findAll({
      where: { stageId: { [Op.in]: stageIds } },
      include: [{ model: ActivityType }]
    })
    
    const timeline = buildTripTimeline(
      stages.map((s) => s.toJSON()),
      activities.map((a) => a.toJSON())
    )

    res.json(timeline)
  } catch (error) {
    console.error('Error fetching timeline:', error)
    res.status(500).json({ error: 'Failed to fetch timeline' })
  }
})

module.exports = router