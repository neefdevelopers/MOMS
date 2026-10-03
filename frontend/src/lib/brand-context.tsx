'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from './api';
import { useAuth } from './auth-context';

export interface BrandEntity {
  id: string;
  name: string;
  shortCode: string;
  clientId: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  status: string;
  client?: {
    id: string;
    name: string;
    companyName: string;
  };
}

interface BrandContextType {
  brands: BrandEntity[];
  activeBrandId: string | null;
  activeBrand: BrandEntity | null;
  isLoading: boolean;
  setActiveBrandId: (brandId: string | null) => void;
  refreshBrands: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType>({
  brands: [],
  activeBrandId: null,
  activeBrand: null,
  isLoading: false,
  setActiveBrandId: () => {},
  refreshBrands: async () => {},
});

const STORAGE_KEY = 'moms_active_brand_id';

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BrandEntity[]>([]);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedUserStr = localStorage.getItem('moms_user');
        const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        if (savedUser?.role === 'MARKETING_MANAGER') {
          const stored = localStorage.getItem(STORAGE_KEY);
          return stored && stored !== 'ALL' && stored.trim() !== '' ? stored.trim() : null;
        }
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const refreshBrands = useCallback(async () => {
    if (!user) {
      setBrands([]);
      setActiveBrandIdState(null);
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetchApi('/brands');
      const brandList = Array.isArray(res) ? res : [];
      setBrands(brandList);

      // Check stored preference (Only active for MARKETING_MANAGER)
      if (user.role === 'MARKETING_MANAGER') {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        if (stored && stored !== 'ALL' && stored.trim() !== '') {
          const cleanStored = stored.trim();
          const exists = brandList.find((b: BrandEntity) => b.id === cleanStored);
          if (exists) {
            setActiveBrandIdState((prev) => (prev === cleanStored ? prev : cleanStored));
          } else {
            // Brand in localStorage no longer exists in DB; clear it to avoid filtering out all data
            if (typeof window !== 'undefined') {
              localStorage.removeItem(STORAGE_KEY);
            }
            setActiveBrandIdState(null);
          }
        } else {
          setActiveBrandIdState(null);
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY);
        }
        setActiveBrandIdState(null);
      }
    } catch (err) {
      console.error('Failed to load brands for BrandContext:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshBrands();
  }, [refreshBrands]);

  const setActiveBrandId = useCallback((id: string | null) => {
    const cleanId = id && id !== 'ALL' && id.trim() !== '' ? id.trim() : null;
    setActiveBrandIdState(cleanId);
    if (typeof window !== 'undefined') {
      if (cleanId) {
        localStorage.setItem(STORAGE_KEY, cleanId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const activeBrand = React.useMemo(() => {
    return activeBrandId ? brands.find((b) => b.id === activeBrandId) || null : null;
  }, [activeBrandId, brands]);

  const value = React.useMemo(
    () => ({
      brands,
      activeBrandId,
      activeBrand,
      isLoading,
      setActiveBrandId,
      refreshBrands,
    }),
    [brands, activeBrandId, activeBrand, isLoading, setActiveBrandId, refreshBrands]
  );

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
