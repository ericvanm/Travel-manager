/**
 * Travel Manager API Application
 * 
 * This is the main Express application file that sets up the backend server for the Travel Manager application.
 * It configures middleware, database connections, session management, CORS policies, and routes all API endpoints.
 * The application handles user authentication, trip management, stages, activities, and various travel-related entities.
 * 
 * @author Eric Van Meerbeck
 * @version 1.0.0
 */

const express = require('express')
const app = express()
app.disable('x-powered-by')

// Session management with PostgreSQL store
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)

// CORS configuration for cross-origin resource sharing
const cors = require('cors')

// Import all route controllers
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

// Database connection utilities
const { connectToDatabase } = require('./utils/db')
const { SECRET, ENVIR, DB_URI } = require('./utils/config')

// Environment detection for configuration
const isProduction = ENVIR === 'production'
const isTest = ENVIR === 'test'

/**
 * CORS Configuration
 * 
 * Sets up CORS middleware with dynamic origin validation based on environment variables.
 * In production, allows specific origins including .vercel.app and .onrender.com domains.
 * For development, allows localhost origins on common ports (5173, 8080, 3000).
 * 
 * @type {Object}
 */
const defaultOrigins = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000']
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
  : defaultOrigins

// Configure proxy trust for production environments (required for SSL termination)
if (isProduction) {
  app.set('trust proxy', 1)
}

/**
 * CORS Middleware Setup
 * 
 * Configures CORS policies with dynamic origin validation and secure settings.
 * This middleware validates incoming requests against allowed origins and handles
 * preflight OPTIONS requests properly.
 * 
 * @param {Object} origin - The origin of the incoming request
 * @param {Function} callback - Callback function to accept or reject the origin
 */
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

// Body parsing middleware for JSON requests
app.use(express.json())

/**
 * Database Connection Configuration
 * 
 * Sets up the PostgreSQL database connection string with environment-specific fallbacks.
 * Uses different connection parameters based on production vs development environments.
 * 
 * @type {string}
 */
const databaseUrl = DB_URI || process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/travel_manager'

/**
 * Session Store Configuration
 * 
 * Configures PostgreSQL-based session store for persistent user sessions.
 * In test environment, uses undefined store (no session persistence).
 * In production, configures SSL connection with proper SSL settings.
 * In development, uses standard connection string without SSL.
 * 
 * @type {Object|undefined}
 */
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

/**
 * Session Middleware Configuration
 * 
 * Sets up express-session middleware with PostgreSQL session store.
 * Configures secure cookie settings based on environment (production vs development).
 * Uses appropriate security flags for cookies including HttpOnly, Secure, and SameSite.
 * 
 * @param {Object} store - PostgreSQL session store instance
 * @param {string} secret - Session secret for signing cookies
 * @param {boolean} resave - Whether to save session even if unmodified
 * @param {boolean} saveUninitialized - Whether to save uninitialized sessions
 * @param {Object} cookie - Cookie configuration
 */
app.use(session({
  store: sessionStore,
  secret: SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days in milliseconds
    httpOnly: true, // Prevents XSS attacks by making cookies inaccessible to JavaScript
    secure: isProduction, // Only send cookies over HTTPS in production
    sameSite: isProduction ? 'none' : 'lax' // CSRF protection setting
  }
}))

// Custom middleware for request logging and token extraction
app.use(middleware.requestLogger)
app.use(middleware.tokenExtractor)

/**
 * Health Check Endpoint
 * 
 * Provides a simple GET endpoint to check if the API server is running.
 * Returns a basic JSON response indicating the service status.
 * 
 * @param {Object} _req - Express request object (not used)
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with status 'ok'
 */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Travel Manager API Routes
// All routes are mounted under their respective API endpoints

/**
 * Authentication Routes
 * 
 * Handles user authentication related endpoints including login, registration,
 * password reset, and session management.
 * 
 * @route /api/auth
 */
app.use('/api/auth', usersRouter)

/**
 * Trip Management Routes
 * 
 * Manages trip creation, retrieval, updates, and deletion operations.
 * Includes functionality for trip planning and organization.
 * 
 * @route /api/trips
 */
app.use('/api/trips', tripsRouter)

/**
 * Stage Management Routes
 * 
 * Handles stage (day-by-day) itinerary components within trips.
 * Allows for organizing travel days with specific activities and locations.
 * 
 * @route /api/stages
 */
app.use('/api/stages', stagesRouter)

/**
 * Activity Management Routes
 * 
 * Manages individual activities within stages including scheduling,
 * categorization, and tracking of trip activities.
 * 
 * @route /api/activities
 */
app.use('/api/activities', activitiesRouter)

/**
 * Country Data Routes
 * 
 * Provides endpoints for country information management.
 * Used for location-based data and travel planning.
 * 
 * @route /api/countries
 */
app.use('/api/countries', countriesRouter)

/**
 * Language Data Routes
 * 
 * Manages language information for travel destinations.
 * Supports multilingual features in the application.
 * 
 * @route /api/languages
 */
app.use('/api/languages', languagesRouter)

/**
 * Activity Type Routes
 * 
 * Handles categorization of activities with predefined types.
 * Used for organizing and filtering different kinds of travel activities.
 * 
 * @route /api/activity-types
 */
app.use('/api/activity-types', activityTypesRouter)

/**
 * Transport Type Routes
 * 
 * Manages transportation method types for travel planning.
 * Supports various modes of transport tracking and categorization.
 * 
 * @route /api/transport-types
 */
app.use('/api/transport-types', transportTypesRouter)

/**
 * Accommodation Type Routes
 * 
 * Handles accommodation type definitions for trip planning.
 * Supports different lodging options and categorization.
 * 
 * @route /api/accommodation-types
 */
app.use('/api/accommodation-types', accommodationTypesRouter)

/**
 * Expense Category Routes
 * 
 * Manages expense categories for tracking travel costs.
 * Supports financial management within trips.
 * 
 * @route /api/expense-categories
 */
app.use('/api/expense-categories', expenseCategoriesRouter)

/**
 * Notification Type Routes
 * 
 * Handles notification system configuration and types.
 * Used for alerting users about trip updates and events.
 * 
 * @route /api/notification-types
 */
app.use('/api/notification-types', notificationTypesRouter)

// Import related routes - for data import functionality
app.use('/api/import', require('./controllers/import'))

// AI-related routes - for artificial intelligence powered features
app.use('/api/ai-import', require('./controllers/ai-import'))
app.use('/api/ai-planning', require('./controllers/ai-planning'))
app.use('/api/ai-adapt', require('./controllers/ai-adapt'))

// Administrative routes - for system management and configuration
app.use('/api/admin', require('./controllers/admin'))

/**
 * Database Connection Initialization
 * 
 * Establishes connection to the PostgreSQL database using environment variables.
 * This function should be called before starting the server to ensure database availability.
 * 
 * @function connectToDatabase
 */
connectToDatabase()

// Error handling middleware - catches unknown endpoints and errors
app.use(middleware.unknownEndpoint)
app.use(middleware.errorHandler)

// Export the configured Express application instance
module.exports = app