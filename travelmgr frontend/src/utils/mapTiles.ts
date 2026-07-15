export interface MapTileConfig {
  url: string
  attribution: string
}

/** Tile layers with localized labels where available; fallback to standard OSM (English/international). */
export const getMapTileConfig = (language: string): MapTileConfig => {
  if (language === 'fr') {
    return {
      url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors — rendu OSM France',
    }
  }

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }
}

export const transportModeTranslationKey = (mode?: string | null): string | null => {
  if (!mode) return null
  const map: Record<string, string> = {
    flight: 'transport_mode_flight',
    train: 'transport_mode_train',
    car: 'transport_mode_car',
    bus: 'transport_mode_bus',
    local: 'transport_mode_local',
    default: 'transport_mode_default',
  }
  return map[mode] || map.default
}
