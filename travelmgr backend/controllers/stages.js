const router = require('express').Router()
const { Stage, Country, Activity, Transport, Accommodation, ActivityType } = require('../models/DBmodels')

// GET all stages for a trip
router.get('/trip/:tripId', async (req, res) => {
  try {
    const stages = await Stage.findAll({
      where: { tripId: req.params.tripId },
      include: [
        { model: Country, as: 'Country' },
        { 
          model: Activity,
          include: [{ model: ActivityType }]
        },
        { model: Transport },
        { model: Accommodation }
      ],
      order: [
        ['startDate', 'ASC NULLS LAST'],
        [Activity, 'startDateTime', 'ASC NULLS LAST']
      ]
    })
    res.json(stages)
  } catch (error) {
    console.error('Error fetching stages:', error)
    res.status(500).json({ error: 'Failed to fetch stages' })
  }
})

// GET single stage
router.get('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByPk(req.params.id, {
      include: [
        { model: Country, as: 'Country' },
        { 
          model: Activity,
          include: [{ model: ActivityType }]
        },
        { model: Transport },
        { model: Accommodation }
      ],
      order: [
        [Activity, 'startDateTime', 'ASC NULLS LAST']
      ]
    })
    if (stage) {
      res.json(stage)
    } else {
      res.status(404).json({ error: 'Stage not found' })
    }
  } catch (error) {
    console.error('Error fetching stage:', error)
    res.status(500).json({ error: 'Failed to fetch stage' })
  }
})

// POST new stage
router.post('/', async (req, res) => {
  try {
    const stage = await Stage.create(req.body)
    res.json(stage)
  } catch (error) {
    console.error('Error creating stage:', error)
    res.status(500).json({ error: 'Failed to create stage' })
  }
})

// PUT update stage
router.put('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByPk(req.params.id)
    if (stage) {
      await stage.update(req.body)
      res.json(stage)
    } else {
      res.status(404).json({ error: 'Stage not found' })
    }
  } catch (error) {
    console.error('Error updating stage:', error)
    res.status(500).json({ error: 'Failed to update stage' })
  }
})

// DELETE stage
router.delete('/:id', async (req, res) => {
  try {
    const stage = await Stage.findByPk(req.params.id)
    if (!stage) {
      return res.status(404).json({ error: 'Stage not found' })
    }

    // Count activities to inform user
    const activities = await Activity.findAll({ where: { stageId: req.params.id } })
    const activityCount = activities.length

    // Delete all activities of this stage
    await Activity.destroy({ where: { stageId: req.params.id } })

    // Delete the stage
    await stage.destroy()

    const message = `Étape "${stage.name || 'Sans nom'}" supprimée avec succès. ${activityCount} activité(s) ont également été supprimées.`
    
    res.json({ message })
  } catch (error) {
    console.error('Error deleting stage:', error)
    res.status(500).json({ error: 'Failed to delete stage' })
  }
})

// POST merge stages
router.post('/merge', async (req, res) => {
  try {
    const { stageIds, newName } = req.body
    
    if (!stageIds || stageIds.length < 2) {
      return res.status(400).json({ error: 'Au moins 2 étapes sont requises pour la fusion' })
    }
    
    if (!newName?.trim()) {
      return res.status(400).json({ error: 'Le nom de la nouvelle étape est requis' })
    }

    // Get all stages to merge
    const stages = await Stage.findAll({
      where: { id: stageIds },
      order: [['startDate', 'ASC NULLS LAST']]
    })

    if (stages.length !== stageIds.length) {
      return res.status(404).json({ error: 'Une ou plusieurs étapes introuvables' })
    }

    // Verify all stages belong to the same trip
    const tripId = stages[0].tripId
    if (!stages.every(stage => stage.tripId === tripId)) {
      return res.status(400).json({ error: 'Toutes les étapes doivent appartenir au même voyage' })
    }

    // Verify stages are consecutive by date
    const allTripStages = await Stage.findAll({
      where: { tripId },
      order: [['startDate', 'ASC NULLS LAST']]
    })
    
    const stagePositions = stageIds.map(id => 
      allTripStages.findIndex(stage => stage.id === id)
    ).sort((a, b) => a - b)
    
    for (let i = 1; i < stagePositions.length; i++) {
      if (stagePositions[i] !== stagePositions[i-1] + 1) {
        return res.status(400).json({ error: 'Les étapes doivent être consécutives' })
      }
    }

    // Calculate merged stage dates and country
    const startDate = stages.reduce((earliest, stage) => {
      if (!stage.startDate) return earliest
      if (!earliest) return stage.startDate
      return new Date(stage.startDate) < new Date(earliest) ? stage.startDate : earliest
    }, null)
    
    const endDate = stages.reduce((latest, stage) => {
      if (!stage.endDate) return latest
      if (!latest) return stage.endDate
      return new Date(stage.endDate) > new Date(latest) ? stage.endDate : latest
    }, null)

    // Use the country of the first stage
    const countryId = stages[0].countryId

    // Create the merged stage
    const mergedStage = await Stage.create({
      name: newName.trim(),
      tripId,
      countryId,
      startDate,
      endDate
    })

    // Move all activities to the merged stage and sort them chronologically
    let totalActivities = 0

    for (const stage of stages) {
      const activities = await Activity.findAll({ where: { stageId: stage.id } })
      totalActivities += activities.length
    }

    await Activity.update(
      { stageId: mergedStage.id },
      { where: { stageId: stages.map(s => s.id) } }
    )

    // Delete the original stages
    await Stage.destroy({ where: { id: stageIds } })

    const stageNames = stages.map(s => s.name || 'Sans nom').join(', ')
    const message = `Étapes "${stageNames}" fusionnées avec succès en "${newName}". ${totalActivities} activité(s) ont été transférées.`
    
    res.json({ message, mergedStage })
  } catch (error) {
    console.error('Error merging stages:', error)
    res.status(500).json({ error: 'Failed to merge stages' })
  }
})

module.exports = router