'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from './api';

export interface ReferenceDataState {
  clients: any[];
  brands: any[];
  products: any[];
  users: any[];
  equipment: any[];
  settings: any[];
  loading: boolean;
  refresh: () => Promise<void>;
}

// In-memory shared singleton state across components
let globalReferenceCache: {
  clients: any[];
  brands: any[];
  products: any[];
  users: any[];
  equipment: any[];
  settings: any[];
  loaded: boolean;
} = {
  clients: [],
  brands: [],
  products: [],
  users: [],
  equipment: [],
  settings: [],
  loaded: false,
};

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

export async function preloadReferenceData(force = false) {
  if (globalReferenceCache.loaded && !force) {
    return globalReferenceCache;
  }
  try {
    const [clientsRes, brandsRes, productsRes, usersRes, eqRes, settingsRes] = await Promise.all([
      fetchApi('/clients', { cacheTtlMs: 300000 }).catch(() => []),
      fetchApi('/brands', { cacheTtlMs: 300000 }).catch(() => []),
      fetchApi('/products', { cacheTtlMs: 300000 }).catch(() => []),
      fetchApi('/users', { cacheTtlMs: 300000 }).catch(() => []),
      fetchApi('/equipment', { cacheTtlMs: 300000 }).catch(() => []),
      fetchApi('/settings', { cacheTtlMs: 300000 }).catch(() => null),
    ]);

    globalReferenceCache = {
      clients: Array.isArray(clientsRes) ? clientsRes : [],
      brands: Array.isArray(brandsRes) ? brandsRes : [],
      products: Array.isArray(productsRes) ? productsRes : [],
      users: Array.isArray(usersRes) ? usersRes : [],
      equipment: Array.isArray(eqRes) ? eqRes : [],
      settings: settingsRes?.settings || [],
      loaded: true,
    };
    notifyListeners();
  } catch (err) {
    console.error('Failed to preload reference data:', err);
  }
  return globalReferenceCache;
}

export function useReferenceData() {
  const [state, setState] = useState(() => ({
    clients: globalReferenceCache.clients,
    brands: globalReferenceCache.brands,
    products: globalReferenceCache.products,
    users: globalReferenceCache.users,
    equipment: globalReferenceCache.equipment,
    settings: globalReferenceCache.settings,
    loading: !globalReferenceCache.loaded,
  }));

  useEffect(() => {
    const update = () => {
      setState({
        clients: globalReferenceCache.clients,
        brands: globalReferenceCache.brands,
        products: globalReferenceCache.products,
        users: globalReferenceCache.users,
        equipment: globalReferenceCache.equipment,
        settings: globalReferenceCache.settings,
        loading: !globalReferenceCache.loaded,
      });
    };

    listeners.add(update);

    if (!globalReferenceCache.loaded) {
      preloadReferenceData();
    }

    return () => {
      listeners.delete(update);
    };
  }, []);

  const refresh = useCallback(async () => {
    await preloadReferenceData(true);
  }, []);

  return {
    ...state,
    refresh,
  };
}
