const { DataTypes } = require('sequelize')

const allCountries = [
  { name: 'Afghanistan', code: 'AF', translations: { en: 'Afghanistan', fr: 'Afghanistan', nl: 'Afghanistan', es: 'Afganistán' } },
  { name: 'Albania', code: 'AL', translations: { en: 'Albania', fr: 'Albanie', nl: 'Albanië', es: 'Albania' } },
  { name: 'Algeria', code: 'DZ', translations: { en: 'Algeria', fr: 'Algérie', nl: 'Algerije', es: 'Argelia' } },
  { name: 'Andorra', code: 'AD', translations: { en: 'Andorra', fr: 'Andorre', nl: 'Andorra', es: 'Andorra' } },
  { name: 'Angola', code: 'AO', translations: { en: 'Angola', fr: 'Angola', nl: 'Angola', es: 'Angola' } },
  { name: 'Antigua and Barbuda', code: 'AG', translations: { en: 'Antigua and Barbuda', fr: 'Antigua-et-Barbuda', nl: 'Antigua en Barbuda', es: 'Antigua y Barbuda' } },
  { name: 'Argentina', code: 'AR', translations: { en: 'Argentina', fr: 'Argentine', nl: 'Argentinië', es: 'Argentina' } },
  { name: 'Armenia', code: 'AM', translations: { en: 'Armenia', fr: 'Arménie', nl: 'Armenië', es: 'Armenia' } },
  { name: 'Australia', code: 'AU', translations: { en: 'Australia', fr: 'Australie', nl: 'Australië', es: 'Australia' } },
  { name: 'Azerbaijan', code: 'AZ', translations: { en: 'Azerbaijan', fr: 'Azerbaïdjan', nl: 'Azerbeidzjan', es: 'Azerbaiyán' } },
  { name: 'Bahamas', code: 'BS', translations: { en: 'Bahamas', fr: 'Bahamas', nl: 'Bahama\'s', es: 'Bahamas' } },
  { name: 'Bahrain', code: 'BH', translations: { en: 'Bahrain', fr: 'Bahreïn', nl: 'Bahrein', es: 'Baréin' } },
  { name: 'Bangladesh', code: 'BD', translations: { en: 'Bangladesh', fr: 'Bangladesh', nl: 'Bangladesh', es: 'Bangladés' } },
  { name: 'Barbados', code: 'BB', translations: { en: 'Barbados', fr: 'Barbade', nl: 'Barbados', es: 'Barbados' } },
  { name: 'Belarus', code: 'BY', translations: { en: 'Belarus', fr: 'Biélorussie', nl: 'Wit-Rusland', es: 'Bielorrusia' } },
  { name: 'Belize', code: 'BZ', translations: { en: 'Belize', fr: 'Belize', nl: 'Belize', es: 'Belice' } },
  { name: 'Benin', code: 'BJ', translations: { en: 'Benin', fr: 'Bénin', nl: 'Benin', es: 'Benín' } },
  { name: 'Bhutan', code: 'BT', translations: { en: 'Bhutan', fr: 'Bhoutan', nl: 'Bhutan', es: 'Bután' } },
  { name: 'Bolivia', code: 'BO', translations: { en: 'Bolivia', fr: 'Bolivie', nl: 'Bolivia', es: 'Bolivia' } },
  { name: 'Bosnia and Herzegovina', code: 'BA', translations: { en: 'Bosnia and Herzegovina', fr: 'Bosnie-Herzégovine', nl: 'Bosnië en Herzegovina', es: 'Bosnia y Herzegovina' } },
  { name: 'Botswana', code: 'BW', translations: { en: 'Botswana', fr: 'Botswana', nl: 'Botswana', es: 'Botsuana' } },
  { name: 'Brazil', code: 'BR', translations: { en: 'Brazil', fr: 'Brésil', nl: 'Brazilië', es: 'Brasil' } },
  { name: 'Brunei', code: 'BN', translations: { en: 'Brunei', fr: 'Brunei', nl: 'Brunei', es: 'Brunéi' } },
  { name: 'Burkina Faso', code: 'BF', translations: { en: 'Burkina Faso', fr: 'Burkina Faso', nl: 'Burkina Faso', es: 'Burkina Faso' } },
  { name: 'Burundi', code: 'BI', translations: { en: 'Burundi', fr: 'Burundi', nl: 'Burundi', es: 'Burundi' } },
  { name: 'Cambodia', code: 'KH', translations: { en: 'Cambodia', fr: 'Cambodge', nl: 'Cambodja', es: 'Camboya' } },
  { name: 'Cameroon', code: 'CM', translations: { en: 'Cameroon', fr: 'Cameroun', nl: 'Kameroen', es: 'Camerún' } },
  { name: 'Canada', code: 'CA', translations: { en: 'Canada', fr: 'Canada', nl: 'Canada', es: 'Canadá' } },
  { name: 'Cape Verde', code: 'CV', translations: { en: 'Cape Verde', fr: 'Cap-Vert', nl: 'Kaapverdië', es: 'Cabo Verde' } },
  { name: 'Chile', code: 'CL', translations: { en: 'Chile', fr: 'Chili', nl: 'Chili', es: 'Chile' } },
  { name: 'China', code: 'CN', translations: { en: 'China', fr: 'Chine', nl: 'China', es: 'China' } },
  { name: 'Colombia', code: 'CO', translations: { en: 'Colombia', fr: 'Colombie', nl: 'Colombia', es: 'Colombia' } },
  { name: 'Comoros', code: 'KM', translations: { en: 'Comoros', fr: 'Comores', nl: 'Comoren', es: 'Comoras' } },
  { name: 'Costa Rica', code: 'CR', translations: { en: 'Costa Rica', fr: 'Costa Rica', nl: 'Costa Rica', es: 'Costa Rica' } },
  { name: 'Cuba', code: 'CU', translations: { en: 'Cuba', fr: 'Cuba', nl: 'Cuba', es: 'Cuba' } },
  { name: 'Djibouti', code: 'DJ', translations: { en: 'Djibouti', fr: 'Djibouti', nl: 'Djibouti', es: 'Yibuti' } },
  { name: 'Dominica', code: 'DM', translations: { en: 'Dominica', fr: 'Dominique', nl: 'Dominica', es: 'Dominica' } },
  { name: 'Dominican Republic', code: 'DO', translations: { en: 'Dominican Republic', fr: 'République Dominicaine', nl: 'Dominicaanse Republiek', es: 'República Dominicana' } },
  { name: 'Ecuador', code: 'EC', translations: { en: 'Ecuador', fr: 'Équateur', nl: 'Ecuador', es: 'Ecuador' } },
  { name: 'Egypt', code: 'EG', translations: { en: 'Egypt', fr: 'Égypte', nl: 'Egypte', es: 'Egipto' } },
  { name: 'El Salvador', code: 'SV', translations: { en: 'El Salvador', fr: 'Salvador', nl: 'El Salvador', es: 'El Salvador' } },
  { name: 'Eritrea', code: 'ER', translations: { en: 'Eritrea', fr: 'Érythrée', nl: 'Eritrea', es: 'Eritrea' } },
  { name: 'Eswatini', code: 'SZ', translations: { en: 'Eswatini', fr: 'Eswatini', nl: 'Eswatini', es: 'Esuatini' } },
  { name: 'Ethiopia', code: 'ET', translations: { en: 'Ethiopia', fr: 'Éthiopie', nl: 'Ethiopië', es: 'Etiopía' } },
  { name: 'Fiji', code: 'FJ', translations: { en: 'Fiji', fr: 'Fidji', nl: 'Fiji', es: 'Fiyi' } },
  { name: 'Gabon', code: 'GA', translations: { en: 'Gabon', fr: 'Gabon', nl: 'Gabon', es: 'Gabón' } },
  { name: 'Gambia', code: 'GM', translations: { en: 'Gambia', fr: 'Gambie', nl: 'Gambia', es: 'Gambia' } },
  { name: 'Georgia', code: 'GE', translations: { en: 'Georgia', fr: 'Géorgie', nl: 'Georgië', es: 'Georgia' } },
  { name: 'Ghana', code: 'GH', translations: { en: 'Ghana', fr: 'Ghana', nl: 'Ghana', es: 'Ghana' } },
  { name: 'Grenada', code: 'GD', translations: { en: 'Grenada', fr: 'Grenade', nl: 'Grenada', es: 'Granada' } },
  { name: 'Guatemala', code: 'GT', translations: { en: 'Guatemala', fr: 'Guatemala', nl: 'Guatemala', es: 'Guatemala' } },
  { name: 'Guinea', code: 'GN', translations: { en: 'Guinea', fr: 'Guinée', nl: 'Guinee', es: 'Guinea' } },
  { name: 'Guinea-Bissau', code: 'GW', translations: { en: 'Guinea-Bissau', fr: 'Guinée-Bissau', nl: 'Guinee-Bissau', es: 'Guinea-Bisáu' } },
  { name: 'Guyana', code: 'GY', translations: { en: 'Guyana', fr: 'Guyana', nl: 'Guyana', es: 'Guyana' } },
  { name: 'Haiti', code: 'HT', translations: { en: 'Haiti', fr: 'Haïti', nl: 'Haïti', es: 'Haití' } },
  { name: 'Honduras', code: 'HN', translations: { en: 'Honduras', fr: 'Honduras', nl: 'Honduras', es: 'Honduras' } },
  { name: 'Iraq', code: 'IQ', translations: { en: 'Iraq', fr: 'Irak', nl: 'Irak', es: 'Irak' } },
  { name: 'Iran', code: 'IR', translations: { en: 'Iran', fr: 'Iran', nl: 'Iran', es: 'Irán' } },
  { name: 'Jamaica', code: 'JM', translations: { en: 'Jamaica', fr: 'Jamaïque', nl: 'Jamaica', es: 'Jamaica' } },
  { name: 'Kazakhstan', code: 'KZ', translations: { en: 'Kazakhstan', fr: 'Kazakhstan', nl: 'Kazachstan', es: 'Kazajistán' } },
  { name: 'Kenya', code: 'KE', translations: { en: 'Kenya', fr: 'Kenya', nl: 'Kenia', es: 'Kenia' } },
  { name: 'Kyrgyzstan', code: 'KG', translations: { en: 'Kyrgyzstan', fr: 'Kirghizistan', nl: 'Kirgizië', es: 'Kirguistán' } },
  { name: 'Kuwait', code: 'KW', translations: { en: 'Kuwait', fr: 'Koweït', nl: 'Koeweit', es: 'Kuwait' } },
  { name: 'Laos', code: 'LA', translations: { en: 'Laos', fr: 'Laos', nl: 'Laos', es: 'Laos' } },
  { name: 'Lesotho', code: 'LS', translations: { en: 'Lesotho', fr: 'Lesotho', nl: 'Lesotho', es: 'Lesoto' } },
  { name: 'Liberia', code: 'LR', translations: { en: 'Liberia', fr: 'Liberia', nl: 'Liberia', es: 'Liberia' } },
  { name: 'Libya', code: 'LY', translations: { en: 'Libya', fr: 'Libye', nl: 'Libië', es: 'Libia' } },
  { name: 'Liechtenstein', code: 'LI', translations: { en: 'Liechtenstein', fr: 'Liechtenstein', nl: 'Liechtenstein', es: 'Liechtenstein' } },
  { name: 'Madagascar', code: 'MG', translations: { en: 'Madagascar', fr: 'Madagascar', nl: 'Madagaskar', es: 'Madagascar' } },
  { name: 'Malawi', code: 'MW', translations: { en: 'Malawi', fr: 'Malawi', nl: 'Malawi', es: 'Malaui' } },
  { name: 'Maldives', code: 'MV', translations: { en: 'Maldives', fr: 'Maldives', nl: 'Maldiven', es: 'Maldivas' } },
  { name: 'Mali', code: 'ML', translations: { en: 'Mali', fr: 'Mali', nl: 'Mali', es: 'Malí' } },
  { name: 'Marshall Islands', code: 'MH', translations: { en: 'Marshall Islands', fr: 'Îles Marshall', nl: 'Marshalleilanden', es: 'Islas Marshall' } },
  { name: 'Mauritania', code: 'MR', translations: { en: 'Mauritania', fr: 'Mauritanie', nl: 'Mauritanië', es: 'Mauritania' } },
  { name: 'Mauritius', code: 'MU', translations: { en: 'Mauritius', fr: 'Maurice', nl: 'Mauritius', es: 'Mauricio' } },
  { name: 'Micronesia', code: 'FM', translations: { en: 'Micronesia', fr: 'Micronésie', nl: 'Micronesië', es: 'Micronesia' } },
  { name: 'Moldova', code: 'MD', translations: { en: 'Moldova', fr: 'Moldavie', nl: 'Moldavië', es: 'Moldavia' } },
  { name: 'Monaco', code: 'MC', translations: { en: 'Monaco', fr: 'Monaco', nl: 'Monaco', es: 'Mónaco' } },
  { name: 'Mongolia', code: 'MN', translations: { en: 'Mongolia', fr: 'Mongolie', nl: 'Mongolië', es: 'Mongolia' } },
  { name: 'Montenegro', code: 'ME', translations: { en: 'Montenegro', fr: 'Monténégro', nl: 'Montenegro', es: 'Montenegro' } },
  { name: 'Mozambique', code: 'MZ', translations: { en: 'Mozambique', fr: 'Mozambique', nl: 'Mozambique', es: 'Mozambique' } },
  { name: 'Myanmar', code: 'MM', translations: { en: 'Myanmar', fr: 'Birmanie', nl: 'Myanmar', es: 'Birmania' } },
  { name: 'Namibia', code: 'NA', translations: { en: 'Namibia', fr: 'Namibie', nl: 'Namibië', es: 'Namibia' } },
  { name: 'Nauru', code: 'NR', translations: { en: 'Nauru', fr: 'Nauru', nl: 'Nauru', es: 'Nauru' } },
  { name: 'Nepal', code: 'NP', translations: { en: 'Nepal', fr: 'Népal', nl: 'Nepal', es: 'Nepal' } },
  { name: 'Nicaragua', code: 'NI', translations: { en: 'Nicaragua', fr: 'Nicaragua', nl: 'Nicaragua', es: 'Nicaragua' } },
  { name: 'Niger', code: 'NE', translations: { en: 'Niger', fr: 'Niger', nl: 'Niger', es: 'Níger' } },
  { name: 'Nigeria', code: 'NG', translations: { en: 'Nigeria', fr: 'Nigeria', nl: 'Nigeria', es: 'Nigeria' } },
  { name: 'North Korea', code: 'KP', translations: { en: 'North Korea', fr: 'Corée du Nord', nl: 'Noord-Korea', es: 'Corea del Norte' } },
  { name: 'North Macedonia', code: 'MK', translations: { en: 'North Macedonia', fr: 'Macédoine', nl: 'Noord-Macedonië', es: 'Macedonia del Norte' } },
  { name: 'Oman', code: 'OM', translations: { en: 'Oman', fr: 'Oman', nl: 'Oman', es: 'Omán' } },
  { name: 'Pakistan', code: 'PK', translations: { en: 'Pakistan', fr: 'Pakistan', nl: 'Pakistan', es: 'Pakistán' } },
  { name: 'Palau', code: 'PW', translations: { en: 'Palau', fr: 'Palaos', nl: 'Palau', es: 'Palaos' } },
  { name: 'Panama', code: 'PA', translations: { en: 'Panama', fr: 'Panama', nl: 'Panama', es: 'Panamá' } },
  { name: 'Papua New Guinea', code: 'PG', translations: { en: 'Papua New Guinea', fr: 'Papouasie-Nouvelle-Guinée', nl: 'Papoea-Nieuw-Guinea', es: 'Papúa Nueva Guinea' } },
  { name: 'Paraguay', code: 'PY', translations: { en: 'Paraguay', fr: 'Paraguay', nl: 'Paraguay', es: 'Paraguay' } },
  { name: 'Peru', code: 'PE', translations: { en: 'Peru', fr: 'Pérou', nl: 'Peru', es: 'Perú' } },
  { name: 'Qatar', code: 'QA', translations: { en: 'Qatar', fr: 'Qatar', nl: 'Qatar', es: 'Catar' } },
  { name: 'Rwanda', code: 'RW', translations: { en: 'Rwanda', fr: 'Rwanda', nl: 'Rwanda', es: 'Ruanda' } },
  { name: 'Saint Kitts and Nevis', code: 'KN', translations: { en: 'Saint Kitts and Nevis', fr: 'Saint-Kitts-et-Nevis', nl: 'Saint Kitts en Nevis', es: 'San Cristóbal y Nieves' } },
  { name: 'Saint Lucia', code: 'LC', translations: { en: 'Saint Lucia', fr: 'Sainte-Lucie', nl: 'Saint Lucia', es: 'Santa Lucía' } },
  { name: 'Saint Vincent and the Grenadines', code: 'VC', translations: { en: 'Saint Vincent and the Grenadines', fr: 'Saint-Vincent-et-les-Grenadines', nl: 'Saint Vincent en de Grenadines', es: 'San Vicente y las Granadinas' } },
  { name: 'Samoa', code: 'WS', translations: { en: 'Samoa', fr: 'Samoa', nl: 'Samoa', es: 'Samoa' } },
  { name: 'San Marino', code: 'SM', translations: { en: 'San Marino', fr: 'Saint-Marin', nl: 'San Marino', es: 'San Marino' } },
  { name: 'Saudi Arabia', code: 'SA', translations: { en: 'Saudi Arabia', fr: 'Arabie Saoudite', nl: 'Saoedi-Arabië', es: 'Arabia Saudí' } },
  { name: 'Senegal', code: 'SN', translations: { en: 'Senegal', fr: 'Sénégal', nl: 'Senegal', es: 'Senegal' } },
  { name: 'Serbia', code: 'RS', translations: { en: 'Serbia', fr: 'Serbie', nl: 'Servië', es: 'Serbia' } },
  { name: 'Seychelles', code: 'SC', translations: { en: 'Seychelles', fr: 'Seychelles', nl: 'Seychellen', es: 'Seychelles' } },
  { name: 'Sierra Leone', code: 'SL', translations: { en: 'Sierra Leone', fr: 'Sierra Leone', nl: 'Sierra Leone', es: 'Sierra Leona' } },
  { name: 'Solomon Islands', code: 'SB', translations: { en: 'Solomon Islands', fr: 'Salomon', nl: 'Salomonseilanden', es: 'Islas Salomón' } },
  { name: 'Somalia', code: 'SO', translations: { en: 'Somalia', fr: 'Somalie', nl: 'Somalië', es: 'Somalia' } },
  { name: 'South Sudan', code: 'SS', translations: { en: 'South Sudan', fr: 'Soudan du Sud', nl: 'Zuid-Soedan', es: 'Sudán del Sur' } },
  { name: 'Sri Lanka', code: 'LK', translations: { en: 'Sri Lanka', fr: 'Sri Lanka', nl: 'Sri Lanka', es: 'Sri Lanka' } },
  { name: 'Sudan', code: 'SD', translations: { en: 'Sudan', fr: 'Soudan', nl: 'Soedan', es: 'Sudán' } },
  { name: 'Suriname', code: 'SR', translations: { en: 'Suriname', fr: 'Suriname', nl: 'Suriname', es: 'Surinam' } },
  { name: 'Syria', code: 'SY', translations: { en: 'Syria', fr: 'Syrie', nl: 'Syrië', es: 'Siria' } },
  { name: 'Tajikistan', code: 'TJ', translations: { en: 'Tajikistan', fr: 'Tadjikistan', nl: 'Tadzjikistan', es: 'Tayikistán' } },
  { name: 'Tanzania', code: 'TZ', translations: { en: 'Tanzania', fr: 'Tanzanie', nl: 'Tanzania', es: 'Tanzania' } },
  { name: 'Chad', code: 'TD', translations: { en: 'Chad', fr: 'Tchad', nl: 'Tsjaad', es: 'Chad' } },
  { name: 'East Timor', code: 'TL', translations: { en: 'East Timor', fr: 'Timor oriental', nl: 'Oost-Timor', es: 'Timor Oriental' } },
  { name: 'Togo', code: 'TG', translations: { en: 'Togo', fr: 'Togo', nl: 'Togo', es: 'Togo' } },
  { name: 'Tonga', code: 'TO', translations: { en: 'Tonga', fr: 'Tonga', nl: 'Tonga', es: 'Tonga' } },
  { name: 'Trinidad and Tobago', code: 'TT', translations: { en: 'Trinidad and Tobago', fr: 'Trinité-et-Tobago', nl: 'Trinidad en Tobago', es: 'Trinidad y Tobago' } },
  { name: 'Tunisia', code: 'TN', translations: { en: 'Tunisia', fr: 'Tunisie', nl: 'Tunesië', es: 'Túnez' } },
  { name: 'Turkmenistan', code: 'TM', translations: { en: 'Turkmenistan', fr: 'Turkménistan', nl: 'Turkmenistan', es: 'Turkmenistán' } },
  { name: 'Tuvalu', code: 'TV', translations: { en: 'Tuvalu', fr: 'Tuvalu', nl: 'Tuvalu', es: 'Tuvalu' } },
  { name: 'Uganda', code: 'UG', translations: { en: 'Uganda', fr: 'Ouganda', nl: 'Oeganda', es: 'Uganda' } },
  { name: 'United Arab Emirates', code: 'AE', translations: { en: 'United Arab Emirates', fr: 'Émirats arabes unis', nl: 'Verenigde Arabische Emiraten', es: 'Emiratos Árabes Unidos' } },
  { name: 'Uruguay', code: 'UY', translations: { en: 'Uruguay', fr: 'Uruguay', nl: 'Uruguay', es: 'Uruguay' } },
  { name: 'Uzbekistan', code: 'UZ', translations: { en: 'Uzbekistan', fr: 'Ouzbékistan', nl: 'Oezbekistan', es: 'Uzbekistán' } },
  { name: 'Vanuatu', code: 'VU', translations: { en: 'Vanuatu', fr: 'Vanuatu', nl: 'Vanuatu', es: 'Vanuatu' } },
  { name: 'Vatican City', code: 'VA', translations: { en: 'Vatican City', fr: 'Vatican', nl: 'Vaticaanstad', es: 'Ciudad del Vaticano' } },
  { name: 'Venezuela', code: 'VE', translations: { en: 'Venezuela', fr: 'Venezuela', nl: 'Venezuela', es: 'Venezuela' } },
  { name: 'Vietnam', code: 'VN', translations: { en: 'Vietnam', fr: 'Viêt Nam', nl: 'Vietnam', es: 'Vietnam' } },
  { name: 'Yemen', code: 'YE', translations: { en: 'Yemen', fr: 'Yémen', nl: 'Jemen', es: 'Yemen' } },
  { name: 'Zambia', code: 'ZM', translations: { en: 'Zambia', fr: 'Zambie', nl: 'Zambia', es: 'Zambia' } },
  { name: 'Zimbabwe', code: 'ZW', translations: { en: 'Zimbabwe', fr: 'Zimbabwe', nl: 'Zimbabwe', es: 'Zimbabue' } }
]

module.exports = {
  up: async ({ context: queryInterface }) => {
    // Get existing countries to avoid duplicates
    const existingCountries = await queryInterface.sequelize.query(
      'SELECT code FROM countries',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    const existingCodes = existingCountries.map(c => c.code)
    
    // Get next available ID
    const maxId = await queryInterface.sequelize.query(
      'SELECT COALESCE(MAX(id), 0) as max_id FROM countries',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    let countryId = maxId[0].max_id + 1
    
    const translations = []
    
    for (const country of allCountries) {
      if (!existingCodes.includes(country.code)) {
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
    }
    
    if (translations.length > 0) {
      await queryInterface.bulkInsert('translations', translations)
    }
  },

  down: async ({ context: queryInterface }) => {
    // Remove added countries and their translations
    const countriesToRemove = allCountries.map(c => c.code)
    await queryInterface.bulkDelete('translations', { 
      entity_type: 'country',
      entity_id: { 
        [require('sequelize').Op.in]: 
          queryInterface.sequelize.literal(`(SELECT id FROM countries WHERE code IN ('${countriesToRemove.join("','")}'))`)
      }
    }, {})
    await queryInterface.bulkDelete('countries', { code: { [require('sequelize').Op.in]: countriesToRemove } }, {})
  }
}