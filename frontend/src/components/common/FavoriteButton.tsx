'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { useFavorites, FavoriteEntityType } from '@/lib/favorites-context';

export interface FavoriteButtonProps {
  entityType: FavoriteEntityType;
  entityId: string;
  title: string;
  code?: string;
  url: string;
  metadata?: Record<string, any> | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({
  entityType,
  entityId,
  title,
  code,
  url,
  metadata,
  size = 'md',
  className = '',
  showLabel = false,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [animating, setAnimating] = useState(false);

  const favorited = isFavorite(entityType, entityId);

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const buttonPaddings = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setAnimating(true);
    setTimeout(() => setAnimating(false), 350);

    await toggleFavorite({
      entityType,
      entityId,
      title,
      code,
      url,
      metadata,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={favorited ? 'Remove from favourites' : 'Add to favourites'}
      title={favorited ? 'Remove from favourites' : 'Add to favourites'}
      className={`inline-flex items-center gap-1.5 rounded-lg transition-all select-none ${buttonPaddings[size]} ${
        favorited
          ? 'text-amber-500 hover:text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 shadow-xs'
          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 border border-transparent'
      } ${className}`}
    >
      <Star
        className={`${iconSizes[size]} transition-all ${
          animating ? 'scale-125 rotate-12' : ''
        } ${
          favorited
            ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
            : 'text-slate-400 hover:text-amber-500'
        }`}
      />
      {showLabel && (
        <span className="text-[11px] font-semibold">
          {favorited ? 'Favourited' : 'Favourite'}
        </span>
      )}
    </button>
  );
}
