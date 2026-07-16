const express = require('express')
const app = express()
app.disable('x-powered-by')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const cors = require('cors')
const usersRouter = require('./controllers/users')
const middleware = require('./utils/middleware')
const tripsRouter = require('./controllers/trips')
const stagesRouter = require('./controllers/stages')
const activitiesRouter = require('./controllers/activities')
const countriesRouter = require('./controllers/countries')
const languagesRouter = require('./controllers/languages')
const activityTypesRouter = require('./controllers/activityTypes')
const transportTypesRouter = require('./controllers/transportTypes')
const accommodationTypesRouter = require('./controllers/accommodationTypes')
const expenseCategoriesRouter = require('./controllers/expenseCategories')
const notificationTypesRouter = require('./controllers/notificationTypes')
const { connectToDatabase } = require('./utils/db')
const { SECRET, ENVIR, DB_URI } = require('./utils/config')

const isProduction = ENVIR === 'production'
const isTest = ENVIR === 'test'

const defaultOrigins = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000']
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : defaultOrigins

if (isProduction) {
  app.set('trust proxy', 1)
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true)
      return
    }
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json())

const databaseUrl = DB_URI || process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/travel_manager'
const sessionStore = isTest
  ? undefined
  : new pgSession({
      ...(isProduction
        ? {
            conObject: {
              connectionString: databaseUrl,
              ssl: { rejectUnauthorized: false }
            }
          }
        : { conString: databaseUrl }),
      tableName: 'session',
      createTableIfMissing: true
    })

app.use(session({
  store: sessionStore,
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  }
}))
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Travel Manager routes
app.use('/api/auth', usersRouter)
app.use('/api/trips', tripsRouter)
app.use('/api/stages', stagesRouter)
app.use('/api/activities', activitiesRouter)
app.use('/api/countries', countriesRouter)
app.use('/api/languages', languagesRouter)
app.use('/api/activity-types', activityTypesRouter)
app.use('/api/transport-types', transportTypesRouter)
app.use('/api/accommodation-types', accommodationTypesRouter)
app.use('/api/expense-categories', expenseCategoriesRouter)
app.use('/api/notification-types', notificationTypesRouter)
app.use('/api/import', require('./controllers/import'))
app.use('/api/ai-import', require('./controllers/ai-import'))
app.use('/api/ai-planning', require('./controllers/ai-planning'))
app.use('/api/ai-adapt', require('./controllers/ai-adapt'))
app.use('/api/admin', require('./controllers/admin'))

connectToDatabase()

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app