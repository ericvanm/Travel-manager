const { DataTypes } = require('sequelize')

const countries = [
  { name: 'Afghanistan', code: 'AF', translations: { en: 'Afghanistan', fr: 'Afghanistan', nl: 'Afghanistan', es: 'Afganistán' } },
  { name: 'Albania', code: 'AL', translations: { en: 'Albania', fr: 'Albanie', nl: 'Albanië', es: 'Albania' } },
  { name: 'Algeria', code: 'DZ', translations: { en: 'Algeria', fr: 'Algérie', nl: 'Algerije', es: 'Argelia' } },
  { name: 'Argentina', code: 'AR', translations: { en: 'Argentina', fr: 'Argentine', nl: 'Argentinië', es: 'Argentina' } },
  { name: 'Australia', code: 'AU', translations: { en: 'Australia', fr: 'Australie', nl: 'Australië', es: 'Australia' } },
  { name: 'Brazil', code: 'BR', translations: { en: 'Brazil', fr: 'Brésil', nl: 'Brazilië', es: 'Brasil' } },
  { name: 'Canada', code: 'CA', translations: { en: 'Canada', fr: 'Canada', nl: 'Canada', es: 'Canadá' } },
  { name: 'China', code: 'CN', translations: { en: 'China', fr: 'Chine', nl: 'China', es: 'China' } },
  { name: 'Egypt', code: 'EG', translations: { en: 'Egypt', fr: 'Égypte', nl: 'Egypte', es: 'Egipto' } },
  { name: 'Finland', code: 'FI', translations: { en: 'Finland', fr: 'Finlande', nl: 'Finland', es: 'Finlandia' } },
  { name: 'Greece', code: 'GR', translations: { en: 'Greece', fr: 'Grèce', nl: 'Griekenland', es: 'Grecia' } },
  { name: 'India', code: 'IN', translations: { en: 'India', fr: 'Inde', nl: 'India', es: 'India' } },
  { name: 'Indonesia', code: 'ID', translations: { en: 'Indonesia', fr: 'Indonésie', nl: 'Indonesië', es: 'Indonesia' } },
  { name: 'Ireland', code: 'IE', translations: { en: 'Ireland', fr: 'Irlande', nl: 'Ierland', es: 'Irlanda' } },
  { name: 'Japan', code: 'JP', translations: { en: 'Japan', fr: 'Japon', nl: 'Japan', es: 'Japón' } },
  { name: 'Mexico', code: 'MX', translations: { en: 'Mexico', fr: 'Mexique', nl: 'Mexico', es: 'México' } },
  { name: 'Morocco', code: 'MA', translations: { en: 'Morocco', fr: 'Maroc', nl: 'Marokko', es: 'Marruecos' } },
  { name: 'Norway', code: 'NO', translations: { en: 'Norway', fr: 'Norvège', nl: 'Noorwegen', es: 'Noruega' } },
  { name: 'Poland', code: 'PL', translations: { en: 'Poland', fr: 'Pologne', nl: 'Polen', es: 'Polonia' } },
  { name: 'Russia', code: 'RU', translations: { en: 'Russia', fr: 'Russie', nl: 'Rusland', es: 'Rusia' } },
  { name: 'South Africa', code: 'ZA', translations: { en: 'South Africa', fr: 'Afrique du Sud', nl: 'Zuid-Afrika', es: 'Sudáfrica' } },
  { name: 'South Korea', code: 'KR', translations: { en: 'South Korea', fr: 'Corée du Sud', nl: 'Zuid-Korea', es: 'Corea del Sur' } },
  { name: 'Sweden', code: 'SE', translations: { en: 'Sweden', fr: 'Suède', nl: 'Zweden', es: 'Suecia' } },
  { name: 'Thailand', code: 'TH', translations: { en: 'Thailand', fr: 'Thaïlande', nl: 'Thailand', es: 'Tailandia' } },
  { name: 'Turkey', code: 'TR', translations: { en: 'Turkey', fr: 'Turquie', nl: 'Turkije', es: 'Turquía' } },
  { name: 'Ukraine', code: 'UA', translations: { en: 'Ukraine', fr: 'Ukraine', nl: 'Oekraïne', es: 'Ucrania' } },
  { name: 'United States', code: 'US', translations: { en: 'United States', fr: 'États-Unis', nl: 'Verenigde Staten', es: 'Estados Unidos' } },
  { name: 'Vietnam', code: 'VN', translations: { en: 'Vietnam', fr: 'Vietnam', nl: 'Vietnam', es: 'Vietnam' } },
  { name: 'Czech Republic', code: 'CZ', translations: { en: 'Czech Republic', fr: 'République tchèque', nl: 'Tsjechië', es: 'República Checa' } },
  { name: 'Denmark', code: 'DK', translations: { en: 'Denmark', fr: 'Danemark', nl: 'Denemarken', es: 'Dinamarca' } },
  { name: 'Hungary', code: 'HU', translations: { en: 'Hungary', fr: 'Hongrie', nl: 'Hongarije', es: 'Hungría' } },
  { name: 'Croatia', code: 'HR', translations: { en: 'Croatia', fr: 'Croatie', nl: 'Kroatië', es: 'Croacia' } },
  { name: 'Romania', code: 'RO', translations: { en: 'Romania', fr: 'Roumanie', nl: 'Roemenië', es: 'Rumania' } },
  { name: 'Bulgaria', code: 'BG', translations: { en: 'Bulgaria', fr: 'Bulgarie', nl: 'Bulgarije', es: 'Bulgaria' } },
  { name: 'Slovenia', code: 'SI', translations: { en: 'Slovenia', fr: 'Slovénie', nl: 'Slovenië', es: 'Eslovenia' } },
  { name: 'Slovakia', code: 'SK', translations: { en: 'Slovakia', fr: 'Slovaquie', nl: 'Slowakije', es: 'Eslovaquia' } },
  { name: 'Lithuania', code: 'LT', translations: { en: 'Lithuania', fr: 'Lituanie', nl: 'Litouwen', es: 'Lituania' } },
  { name: 'Latvia', code: 'LV', translations: { en: 'Latvia', fr: 'Lettonie', nl: 'Letland', es: 'Letonia' } },
  { name: 'Estonia', code: 'EE', translations: { en: 'Estonia', fr: 'Estonie', nl: 'Estland', es: 'Estonia' } },
  { name: 'Luxembourg', code: 'LU', translations: { en: 'Luxembourg', fr: 'Luxembourg', nl: 'Luxemburg', es: 'Luxemburgo' } },
  { name: 'Malta', code: 'MT', translations: { en: 'Malta', fr: 'Malte', nl: 'Malta', es: 'Malta' } },
  { name: 'Cyprus', code: 'CY', translations: { en: 'Cyprus', fr: 'Chypre', nl: 'Cyprus', es: 'Chipre' } },
  { name: 'Iceland', code: 'IS', translations: { en: 'Iceland', fr: 'Islande', nl: 'IJsland', es: 'Islandia' } },
  { name: 'New Zealand', code: 'NZ', translations: { en: 'New Zealand', fr: 'Nouvelle-Zélande', nl: 'Nieuw-Zeeland', es: 'Nueva Zelanda' } },
  { name: 'Singapore', code: 'SG', translations: { en: 'Singapore', fr: 'Singapour', nl: 'Singapore', es: 'Singapur' } },
  { name: 'Malaysia', code: 'MY', translations: { en: 'Malaysia', fr: 'Malaisie', nl: 'Maleisië', es: 'Malasia' } },
  { name: 'Philippines', code: 'PH', translations: { en: 'Philippines', fr: 'Philippines', nl: 'Filipijnen', es: 'Filipinas' } },
  { name: 'Israel', code: 'IL', translations: { en: 'Israel', fr: 'Israël', nl: 'Israël', es: 'Israel' } },
  { name: 'Jordan', code: 'JO', translations: { en: 'Jordan', fr: 'Jordanie', nl: 'Jordanië', es: 'Jordania' } },
  { name: 'Lebanon', code: 'LB', translations: { en: 'Lebanon', fr: 'Liban', nl: 'Libanon', es: 'Líbano' } }
]

