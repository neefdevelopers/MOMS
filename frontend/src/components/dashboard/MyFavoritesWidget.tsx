'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Film,
  FileText,
  Palette,
  CheckSquare,
  BarChart3,
  Calendar,
  Building2,
  Tag,
  Package,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useFavorites, FavoriteEntityType } from '@/lib/favorites-context';
import { FavoriteButton } from '../common/FavoriteButton';

const ENTITY_CONFIG: Record<
  FavoriteEntityType,
  { label: string; icon: React.ElementType; color: string; badgeBg: string }
> = {
  PROJECT: {
    label: 'Project',
    icon: Film,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  SCRIPT: {
    label: 'Script',
    icon: FileText,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Req',
    icon: Palette,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  TASK: {
    label: 'Task',
    icon: CheckSquare,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CALENDAR_EVENT: {
    label: 'Event',
    icon: Calendar,
    color: 'text-orange-600',
    badgeBg: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  CLIENT: {
    label: 'Client',
    icon: Building2,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  BRAND: {
    label: 'Brand',
    icon: Tag,
    color: 'text-teal-600',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  PRODUCT: {
    label: 'Product',
    icon: Package,
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  REPORT: {
    label: 'Report',
    icon: BarChart3,
    color: 'text-pink-600',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
  },
};

export default function MyFavoritesWidget({ className = '' }: { className?: string }) {
  const { favorites, loading } = useFavorites();
  const [selectedType, setSelectedType] = useState<'ALL' | FavoriteEntityType>('ALL');

  const filteredFavorites =
    selectedType === 'ALL'
      ? favorites
      : favorites.filter((f) => f.entityType === selectedType);

  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 md:p-6 space-y-4 shadow-sm text-xs ${className}`}
    >
      {/* Header Container */}
      <div className="space-y-3 border-b border-slate-200 pb-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 shrink-0 shadow-xs">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold text-slate-900 tracking-wide">
                  My Saved Favourites
                </h3>
                <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                  {favorites.length} Favourited
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px] flex items-center gap-1.5 ${
              selectedType === 'ALL'
                ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs font-bold'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>All Favourites</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200">
              {favorites.length}
            </span>
          </button>

          {(Object.keys(ENTITY_CONFIG) as FavoriteEntityType[]).map((type) => {
            const count = favorites.filter((f) => f.entityType === type).length;
            const config = ENTITY_CONFIG[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-[11px] flex items-center gap-1.5 ${
                  selectedType === type
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                <span>{config.label}s</span>
                <span className="font-mono text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Favorites Content Body */}
      {loading ? (
        <div className="py-6 text-center text-slate-400 font-mono animate-pulse">
          Loading user-specific favourites...
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="py-4 px-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-left shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs tracking-wide">No Favourites Saved Yet</h4>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFavorites.map((fav) => {
            const config = ENTITY_CONFIG[fav.entityType] || {
              label: fav.entityType,
              icon: Layers,
              color: 'text-slate-600',
              badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            const Icon = config.icon;

            return (
              <div
                key={fav.id}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-amber-300 p-3.5 rounded-xl transition-all group flex flex-col justify-between space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg bg-white border border-slate-200 shrink-0 ${config.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {fav.code && (
                          <span className="font-mono text-[10px] text-blue-700 font-bold">
                            {fav.code}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${config.badgeBg}`}
                        >
                          {config.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <FavoriteButton
                    entityType={fav.entityType}
                    entityId={fav.entityId}
                    title={fav.title}
                    code={fav.code || undefined}
                    url={fav.url}
                    size="sm"
                  />
                </div>

                <Link href={fav.url} className="block group-hover:underline">
                  <h4 className="font-bold text-slate-900 text-xs truncate leading-snug">
                    {fav.title}
                  </h4>
                </Link>

                <div className="flex items-center justify-end pt-2 border-t border-slate-200 text-[10px] text-slate-500">
                  <Link
                    href={fav.url}
                    className="flex items-center gap-1 text-amber-700 hover:text-amber-800 font-bold transition-colors"
                  >
                    <span>Open Record</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
