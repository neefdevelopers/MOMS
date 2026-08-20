'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Star,
  Film,
  FileText,
  Palette,
  CheckSquare,
  BarChart3,
  ExternalLink,
  Trash2,
  Layers,
  X,
} from 'lucide-react';
import { useFavorites, FavoriteEntityType } from '@/lib/favorites-context';

const ENTITY_CONFIG: Record<
  FavoriteEntityType,
  { label: string; icon: React.ElementType; color: string; badgeBg: string }
> = {
  PROJECT: {
    label: 'Projects',
    icon: Film,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/50 text-blue-300 border-blue-800/50',
  },
  SCRIPT: {
    label: 'Scripts',
    icon: FileText,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/50 text-purple-300 border-purple-800/50',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Reqs',
    icon: Palette,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
  },
  TASK: {
    label: 'Tasks',
    icon: CheckSquare,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
  },
  REPORT: {
    label: 'Reports',
    icon: BarChart3,
    color: 'text-pink-400',
    badgeBg: 'bg-pink-950/50 text-pink-300 border-pink-800/50',
  },
};

export function FavoritesQuickMenu() {
  const { favorites, removeFavorite } = useFavorites();
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'ALL' | FavoriteEntityType>('ALL');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredFavorites =
    selectedTab === 'ALL'
      ? favorites
      : favorites.filter((f) => f.entityType === selectedTab);

  return (
    <div className="relative" ref={menuRef}>
      {/* Header Star Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition-all flex items-center justify-center ${
          open
            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            : favorites.length > 0
            ? 'text-amber-400 hover:bg-gray-800 border border-gray-800'
            : 'text-gray-400 hover:text-white hover:bg-gray-800 border border-transparent'
        }`}
        title="My Favorites (Projects, Scripts, Graphic Reqs, Tasks, Reports)"
      >
        <Star
          className={`w-4 h-4 ${
            favorites.length > 0
              ? 'fill-amber-400/30 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]'
              : ''
          }`}
        />
        {favorites.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-gray-950 font-extrabold text-[10px] flex items-center justify-center font-mono shadow">
            {favorites.length}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-2xl z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-border bg-gray-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
                <Star className="w-4 h-4 fill-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">My Starred Favorites</h3>
                <p className="text-[10px] text-gray-400">
                  Private shortcuts to frequently accessed records
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 p-2 bg-gray-950/60 border-b border-border overflow-x-auto text-[11px] scrollbar-none">
            <button
              onClick={() => setSelectedTab('ALL')}
              className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
                selectedTab === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              All ({favorites.length})
            </button>
            {(Object.keys(ENTITY_CONFIG) as FavoriteEntityType[]).map((type) => {
              const count = favorites.filter((f) => f.entityType === type).length;
              if (count === 0 && selectedTab !== type) return null;
              const config = ENTITY_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => setSelectedTab(type)}
                  className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors flex items-center gap-1 ${
                    selectedTab === type
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <span>{config.label}</span>
                  <span className="font-mono text-[9px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Favorites List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-800/60 p-1">
            {filteredFavorites.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-1.5">
                <Star className="w-8 h-8 text-gray-600 mx-auto stroke-1" />
                <p className="font-semibold text-gray-300">No favorites marked yet</p>
                <p className="text-[10px] text-gray-500">
                  Click the star icon ⭐ on Projects, Scripts, Graphic Reqs, Tasks, or Reports
                  to bookmark them here.
                </p>
              </div>
            ) : (
              filteredFavorites.map((fav) => {
                const config = ENTITY_CONFIG[fav.entityType] || {
                  label: fav.entityType,
                  icon: Layers,
                  color: 'text-gray-400',
                  badgeBg: 'bg-gray-800 text-gray-300 border-gray-700',
                };
                const Icon = config.icon;

                return (
                  <div
                    key={fav.id}
                    className="p-2.5 hover:bg-gray-900/80 rounded-lg flex items-center justify-between gap-3 group transition-colors"
                  >
                    <Link
                      href={fav.url}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 min-w-0 flex-1"
                    >
                      <div
                        className={`p-1.5 rounded-lg bg-gray-900 border border-gray-800 shrink-0 ${config.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {fav.code && (
                            <span className="font-mono text-[10px] text-blue-400 font-bold">
                              {fav.code}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${config.badgeBg}`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <h4 className="font-semibold text-white text-xs truncate group-hover:text-blue-400 transition-colors mt-0.5">
                          {fav.title}
                        </h4>
                      </div>
                    </Link>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={fav.url}
                        onClick={() => setOpen(false)}
                        className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                        title="Open record"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeFavorite(fav.id)}
                        className="p-1 text-gray-400 hover:text-red-400 rounded transition-colors"
                        title="Remove favorite"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
