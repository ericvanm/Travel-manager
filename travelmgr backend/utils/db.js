const Sequelize = require('sequelize')
const config = require('../utils/config')
const logger = require('../utils/logger')

const { Umzug, SequelizeStorage } = require('umzug')
// eslint-disable-next-line no-undef
const url = config.DB_URI
const sslToUse = config.ENVIR === 'production' ? true : false

logger.info('connecting to database', config.DB_LOG_CONTEXT)

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

let connectionPromise = null

const connectToDatabase = () => {
  if (!connectionPromise) {
    connectionPromise = (async () => {
      try {
        await sequelize.authenticate()
        await runMigrations()
        console.log('connected to the database')
      } catch (err) {
        connectionPromise = null
        console.log('failed to connect to the database')
        console.log(err)
        if (config.ENVIR === 'test') {
          throw err
        }
        process.exit(1)
      }
    })()
  }

  return connectionPromise
}

module.exports = { connectToDatabase, sequelize, runMigrations }