module.exports = {
  up: async ({ context: queryInterface }) => {
    // Clear existing data first
    await queryInterface.bulkDelete('translations', { entity_type: 'country' }, {})
    await queryInterface.bulkDelete('countries', { id: { [require('sequelize').Op.gt]: 10 } }, {})
    
    let countryId = 11
    const translations = []
    
    for (const country of countries) {
      // Insert country
      await queryInterface.bulkInsert('countries', [{
        id: countryId,
        name: country.name,
        code: country.code,
        created_at: new Date(),
        updated_at: new Date()
      }])
      
      // Add translations
      translations.push(
        { language_id: 1, entity_type: 'country', entity_id: countryId, field_name: 'name', translated_text: country.translations.en, created_at: new Date(), updated_at: new Date() },
        { language_id: 2, entity_type: 'country', entity_id: countryId, field_name: 'name', translated_text: country.translations.fr, created_at: new Date(), updated_at: new Date() },
        { language_id: 3, entity_type: 'country', entity_id: countryId, field_name: 'name', translated_text: country.translations.nl, created_at: new Date(), updated_at: new Date() },
        { language_id: 4, entity_type: 'country', entity_id: countryId, field_name: 'name', translated_text: country.translations.es, created_at: new Date(), updated_at: new Date() }
      )
      
      countryId++
    }
    
    await queryInterface.bulkInsert('translations', translations)
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.bulkDelete('translations', { entity_type: 'country', entity_id: { [require('sequelize').Op.gt]: 10 } }, {})
    await queryInterface.bulkDelete('countries', { id: { [require('sequelize').Op.gt]: 10 } }, {})
  }
}