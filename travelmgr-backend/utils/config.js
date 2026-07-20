/* eslint-disable no-undef */
require('dotenv').config()

const { buildDatabaseLogContext } = require('./log-sanitizer')

const PORT = process.env.PORT
const DB_URI = process.env.NODE_ENV === 'test'   
? process.env.TEST_DATABASE_URL
: process.env.DATABASE_URL
const ENVIR = process.env.NODE_ENV
const SECRET = process.env.SECRET

module.exports = {
  DB_URI: DB_URI,
  DB_LOG_CONTEXT: buildDatabaseLogContext(DB_URI, ENVIR),
  PORT,
  ENVIR,
  SECRET
}