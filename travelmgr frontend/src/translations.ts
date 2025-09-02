// Simple translation system for error messages
export const translations = {
  fr: {
    'trip_name_exists': 'Un voyage avec ce nom existe déjà. Veuillez choisir un autre nom.',
    'trip_save_error': 'Une erreur est survenue lors de la sauvegarde du voyage.',
    'import_failed': 'L\'importation a échoué'
  },
  en: {
    'trip_name_exists': 'A trip with this name already exists. Please choose another name.',
    'trip_save_error': 'An error occurred while saving the trip.',
    'import_failed': 'Import failed'
  },
  es: {
    'trip_name_exists': 'Ya existe un viaje con este nombre. Por favor, elija otro nombre.',
    'trip_save_error': 'Se produjo un error al guardar el viaje.',
    'import_failed': 'La importación falló'
  }
};

export const getTranslation = (key: string, lang: string = 'fr'): string => {
  return translations[lang as keyof typeof translations]?.[key as keyof typeof translations.fr] || 
         translations.fr[key as keyof typeof translations.fr] || 
         key;
};