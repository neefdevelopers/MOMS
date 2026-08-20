'use client';

import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListFilter,
} from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function paginateData<T>(items: T[], currentPage: number, pageSize: number): T[] {
  if (!items || items.length === 0) return [];
  const start = (currentPage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50, 100],
  className = '',
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-card/80 border-t border-border text-xs rounded-b-xl ${className}`}
    >
      {/* Left: Record Range Summary */}
      <div className="text-gray-400 font-medium select-none text-center sm:text-left">
        Showing <strong className="text-white font-mono">{startRecord}</strong> to{' '}
        <strong className="text-white font-mono">{endRecord}</strong> of{' '}
        <strong className="text-blue-400 font-mono font-bold">{totalItems}</strong> records
      </div>

      {/* Right: Page Size Selector & Navigation Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Configurable Page Size Selector */}
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1">
          <ListFilter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[11px] text-gray-400 font-semibold">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = parseInt(e.target.value, 10);
              onPageSizeChange(newSize);
              onPageChange(1); // Reset to page 1 on page size change
            }}
            className="bg-transparent text-white font-mono font-bold focus:outline-none cursor-pointer text-xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size} className="bg-gray-900 text-white">
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Page Navigators */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Prev Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              typeof p === 'number' ? (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs font-bold transition-all ${
                    p === safeCurrentPage
                      ? 'bg-blue-600 border border-blue-500 text-white shadow-md shadow-blue-600/30'
                      : 'bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={idx} className="px-1 text-gray-600 font-mono">
                  {p}
                </span>
              )
            )}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
