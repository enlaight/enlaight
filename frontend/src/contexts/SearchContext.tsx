import React, { createContext, useContext, useState, useCallback } from 'react';

interface SearchContextType {
  triggerSearchFocus: () => void;
  onSearchFocusRequest: (callback: () => void) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [focusCallback, setFocusCallback] = useState<(() => void) | null>(null);

  const triggerSearchFocus = useCallback(() => {
    if (focusCallback) {
      focusCallback();
    }
  }, [focusCallback]);

  const onSearchFocusRequest = useCallback((callback: () => void) => {
    setFocusCallback(() => callback);
  }, []);

  return (
    <SearchContext.Provider value={{ triggerSearchFocus, onSearchFocusRequest }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
