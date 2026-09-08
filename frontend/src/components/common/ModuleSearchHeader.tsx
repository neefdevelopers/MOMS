import React from 'react';
import { Search, Filter, RotateCcw, ArrowUpDown, X, SlidersHorizontal } from 'lucide-react';
import { SortSelector } from './TableSortHeader';

export interface SortOption {
  value: string;
  label: string;
}

interface ModuleSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  // Sort State
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sortOptions?: SortOption[];
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;

  // Filter Panel State
  showFilterPanel?: boolean;
  onToggleFilterPanel?: () => void;
  activeFilterCount?: number;
  filterPanelContent?: React.ReactNode;

  // Reset Filters Callback
  onResetFilters: () => void;

  className?: string;
}

export function ModuleSearchHeader({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search records by name, ID code, or keywords...',
  sortBy,
  sortOrder = 'desc',
  sortOptions = [],
  onSortChange,
  showFilterPanel = false,
  onToggleFilterPanel,
  activeFilterCount = 0,
  filterPanelContent,
  onResetFilters,
  className = '',
}: ModuleSearchHeaderProps) {
  const hasActiveFilters = searchQuery.trim() !== '' || activeFilterCount > 0;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Primary Toolbar Row */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* 1. Search Box */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* 2. Filter Panel Toggle Button */}
          {onToggleFilterPanel && (
            <button
              type="button"
              onClick={onToggleFilterPanel}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                showFilterPanel || activeFilterCount > 0
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full font-mono">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          {/* 3. Sort Options Selector */}
          {sortBy && onSortChange && sortOptions.length > 0 && (
            <SortSelector
              sortBy={sortBy}
              sortOrder={sortOrder}
              options={sortOptions}
              onSortChange={(field, order) => onSortChange(field, order)}
            />
          )}

          {/* 4. Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              title="Reset all search queries and active filter selections"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filter Panel Content Drawer */}
      {showFilterPanel && filterPanelContent && (
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" /> Multi-Parameter Filter Controls
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[11px] text-amber-700 hover:underline flex items-center gap-1 font-semibold"
              >
                <RotateCcw className="w-3 h-3" /> Clear All Filters
              </button>
            )}
          </div>
          {filterPanelContent}
        </div>
      )}
    </div>
  );
}
