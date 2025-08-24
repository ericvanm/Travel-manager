const { sequelize } = require('./utils/db');
const migration = require('./migrations/20250108_add_flight_fields_to_activities');

async function runMigration() {
  try {
    console.log('Running migration: add flight fields to activities...');
    await migration.up(sequelize.getQueryInterface());
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();