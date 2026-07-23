import api from './auth'

export interface AppFeatures {
  aiEnabled: boolean
}

export const fetchAppFeatures = async (): Promise<AppFeatures> => {
  const response = await api.get('/health')
  return { aiEnabled: response.data.features?.ai === true }
}
