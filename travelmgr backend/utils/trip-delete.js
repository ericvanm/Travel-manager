const { Op } = require('sequelize')
const { sequelize } = require('./db')
const {
  Trip,
  Stage,
  Activity,
  Transport,
  Accommodation,
  Expense,
  TripList,
  TripAdaptationSession
} = require('../models/DBmodels')

/**
 * Deletes a trip and all dependent records inside a transaction.
 * @returns {Promise<{ trip: import('../models/DBmodels').Trip, stageCount: number, totalActivities: number } | null>}
 */
const deleteTripById = async (tripId) => {
  return sequelize.transaction(async (transaction) => {
    const trip = await Trip.findByPk(tripId, { transaction })
    if (!trip) return null

    const stages = await Stage.findAll({ where: { tripId }, transaction })
    const stageIds = stages.map((stage) => stage.id)

    let totalActivities = 0
    if (stageIds.length > 0) {
      totalActivities = await Activity.count({
        where: { stageId: { [Op.in]: stageIds } },
        transaction
      })

      await Activity.destroy({ where: { stageId: { [Op.in]: stageIds } }, transaction })
      await Transport.destroy({ where: { stageId: { [Op.in]: stageIds } }, transaction })
      await Accommodation.destroy({ where: { stageId: { [Op.in]: stageIds } }, transaction })
      // flights, lodging and car_rentals are removed via ON DELETE CASCADE on stages
      await Stage.destroy({ where: { tripId }, transaction })
    }

    await Expense.destroy({ where: { tripId }, transaction })
    await TripAdaptationSession.destroy({ where: { tripId }, transaction })
    await TripList.destroy({ where: { tripId }, transaction })

    await trip.destroy({ transaction })

    return { trip, stageCount: stages.length, totalActivities }
  })
}

module.exports = { deleteTripById }
