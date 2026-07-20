const normalizeTableNames = (tables) =>
  tables.map((table) => {
    if (typeof table === 'string') return table
    return table.tableName || table.name
  })

const tableExists = async (queryInterface, tableName) => {
  const tables = normalizeTableNames(await queryInterface.showAllTables())
  return tables.includes(tableName)
}

const addColumnIfNotExists = async (queryInterface, table, column, definition) => {
  const tableInfo = await queryInterface.describeTable(table)
  if (!tableInfo[column]) {
    await queryInterface.addColumn(table, column, definition)
  }
}

const removeColumnIfExists = async (queryInterface, table, column) => {
  const tableInfo = await queryInterface.describeTable(table)
  if (tableInfo[column]) {
    await queryInterface.removeColumn(table, column)
  }
}

const createTableIfNotExists = async (queryInterface, table, schema) => {
  if (!(await tableExists(queryInterface, table))) {
    await queryInterface.createTable(table, schema)
  }
}

const addIndexIfNotExists = async (queryInterface, table, fields, options = {}) => {
  try {
    await queryInterface.addIndex(table, fields, options)
  } catch (error) {
    if (!String(error.message).includes('already exists')) {
      throw error
    }
  }
}

const LANGUAGE_CODES = [
  { languageId: 1, code: 'en' },
  { languageId: 2, code: 'fr' },
  { languageId: 3, code: 'nl' },
  { languageId: 4, code: 'es' }
]

const upsertCountryByCode = async (queryInterface, country) => {
  const existing = await queryInterface.sequelize.query(
    'SELECT id FROM countries WHERE code = :code',
    {
      replacements: { code: country.code },
      type: queryInterface.sequelize.QueryTypes.SELECT
    }
  )

  let countryId

  if (existing.length > 0) {
    countryId = existing[0].id
    const updates = {
      name: country.name,
      updated_at: new Date()
    }
    if (country.timezone) {
      updates.timezone = country.timezone
    }
    await queryInterface.bulkUpdate('countries', updates, { code: country.code })
  } else {
    const maxId = await queryInterface.sequelize.query(
      'SELECT COALESCE(MAX(id), 0) AS max_id FROM countries',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    countryId = maxId[0].max_id + 1
    await queryInterface.bulkInsert('countries', [{
      id: countryId,
      name: country.name,
      code: country.code,
      timezone: country.timezone || null,
      created_at: new Date(),
      updated_at: new Date()
    }])
  }

  if (!country.translations) {
    return countryId
  }

  for (const { languageId, code } of LANGUAGE_CODES) {
    const translatedText = country.translations[code]
    if (!translatedText) continue

    const existingTranslation = await queryInterface.sequelize.query(
      `SELECT id FROM translations
       WHERE entity_type = 'country'
         AND entity_id = :entityId
         AND language_id = :languageId
         AND field_name = 'name'`,
      {
        replacements: { entityId: countryId, languageId },
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    )

    if (existingTranslation.length > 0) {
      await queryInterface.bulkUpdate('translations', {
        translated_text: translatedText,
        updated_at: new Date()
      }, { id: existingTranslation[0].id })
    } else {
      await queryInterface.bulkInsert('translations', [{
        language_id: languageId,
        entity_type: 'country',
        entity_id: countryId,
        field_name: 'name',
        translated_text: translatedText,
        created_at: new Date(),
        updated_at: new Date()
      }])
    }
  }

  return countryId
}

module.exports = {
  addColumnIfNotExists,
  removeColumnIfExists,
  createTableIfNotExists,
  addIndexIfNotExists,
  tableExists,
  upsertCountryByCode
}
