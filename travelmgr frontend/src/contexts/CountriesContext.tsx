import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Country } from '../types';
import { getCountries } from '../services/trips';

interface CountriesContextType {
  countries: Country[];
  isLoading: boolean;
}

const CountriesContext = createContext<CountriesContextType | undefined>(undefined);

export const useCountries = () => {
  const context = useContext(CountriesContext);
  if (context === undefined) {
    throw new Error('useCountries must be used within a CountriesProvider');
  }
  return context;
};

interface CountriesProviderProps {
  children: ReactNode;
}

export const CountriesProvider: React.FC<CountriesProviderProps> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const data = await getCountries('en');
        setCountries(data);
      } catch (error) {
        console.error('Failed to load countries:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCountries();
  }, []);

  const value = useMemo(() => ({ countries, isLoading }), [countries, isLoading]);

  return (
    <CountriesContext.Provider value={value}>
      {children}
    </CountriesContext.Provider>
  );
};