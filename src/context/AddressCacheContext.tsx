import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { AddressCache } from '@/utils/addressCache';

interface AddressCacheContextType {
  cache: AddressCache;
}

const AddressCacheContext = createContext<AddressCacheContextType | null>(null);

export const AddressCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cache = useMemo(() => new AddressCache(), []);
  
  // Cleanup cache on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      console.log('[AddressCacheProvider] Cleaning up cache on unmount');
      cache.clear();
    };
  }, [cache]);

  const value = useMemo(() => ({ cache }), [cache]);

  return (
    <AddressCacheContext.Provider value={value}>
      {children}
    </AddressCacheContext.Provider>
  );
};

export const useAddressCache = (): AddressCache => {
  const context = useContext(AddressCacheContext);
  if (!context) {
    throw new Error('useAddressCache must be used within an AddressCacheProvider');
  }
  return context.cache;
};