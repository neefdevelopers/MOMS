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
        isActive ? 'text-blue-600 font-extrabold' : 'text-slate-600 hover:text-slate-900'
      } ${className}`}
      title={`Sort by ${label} (${isActive ? (currentOrder === 'asc' ? 'Ascending' : 'Descending') : 'Click to sort'})`}
    >
      <span>{label}</span>
      <span className="inline-flex items-center">
        {isActive ? (
          currentOrder === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600 animate-in fade-in zoom-in-75 duration-150" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600 animate-in fade-in zoom-in-75 duration-150" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors opacity-60 group-hover:opacity-100" />
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
      <span className="text-slate-600 font-semibold whitespace-nowrap">Sort:</span>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as SortField, sortOrder)}
        className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
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
        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-blue-300 rounded-lg text-slate-700 hover:text-slate-900 transition-colors flex items-center gap-1"
        title={sortOrder === 'asc' ? 'Ascending Order (Click for Descending)' : 'Descending Order (Click for Ascending)'}
      >
        {sortOrder === 'asc' ? (
          <>
            <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-semibold">ASC</span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-[10px] font-semibold">DESC</span>
          </>
        )}
      </button>
    </div>
  );
}
