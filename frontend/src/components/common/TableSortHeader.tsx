'use client';

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortField, SortOrder } from '@/utils/sortUtils';

interface TableSortHeaderProps {
  label: string;
  field: SortField | string;
  currentSort: SortField | string;
  currentOrder: SortOrder;
  onSort: (field: SortField | string) => void;
  className?: string;
}

export function TableSortHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className = '',
}: TableSortHeaderProps) {
  const isActive = currentSort === field;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`group inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-xs transition-colors select-none ${
        isActive ? 'text-blue-400 font-extrabold' : 'text-gray-400 hover:text-gray-200'
      } ${className}`}
      title={`Sort by ${label} (${isActive ? (currentOrder === 'asc' ? 'Ascending' : 'Descending') : 'Click to sort'})`}
    >
      <span>{label}</span>
      <span className="inline-flex items-center">
        {isActive ? (
          currentOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-400 animate-in fade-in zoom-in-75 duration-150" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-400 animate-in fade-in zoom-in-75 duration-150" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors opacity-60 group-hover:opacity-100" />
        )}
      </span>
    </button>
  );
}

interface SortSelectorProps {
  sortBy: SortField | string;
  sortOrder: SortOrder;
  onSortChange: (field: SortField | string, order: SortOrder) => void;
  options?: { value: string; label: string }[];
  className?: string;
}

export function SortSelector({
  sortBy,
  sortOrder,
  onSortChange,
  options = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'alphabetical', label: 'Alphabetical Order' },
    { value: 'createdAt', label: 'Date Created' },
    { value: 'updatedAt', label: 'Last Updated' },
    { value: 'priority', label: 'Priority (Critical to Low)' },
    { value: 'status', label: 'Status' },
    { value: 'deadline', label: 'Deadline' },
  ],
  className = '',
}: SortSelectorProps) {
  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <span className="text-gray-400 font-semibold whitespace-nowrap">Sort:</span>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortField, sortOrder)}
        className="bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
        className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-blue-500/40 rounded-lg text-gray-300 hover:text-white transition-colors flex items-center gap-1"
        title={sortOrder === 'asc' ? 'Ascending Order (Click for Descending)' : 'Descending Order (Click for Ascending)'}
      >
        {sortOrder === 'asc' ? (
          <>
            <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-semibold">ASC</span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-semibold">DESC</span>
          </>
        )}
      </button>
    </div>
  );
}
