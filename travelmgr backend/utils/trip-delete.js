/**
 * Transactional trip deletion.
 *
 * Why not rely on DB CASCADE alone:
 * - Some FKs (trip_lists, trip_adaptation_sessions, expenses) block `trips` deletion.
 * - Without a transaction, deleting stages first could leave an empty trip row if destroy fails.
 *
 * Stage-linked travel rows (flights, lodging, car_rentals) cascade when stages are removed.
 */
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
 * Deletes a trip and all blocking dependents in a single transaction.
 *
 * @param {number|string} tripId
 * @returns {Promise<{ trip: import('../models/DBmodels').Trip, stageCount: number, totalActivities: number } | null>}
 *   Deletion stats, or null when the trip id does not exist.
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
