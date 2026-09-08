'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  Search,
  Trash2,
  ExternalLink,
  Film,
  FileText,
  Palette,
  CheckSquare,
  Calendar,
  Building2,
  Tag,
  Package,
  BarChart3,
  Layers,
  ArrowRight,
  Clock,
  X,
  Sparkles,
} from 'lucide-react';
import { useFavorites, FavoriteEntityType } from '@/lib/favorites-context';
import { formatRelativeTime } from '@/utils/notificationCategories';

const ENTITY_CONFIG: Record<
  FavoriteEntityType,
  { label: string; icon: React.ElementType; color: string; badgeBg: string; buttonLabel: string }
> = {
  PROJECT: {
    label: 'Projects',
    icon: Film,
    color: 'text-blue-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    buttonLabel: 'Open Project',
  },
  SCRIPT: {
    label: 'Scripts',
    icon: FileText,
    color: 'text-purple-600',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    buttonLabel: 'Open Script',
  },
  GRAPHIC_REQUIREMENT: {
    label: 'Graphic Reqs',
    icon: Palette,
    color: 'text-amber-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    buttonLabel: 'Open Graphic Req',
  },
  TASK: {
    label: 'Tasks',
    icon: CheckSquare,
    color: 'text-emerald-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    buttonLabel: 'Open Task',
  },
  CALENDAR_EVENT: {
    label: 'Media Calendar',
    icon: Calendar,
    color: 'text-rose-600',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    buttonLabel: 'Open Event',
  },
  CLIENT: {
    label: 'Clients',
    icon: Building2,
    color: 'text-indigo-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    buttonLabel: 'Open Client',
  },
  BRAND: {
    label: 'Brands',
    icon: Tag,
    color: 'text-amber-700',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    buttonLabel: 'Open Brand',
  },
  PRODUCT: {
    label: 'Products',
    icon: Package,
    color: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    buttonLabel: 'Open Product',
  },
  REPORT: {
    label: 'Reports',
    icon: BarChart3,
    color: 'text-pink-600',
    badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
    buttonLabel: 'Open Report',
  },
};

export default function FavouritesPage() {
  const { favorites, removeFavorite, loading } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | FavoriteEntityType>('ALL');

  const filteredFavorites = favorites.filter((f) => {
    if (selectedCategory !== 'ALL' && f.entityType !== selectedCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.title?.toLowerCase().includes(q) ||
      f.code?.toLowerCase().includes(q) ||
      f.entityType?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 text-slate-900">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Favourites
            </h1>
            {favorites.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                {favorites.length} Saved
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Quick 1-click access to your bookmarked projects, scripts, tasks, graphic requirements, calendar events, and client records.
          </p>
        </div>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search saved favourites by title, code or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 transition-colors font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {[
            { key: 'ALL', label: `All (${favorites.length})` },
            { key: 'PROJECT', label: 'Projects' },
            { key: 'SCRIPT', label: 'Scripts' },
            { key: 'TASK', label: 'Tasks' },
            { key: 'GRAPHIC_REQUIREMENT', label: 'Graphic Reqs' },
            { key: 'CALENDAR_EVENT', label: 'Media Calendar' },
            { key: 'CLIENT', label: 'Clients' },
            { key: 'REPORT', label: 'Reports' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors border ${
                selectedCategory === cat.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Favourites Cards Grid / List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs font-medium">Loading favourites...</span>
        </div>
      ) : filteredFavorites.length === 0 ? (
        /* Empty State */
        <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-500">
            <Star className="w-6 h-6 fill-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">No favourites yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No favourites match "${searchQuery}".`
                : 'Items you save as favourites will appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredFavorites.map((fav) => {
            const config = ENTITY_CONFIG[fav.entityType] || ENTITY_CONFIG.PROJECT;
            const Icon = config.icon;
            const relativeTime = formatRelativeTime(fav.createdAt);

            let metaObj: any = null;
            if (fav.metadata) {
              try {
                metaObj = typeof fav.metadata === 'string' ? JSON.parse(fav.metadata) : fav.metadata;
              } catch {
                metaObj = null;
              }
            }

            return (
              <div
                key={fav.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 shadow-xs transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${config.badgeBg}`}>
                        {config.label}
                      </span>
                      {fav.code && (
                        <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {fav.code}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFavorite(fav.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Remove from favourites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                      {fav.title}
                    </h4>
                  </div>

                  {metaObj && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-1">
                      {metaObj.client && (
                        <div><strong className="text-slate-700">Client:</strong> {metaObj.client}</div>
                      )}
                      {metaObj.status && (
                        <div><strong className="text-slate-700">Status:</strong> {metaObj.status}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    Saved {relativeTime}
                  </span>

                  <Link
                    href={fav.url}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <span>{config.buttonLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
