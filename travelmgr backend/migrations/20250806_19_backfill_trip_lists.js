const { tableExists } = require('../utils/migration-helpers')

module.exports = {
  up: async ({ context: queryInterface }) => {
    if (await tableExists(queryInterface, 'trip_planning_sessions')) {
      await queryInterface.sequelize.query(`
        INSERT INTO trip_lists (user_id, trip_id)
        SELECT DISTINCT tps.user_id, tps.trip_id
        FROM trip_planning_sessions tps
        WHERE tps.user_id IS NOT NULL
          AND tps.trip_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM trip_lists tl
            WHERE tl.user_id = tps.user_id AND tl.trip_id = tps.trip_id
          )
      `)
    }

    if (await tableExists(queryInterface, 'trip_adaptation_sessions')) {
      await queryInterface.sequelize.query(`
        INSERT INTO trip_lists (user_id, trip_id)
        SELECT DISTINCT tas.user_id, tas.trip_id
        FROM trip_adaptation_sessions tas
        WHERE tas.user_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM trip_lists tl
            WHERE tl.user_id = tas.user_id AND tl.trip_id = tas.trip_id
          )
      `)
    }
  },

  down: async () => {
    // Data backfill — no rollback
  }
}
