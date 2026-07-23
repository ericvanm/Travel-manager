import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react'
import { fetchAppFeatures } from '../services/features'

interface FeaturesContextType {
  aiEnabled: boolean
  isLoading: boolean
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined)

export const useFeatures = () => {
  const context = useContext(FeaturesContext)
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeaturesProvider')
  }
  return context
}

interface FeaturesProviderProps {
  children: ReactNode
}

export const FeaturesProvider: React.FC<FeaturesProviderProps> = ({ children }) => {
  const [aiEnabled, setAiEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const features = await fetchAppFeatures()
        setAiEnabled(features.aiEnabled)
      } catch (error) {
        console.error('Failed to load app features:', error)
        setAiEnabled(false)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const value = useMemo(() => ({ aiEnabled, isLoading }), [aiEnabled, isLoading])

  return (
    <FeaturesContext.Provider value={value}>
      {children}
    </FeaturesContext.Provider>
  )
}
