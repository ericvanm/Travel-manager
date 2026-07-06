const { DataTypes } = require('sequelize')

const countries = [
  { name: 'France', code: 'FR', timezone: 'Europe/Paris', translations: { en: 'France', fr: 'France', nl: 'Frankrijk', es: 'Francia' } },
  { name: 'Spain', code: 'ES', timezone: 'Europe/Madrid', translations: { en: 'Spain', fr: 'Espagne', nl: 'Spanje', es: 'España' } },
  { name: 'Italy', code: 'IT', timezone: 'Europe/Rome', translations: { en: 'Italy', fr: 'Italie', nl: 'Italië', es: 'Italia' } },
  { name: 'Germany', code: 'DE', timezone: 'Europe/Berlin', translations: { en: 'Germany', fr: 'Allemagne', nl: 'Duitsland', es: 'Alemania' } },
  { name: 'Belgium', code: 'BE', timezone: 'Europe/Brussels', translations: { en: 'Belgium', fr: 'Belgique', nl: 'België', es: 'Bélgica' } },
  { name: 'Netherlands', code: 'NL', timezone: 'Europe/Amsterdam', translations: { en: 'Netherlands', fr: 'Pays-Bas', nl: 'Nederland', es: 'Países Bajos' } },
  { name: 'United Kingdom', code: 'GB', timezone: 'Europe/London', translations: { en: 'United Kingdom', fr: 'Royaume-Uni', nl: 'Verenigd Koninkrijk', es: 'Reino Unido' } },
  { name: 'Portugal', code: 'PT', timezone: 'Europe/Lisbon', translations: { en: 'Portugal', fr: 'Portugal', nl: 'Portugal', es: 'Portugal' } },
  { name: 'Switzerland', code: 'CH', timezone: 'Europe/Zurich', translations: { en: 'Switzerland', fr: 'Suisse', nl: 'Zwitserland', es: 'Suiza' } },
  { name: 'Austria', code: 'AT', timezone: 'Europe/Vienna', translations: { en: 'Austria', fr: 'Autriche', nl: 'Oostenrijk', es: 'Austria' } },
  { name: 'Afghanistan', code: 'AF', timezone: 'Asia/Kabul', translations: { en: 'Afghanistan', fr: 'Afghanistan', nl: 'Afghanistan', es: 'Afganistán' } },
  { name: 'Albania', code: 'AL', timezone: 'Europe/Tirane', translations: { en: 'Albania', fr: 'Albanie', nl: 'Albanië', es: 'Albania' } },
  { name: 'Algeria', code: 'DZ', timezone: 'Africa/Algiers', translations: { en: 'Algeria', fr: 'Algérie', nl: 'Algerije', es: 'Argelia' } },
  { name: 'Argentina', code: 'AR', timezone: 'America/Argentina/Buenos_Aires', translations: { en: 'Argentina', fr: 'Argentine', nl: 'Argentinië', es: 'Argentina' } },
  { name: 'Australia', code: 'AU', timezone: 'Australia/Sydney', translations: { en: 'Australia', fr: 'Australie', nl: 'Australië', es: 'Australia' } },
  { name: 'Brazil', code: 'BR', timezone: 'America/Sao_Paulo', translations: { en: 'Brazil', fr: 'Brésil', nl: 'Brazilië', es: 'Brasil' } },
  { name: 'Canada', code: 'CA', timezone: 'America/Toronto', translations: { en: 'Canada', fr: 'Canada', nl: 'Canada', es: 'Canadá' } },
  { name: 'China', code: 'CN', timezone: 'Asia/Shanghai', translations: { en: 'China', fr: 'Chine', nl: 'China', es: 'China' } },
  { name: 'Egypt', code: 'EG', timezone: 'Africa/Cairo', translations: { en: 'Egypt', fr: 'Égypte', nl: 'Egypte', es: 'Egipto' } },
  { name: 'Finland', code: 'FI', timezone: 'Europe/Helsinki', translations: { en: 'Finland', fr: 'Finlande', nl: 'Finland', es: 'Finlandia' } },
  { name: 'Greece', code: 'GR', timezone: 'Europe/Athens', translations: { en: 'Greece', fr: 'Grèce', nl: 'Griekenland', es: 'Grecia' } },
  { name: 'India', code: 'IN', timezone: 'Asia/Kolkata', translations: { en: 'India', fr: 'Inde', nl: 'India', es: 'India' } },
  { name: 'Indonesia', code: 'ID', timezone: 'Asia/Jakarta', translations: { en: 'Indonesia', fr: 'Indonésie', nl: 'Indonesië', es: 'Indonesia' } },
  { name: 'Ireland', code: 'IE', timezone: 'Europe/Dublin', translations: { en: 'Ireland', fr: 'Irlande', nl: 'Ierland', es: 'Irlanda' } },
  { name: 'Japan', code: 'JP', timezone: 'Asia/Tokyo', translations: { en: 'Japan', fr: 'Japon', nl: 'Japan', es: 'Japón' } },
  { name: 'Mexico', code: 'MX', timezone: 'America/Mexico_City', translations: { en: 'Mexico', fr: 'Mexique', nl: 'Mexico', es: 'México' } },
  { name: 'Morocco', code: 'MA', timezone: 'Africa/Casablanca', translations: { en: 'Morocco', fr: 'Maroc', nl: 'Marokko', es: 'Marruecos' } },
  { name: 'Norway', code: 'NO', timezone: 'Europe/Oslo', translations: { en: 'Norway', fr: 'Norvège', nl: 'Noorwegen', es: 'Noruega' } },
  { name: 'Poland', code: 'PL', timezone: 'Europe/Warsaw', translations: { en: 'Poland', fr: 'Pologne', nl: 'Polen', es: 'Polonia' } },
  { name: 'Russia', code: 'RU', timezone: 'Europe/Moscow', translations: { en: 'Russia', fr: 'Russie', nl: 'Rusland', es: 'Rusia' } },
  { name: 'South Africa', code: 'ZA', timezone: 'Africa/Johannesburg', translations: { en: 'South Africa', fr: 'Afrique du Sud', nl: 'Zuid-Afrika', es: 'Sudáfrica' } },
  { name: 'South Korea', code: 'KR', timezone: 'Asia/Seoul', translations: { en: 'South Korea', fr: 'Corée du Sud', nl: 'Zuid-Korea', es: 'Corea del Sur' } },
  { name: 'Sweden', code: 'SE', timezone: 'Europe/Stockholm', translations: { en: 'Sweden', fr: 'Suède', nl: 'Zweden', es: 'Suecia' } },
  { name: 'Thailand', code: 'TH', timezone: 'Asia/Bangkok', translations: { en: 'Thailand', fr: 'Thaïlande', nl: 'Thailand', es: 'Tailandia' } },
  { name: 'Turkey', code: 'TR', timezone: 'Europe/Istanbul', translations: { en: 'Turkey', fr: 'Turquie', nl: 'Turkije', es: 'Turquía' } },
  { name: 'Ukraine', code: 'UA', timezone: 'Europe/Kiev', translations: { en: 'Ukraine', fr: 'Ukraine', nl: 'Oekraïne', es: 'Ucrania' } },
  { name: 'United States', code: 'US', timezone: 'America/New_York', translations: { en: 'United States', fr: 'États-Unis', nl: 'Verenigde Staten', es: 'Estados Unidos' } },
  { name: 'Vietnam', code: 'VN', timezone: 'Asia/Ho_Chi_Minh', translations: { en: 'Vietnam', fr: 'Vietnam', nl: 'Vietnam', es: 'Vietnam' } },
  { name: 'Czech Republic', code: 'CZ', timezone: 'Europe/Prague', translations: { en: 'Czech Republic', fr: 'République tchèque', nl: 'Tsjechië', es: 'República Checa' } },
  { name: 'Denmark', code: 'DK', timezone: 'Europe/Copenhagen', translations: { en: 'Denmark', fr: 'Danemark', nl: 'Denemarken', es: 'Dinamarca' } },
  { name: 'Hungary', code: 'HU', timezone: 'Europe/Budapest', translations: { en: 'Hungary', fr: 'Hongrie', nl: 'Hongarije', es: 'Hungría' } },
  { name: 'Croatia', code: 'HR', timezone: 'Europe/Zagreb', translations: { en: 'Croatia', fr: 'Croatie', nl: 'Kroatië', es: 'Croacia' } },
  { name: 'Romania', code: 'RO', timezone: 'Europe/Bucharest', translations: { en: 'Romania', fr: 'Roumanie', nl: 'Roemenië', es: 'Rumania' } },
  { name: 'Bulgaria', code: 'BG', timezone: 'Europe/Sofia', translations: { en: 'Bulgaria', fr: 'Bulgarie', nl: 'Bulgarije', es: 'Bulgaria' } },
  { name: 'Slovenia', code: 'SI', timezone: 'Europe/Ljubljana', translations: { en: 'Slovenia', fr: 'Slovénie', nl: 'Slovenië', es: 'Eslovenia' } },
  { name: 'Slovakia', code: 'SK', timezone: 'Europe/Bratislava', translations: { en: 'Slovakia', fr: 'Slovaquie', nl: 'Slowakije', es: 'Eslovaquia' } },
  { name: 'Lithuania', code: 'LT', timezone: 'Europe/Vilnius', translations: { en: 'Lithuania', fr: 'Lituanie', nl: 'Litouwen', es: 'Lituania' } },
  { name: 'Latvia', code: 'LV', timezone: 'Europe/Riga', translations: { en: 'Latvia', fr: 'Lettonie', nl: 'Letland', es: 'Letonia' } },
  { name: 'Estonia', code: 'EE', timezone: 'Europe/Tallinn', translations: { en: 'Estonia', fr: 'Estonie', nl: 'Estland', es: 'Estonia' } },
  { name: 'Luxembourg', code: 'LU', timezone: 'Europe/Luxembourg', translations: { en: 'Luxembourg', fr: 'Luxembourg', nl: 'Luxemburg', es: 'Luxemburgo' } },
  { name: 'Malta', code: 'MT', timezone: 'Europe/Malta', translations: { en: 'Malta', fr: 'Malte', nl: 'Malta', es: 'Malta' } },
  { name: 'Cyprus', code: 'CY', timezone: 'Asia/Nicosia', translations: { en: 'Cyprus', fr: 'Chypre', nl: 'Cyprus', es: 'Chipre' } },
  { name: 'Iceland', code: 'IS', timezone: 'Atlantic/Reykjavik', translations: { en: 'Iceland', fr: 'Islande', nl: 'IJsland', es: 'Islandia' } },
  { name: 'New Zealand', code: 'NZ', timezone: 'Pacific/Auckland', translations: { en: 'New Zealand', fr: 'Nouvelle-Zélande', nl: 'Nieuw-Zeeland', es: 'Nueva Zelanda' } },
  { name: 'Singapore', code: 'SG', timezone: 'Asia/Singapore', translations: { en: 'Singapore', fr: 'Singapour', nl: 'Singapore', es: 'Singapur' } },
  { name: 'Malaysia', code: 'MY', timezone: 'Asia/Kuala_Lumpur', translations: { en: 'Malaysia', fr: 'Malaisie', nl: 'Maleisië', es: 'Malasia' } },
  { name: 'Philippines', code: 'PH', timezone: 'Asia/Manila', translations: { en: 'Philippines', fr: 'Philippines', nl: 'Filipijnen', es: 'Filipinas' } },
  { name: 'Israel', code: 'IL', timezone: 'Asia/Jerusalem', translations: { en: 'Israel', fr: 'Israël', nl: 'Israël', es: 'Israel' } },
  { name: 'Jordan', code: 'JO', timezone: 'Asia/Amman', translations: { en: 'Jordan', fr: 'Jordanie', nl: 'Jordanië', es: 'Jordania' } },
  { name: 'Lebanon', code: 'LB', timezone: 'Asia/Beirut', translations: { en: 'Lebanon', fr: 'Liban', nl: 'Libanon', es: 'Líbano' } },
  { name: 'Eswatini', code: 'SZ', timezone: 'Africa/Mbabane', translations: { en: 'Eswatini', fr: 'Eswatini', nl: 'Eswatini', es: 'Esuatini' } }
]

module.exports = {
  up: async ({ context: queryInterface }) => {
    // Clear existing country translations first
    await queryInterface.bulkDelete('translations', { entity_type: 'country' }, {})
    // Clear ALL countries and restart fresh
    await queryInterface.bulkDelete('countries', null, {})
    
    let countryId = 1
    const translations = []
    
    for (const country of countries) {
      await queryInterface.bulkInsert('countries', [{
        id: countryId,
        name: country.name,
        code: country.code,
        timezone: country.timezone,
        created_at: new Date(),
        updated_at: new Date()
      }])
      
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