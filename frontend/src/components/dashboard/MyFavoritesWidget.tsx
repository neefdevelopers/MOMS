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
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-800/60',
  },
  SCRIPT: {
    label: 'Script',
    icon: FileText,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-800/60',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Req',
    icon: Palette,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-800/60',
  },
  TASK: {
    label: 'Task',
    icon: CheckSquare,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60',
  },
  REPORT: {
    label: 'Report',
    icon: BarChart3,
    color: 'text-pink-400',
    badgeBg: 'bg-pink-950/60 text-pink-300 border-pink-800/60',
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
      className={`bg-zinc-950/90 border border-zinc-800/90 rounded-2xl p-6 md:p-7 space-y-6 shadow-xl text-xs ${className}`}
    >
      {/* Header Container */}
      <div className="space-y-4 border-b border-zinc-800/80 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400 shrink-0 shadow-lg shadow-amber-500/5">
              <Star className="w-5 h-5 fill-amber-400/40" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white tracking-wide">
                  My Starred Favorites
                </h3>
                <span className="text-[11px] font-mono font-bold bg-amber-950/70 text-amber-300 border border-amber-800/80 px-2.5 py-0.5 rounded-full">
                  {favorites.length} Starred
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                User-specific shortcuts to your starred Projects, Scripts, Graphic Reqs, Tasks & Reports
              </p>
            </div>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 ${
              selectedType === 'ALL'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800/60'
            }`}
          >
            <span>All Favorites</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-950/80 border border-zinc-800">
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
                className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 ${
                  selectedType === type
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800/80 border border-zinc-800/60'
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
        <div className="py-12 text-center text-zinc-500 font-mono animate-pulse">
          Loading user-specific favorites...
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="py-12 px-6 bg-gradient-to-b from-zinc-900/40 via-zinc-950/60 to-zinc-950 border border-zinc-800/80 rounded-2xl text-center space-y-3.5 shadow-inner">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
            <Star className="w-6 h-6 fill-amber-400/30" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-white text-sm tracking-wide">No Favorites Starred Yet</h4>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Click the star icon ⭐ on any Project, Script, Graphic Requirement, Task, or Report to add it to your private quick-access dashboard favorites.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900 text-amber-300/90 border border-zinc-800 text-[11px] font-medium mt-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Starred items are private to your logged-in account</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFavorites.map((fav) => {
            const config = ENTITY_CONFIG[fav.entityType] || {
              label: fav.entityType,
              icon: Layers,
              color: 'text-zinc-400',
              badgeBg: 'bg-zinc-900 text-zinc-300 border-zinc-800',
            };
            const Icon = config.icon;

            return (
              <div
                key={fav.id}
                className="bg-zinc-900/40 hover:bg-zinc-900/80 border border-zinc-800/80 hover:border-amber-500/40 p-3.5 rounded-xl transition-all group flex flex-col justify-between space-y-2.5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 ${config.color}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {fav.code && (
                          <span className="font-mono text-[10px] text-amber-400 font-bold">
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
                  <h4 className="font-bold text-white text-xs truncate leading-snug">
                    {fav.title}
                  </h4>
                </Link>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-400">
                  <span className="font-mono text-zinc-500">Private User Shortcut</span>
                  <Link
                    href={fav.url}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold transition-colors"
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
