const { DataTypes } = require('sequelize')

module.exports = {
  up: async ({ context: queryInterface }) => {
    // Insert languages
    await queryInterface.bulkInsert('languages', [
      { id: 1, code: 'en', name: 'English', created_at: new Date(), updated_at: new Date() },
      { id: 2, code: 'fr', name: 'Français', created_at: new Date(), updated_at: new Date() },
      { id: 3, code: 'nl', name: 'Nederlands', created_at: new Date(), updated_at: new Date() },
      { id: 4, code: 'es', name: 'Español', created_at: new Date(), updated_at: new Date() }
    ])

    // Insert countries
    await queryInterface.bulkInsert('countries', [
      { id: 1, name: 'France', code: 'FR', created_at: new Date(), updated_at: new Date() },
      { id: 2, name: 'Spain', code: 'ES', created_at: new Date(), updated_at: new Date() },
      { id: 3, name: 'Italy', code: 'IT', created_at: new Date(), updated_at: new Date() },
      { id: 4, name: 'Germany', code: 'DE', created_at: new Date(), updated_at: new Date() },
      { id: 5, name: 'Belgium', code: 'BE', created_at: new Date(), updated_at: new Date() },
      { id: 6, name: 'Netherlands', code: 'NL', created_at: new Date(), updated_at: new Date() },
      { id: 7, name: 'United Kingdom', code: 'GB', created_at: new Date(), updated_at: new Date() },
      { id: 8, name: 'Portugal', code: 'PT', created_at: new Date(), updated_at: new Date() },
      { id: 9, name: 'Switzerland', code: 'CH', created_at: new Date(), updated_at: new Date() },
      { id: 10, name: 'Austria', code: 'AT', created_at: new Date(), updated_at: new Date() }
    ])

    // Insert translations for countries
    const translations = [
      // France
      { language_id: 1, entity_type: 'country', entity_id: 1, field_name: 'name', translated_text: 'France', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 1, field_name: 'name', translated_text: 'France', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 1, field_name: 'name', translated_text: 'Frankrijk', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 1, field_name: 'name', translated_text: 'Francia', created_at: new Date(), updated_at: new Date() },
      
      // Spain
      { language_id: 1, entity_type: 'country', entity_id: 2, field_name: 'name', translated_text: 'Spain', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 2, field_name: 'name', translated_text: 'Espagne', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 2, field_name: 'name', translated_text: 'Spanje', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 2, field_name: 'name', translated_text: 'España', created_at: new Date(), updated_at: new Date() },
      
      // Italy
      { language_id: 1, entity_type: 'country', entity_id: 3, field_name: 'name', translated_text: 'Italy', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 3, field_name: 'name', translated_text: 'Italie', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 3, field_name: 'name', translated_text: 'Italië', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 3, field_name: 'name', translated_text: 'Italia', created_at: new Date(), updated_at: new Date() },
      
      // Germany
      { language_id: 1, entity_type: 'country', entity_id: 4, field_name: 'name', translated_text: 'Germany', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 4, field_name: 'name', translated_text: 'Allemagne', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 4, field_name: 'name', translated_text: 'Duitsland', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 4, field_name: 'name', translated_text: 'Alemania', created_at: new Date(), updated_at: new Date() },
      
      // Belgium
      { language_id: 1, entity_type: 'country', entity_id: 5, field_name: 'name', translated_text: 'Belgium', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 5, field_name: 'name', translated_text: 'Belgique', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 5, field_name: 'name', translated_text: 'België', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 5, field_name: 'name', translated_text: 'Bélgica', created_at: new Date(), updated_at: new Date() },
      
      // Netherlands
      { language_id: 1, entity_type: 'country', entity_id: 6, field_name: 'name', translated_text: 'Netherlands', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 6, field_name: 'name', translated_text: 'Pays-Bas', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 6, field_name: 'name', translated_text: 'Nederland', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 6, field_name: 'name', translated_text: 'Países Bajos', created_at: new Date(), updated_at: new Date() },
      
      // United Kingdom
      { language_id: 1, entity_type: 'country', entity_id: 7, field_name: 'name', translated_text: 'United Kingdom', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 7, field_name: 'name', translated_text: 'Royaume-Uni', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 7, field_name: 'name', translated_text: 'Verenigd Koninkrijk', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 7, field_name: 'name', translated_text: 'Reino Unido', created_at: new Date(), updated_at: new Date() },
      
      // Portugal
      { language_id: 1, entity_type: 'country', entity_id: 8, field_name: 'name', translated_text: 'Portugal', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 8, field_name: 'name', translated_text: 'Portugal', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 8, field_name: 'name', translated_text: 'Portugal', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 8, field_name: 'name', translated_text: 'Portugal', created_at: new Date(), updated_at: new Date() },
      
      // Switzerland
      { language_id: 1, entity_type: 'country', entity_id: 9, field_name: 'name', translated_text: 'Switzerland', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 9, field_name: 'name', translated_text: 'Suisse', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 9, field_name: 'name', translated_text: 'Zwitserland', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 9, field_name: 'name', translated_text: 'Suiza', created_at: new Date(), updated_at: new Date() },
      
      // Austria
      { language_id: 1, entity_type: 'country', entity_id: 10, field_name: 'name', translated_text: 'Austria', created_at: new Date(), updated_at: new Date() },
      { language_id: 2, entity_type: 'country', entity_id: 10, field_name: 'name', translated_text: 'Autriche', created_at: new Date(), updated_at: new Date() },
      { language_id: 3, entity_type: 'country', entity_id: 10, field_name: 'name', translated_text: 'Oostenrijk', created_at: new Date(), updated_at: new Date() },
      { language_id: 4, entity_type: 'country', entity_id: 10, field_name: 'name', translated_text: 'Austria', created_at: new Date(), updated_at: new Date() }
    ]

    await queryInterface.bulkInsert('translations', translations)

    // Insert activity types
    await queryInterface.bulkInsert('activity_types', [
      { id: 1, label: 'Restaurant', created_at: new Date(), updated_at: new Date() },
      { id: 2, label: 'Museum', created_at: new Date(), updated_at: new Date() },
      { id: 3, label: 'Tour', created_at: new Date(), updated_at: new Date() },
      { id: 4, label: 'Shopping', created_at: new Date(), updated_at: new Date() },
      { id: 5, label: 'Entertainment', created_at: new Date(), updated_at: new Date() }
    ])
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.bulkDelete('translations', null, {})
    await queryInterface.bulkDelete('activity_types', null, {})
    await queryInterface.bulkDelete('countries', null, {})
    await queryInterface.bulkDelete('languages', null, {})
  }
}