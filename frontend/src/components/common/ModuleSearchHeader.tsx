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
      <div className="bg-card border border-border p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* 1. Search Box */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-gray-900 border border-gray-700/80 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5"
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
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm font-bold'
                  : 'bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="text-[10px] bg-blue-500 text-white font-bold px-1.5 py-0.2 rounded-full font-mono">
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
              className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
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
        <div className="bg-gray-900/90 border border-border p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-400" /> Multi-Parameter Filter Controls
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-semibold"
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
