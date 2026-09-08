'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Calendar,
  Building2,
  Tag,
  Package,
  ArrowRight,
  Clock,
  X,
} from 'lucide-react';
import { useFavorites, FavoriteEntityType } from '@/lib/favorites-context';
import { formatRelativeTime } from '@/utils/notificationCategories';

const ENTITY_CONFIG: Record<
  FavoriteEntityType,
  { label: string; icon: React.ElementType; color: string; badgeBg: string }
> = {
  PROJECT: {
    label: 'Projects',
    icon: Film,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  SCRIPT: {
    label: 'Scripts',
    icon: FileText,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Reqs',
    icon: Palette,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  TASK: {
    label: 'Tasks',
    icon: CheckSquare,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CALENDAR_EVENT: {
    label: 'Media Calendar',
    icon: Calendar,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  CLIENT: {
    label: 'Clients',
    icon: Building2,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  BRAND: {
    label: 'Brands',
    icon: Tag,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  PRODUCT: {
    label: 'Products',
    icon: Package,
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  REPORT: {
    label: 'Reports',
    icon: BarChart3,
    color: 'text-pink-600',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
  },
};

export function FavoritesQuickMenu() {
  const { favorites, removeFavorite } = useFavorites();
  const [showHoverPreview, setShowHoverPreview] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowHoverPreview(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHoverPreview(false);
    }, 180);
  };

  const count = favorites.length;

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Navbar Star Trigger Button (Click navigates to /favourites) */}
      <Link
        href="/favourites"
        onClick={() => setShowHoverPreview(false)}
        className={`p-2 rounded-xl transition-colors relative flex items-center justify-center ${
          count > 0
            ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50/60'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`}
        aria-label={`Favourites${count > 0 ? `, ${count} saved items` : ''}`}
      >
        <Star
          className={`w-5 h-5 transition-all ${
            count > 0 ? 'fill-amber-400 text-amber-500' : 'text-slate-500'
          }`}
        />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>

      {/* Hover Favourites Preview Dropdown */}
      {showHoverPreview && (
        <div
          className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 text-xs overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 text-sm">Favourites</span>
              {count > 0 && (
                <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  {count} Saved
                </span>
              )}
            </div>
          </div>

          {/* Recent Favourites List (Top 6) */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {favorites.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-500 mb-2">
                  <Star className="w-5 h-5 text-amber-500" />
                </div>
                <p className="font-semibold text-slate-700 text-xs">No favourites yet</p>
                <p className="text-[11px] text-slate-400">
                  Items you save as favourites will appear here.
                </p>
              </div>
            ) : (
              favorites.slice(0, 6).map((fav) => {
                const config =
                  ENTITY_CONFIG[fav.entityType] || ENTITY_CONFIG.PROJECT;
                const Icon = config.icon;
                const relativeTime = formatRelativeTime(fav.createdAt);

                return (
                  <div
                    key={fav.id}
                    className="p-3 transition-colors flex items-start justify-between gap-3 hover:bg-slate-50 group"
                  >
                    <Link
                      href={fav.url}
                      onClick={() => setShowHoverPreview(false)}
                      className="flex items-start gap-3 min-w-0 flex-1"
                    >
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 shrink-0 mt-0.5 group-hover:border-slate-300">
                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      </div>

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${config.badgeBg}`}>
                            {config.label}
                          </span>
                          {fav.code && (
                            <span className="font-mono text-[9px] text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                              {fav.code}
                            </span>
                          )}
                        </div>

                        <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {fav.title}
                        </h5>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {relativeTime}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Unfavourite Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFavorite(fav.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0 self-center"
                      title="Remove from favourites"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer Link to /favourites */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/favourites"
              onClick={() => setShowHoverPreview(false)}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 group w-full justify-between"
            >
              <span>View all favourites</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
