/* eslint-disable no-undef */
require('dotenv').config()

const PORT = process.env.PORT
const DB_URI = process.env.NODE_ENV === 'test'   
? process.env.TEST_DATABASE_URL
: process.env.DATABASE_URL
const ENVIR = process.env.NODE_ENV
const SECRET = process.env.SECRET

console.log('PORT:', PORT)
console.log('NODE_ENV:', ENVIR)
console.log('DATABASE_URL:', DB_URI)

module.exports = {
  DB_URI: DB_URI,
  PORT,
  ENVIR,
  SECRET
}