const Sequelize = require('sequelize')
const config = require('../utils/config')
const logger = require('../utils/logger')

const { Umzug, SequelizeStorage } = require('umzug')
// eslint-disable-next-line no-undef
const url = config.DB_URI
const sslToUse = config.ENVIR === 'production' ? true : false


logger.info('connecting to', url)

const sequelize = new Sequelize(url, {
  dialectOptions: sslToUse ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
});


const runMigrations = async () => {
  const migrator = new Umzug({
    migrations: {
      glob: 'migrations/*.js',
    },
    storage: new SequelizeStorage({ sequelize, tableName: 'migrations' }),
    context: sequelize.getQueryInterface(),
    logger: console,
  })
  
  const migrations = await migrator.up()
  console.log('Migrations up to date', {
    files: migrations.map((mig) => mig.name),
  })
}

const connectToDatabase = async () => {
  try {
    await sequelize.authenticate()

    await runMigrations()
    console.log('connected to the database')
  } catch (err) {
    console.log('failed to connect to the database')
    console.log(err)
    return process.exit(1)
  }

  return null
}

module.exports = { connectToDatabase, sequelize }