/** Public health URL: same-origin via nginx (:8080) avoids CORS; otherwise use configured API base. */
const resolveHealthUrl = (): string => {
  if (typeof window !== 'undefined') {
    const { origin, port } = window.location
    if (port === '8080') {
      return `${origin}/api/health`
    }
  }
  const base = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api').replace(/\/$/, '')
  return `${base}/health`
}

export interface AppFeatures {
  aiEnabled: boolean
}

export const fetchAppFeatures = async (): Promise<AppFeatures> => {
  const response = await fetch(resolveHealthUrl())
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`)
  }
  const data = await response.json()
  const ai = data?.features?.ai
  return { aiEnabled: ai === true || ai === 'true' }
}
