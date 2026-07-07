const app = require('./app') // the actual Express application
const config = require('./utils/config')
const logger = require('./utils/logger')
logger.info('Starting App')
app.listen(config.PORT, '0.0.0.0', () => {
  logger.infoWithCounts('Server running on port', Number(config.PORT))
})