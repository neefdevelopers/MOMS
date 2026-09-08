'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from './api';
import { useAuth } from './auth-context';

export type FavoriteEntityType =
  | 'PROJECT'
  | 'SCRIPT'
  | 'GRAPHIC_REQUIREMENT'
  | 'TASK'
  | 'CALENDAR_EVENT'
  | 'CLIENT'
  | 'BRAND'
  | 'PRODUCT'
  | 'REPORT';

export interface FavoriteRecord {
  id: string;
  userId: string;
  entityType: FavoriteEntityType;
  entityId: string;
  title: string;
  code?: string | null;
  url: string;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ToggleFavoritePayload {
  entityType: FavoriteEntityType;
  entityId: string;
  title: string;
  code?: string;
  url: string;
  metadata?: Record<string, any> | string;
}

interface FavoritesContextType {
  favorites: FavoriteRecord[];
  loading: boolean;
  isFavorite: (entityType: FavoriteEntityType, entityId: string) => boolean;
  toggleFavorite: (payload: ToggleFavoritePayload) => Promise<boolean>;
  removeFavorite: (id: string) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  loading: true,
  isFavorite: () => false,
  toggleFavorite: async () => false,
  removeFavorite: async () => {},
  refreshFavorites: async () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchApi('/favorites');
      setFavorites(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load user favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Listen to window-level sync event
  useEffect(() => {
    const handleSync = () => {
      loadFavorites();
    };
    window.addEventListener('moms:favorites-updated', handleSync);
    return () => window.removeEventListener('moms:favorites-updated', handleSync);
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (entityType: FavoriteEntityType, entityId: string) => {
      return favorites.some(
        (f) => f.entityType === entityType && f.entityId === entityId
      );
    },
    [favorites]
  );

  const toggleFavorite = async (payload: ToggleFavoritePayload): Promise<boolean> => {
    const currentlyFav = isFavorite(payload.entityType, payload.entityId);

    // Optimistic UI Update
    if (currentlyFav) {
      setFavorites((prev) =>
        prev.filter(
          (f) =>
            !(f.entityType === payload.entityType && f.entityId === payload.entityId)
        )
      );
    } else {
      const tempFav: FavoriteRecord = {
        id: `temp-${Date.now()}`,
        userId: user?.id || '',
        entityType: payload.entityType,
        entityId: payload.entityId,
        title: payload.title,
        code: payload.code || null,
        url: payload.url,
        metadata:
          typeof payload.metadata === 'object'
            ? JSON.stringify(payload.metadata)
            : payload.metadata || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setFavorites((prev) => [tempFav, ...prev]);
    }

    try {
      const res = await fetchApi('/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      window.dispatchEvent(new CustomEvent('moms:favorites-updated'));
      loadFavorites();
      return res?.favorited ?? !currentlyFav;
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
      loadFavorites();
      return currentlyFav;
    }
  };

  const removeFavorite = async (id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    try {
      await fetchApi(`/favorites/${id}`, { method: 'DELETE' });
      window.dispatchEvent(new CustomEvent('moms:favorites-updated'));
    } catch (err) {
      console.error('Failed to remove favorite:', err);
      loadFavorites();
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        loading,
        isFavorite,
        toggleFavorite,
        removeFavorite,
        refreshFavorites: loadFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
