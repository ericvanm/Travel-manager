const app = require('express')()
const session = require('express-session')
const cors = require('cors')
const usersRouter = require('./controllers/users')
const middleware = require('./utils/middleware')
const loginRouter = require('./controllers/login')
const logoutRouter = require('./controllers/logout')
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
const { SECRET } = require('./utils/config');

app.use(cors({
  origin: function (origin, callback) {
    console.log('CORS Origin:', origin);
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use((require('express')).json())
app.use(session({
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2,  // 2 hours session timeout
    httpOnly: true,
    secure: false,  // set to true in production with HTTPS
    sameSite: 'lax'
  }
}))
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)

// Travel Manager routes
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/logout', logoutRouter)
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

connectToDatabase()

app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

module.exports = app