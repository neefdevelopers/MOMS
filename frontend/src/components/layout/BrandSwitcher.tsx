'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBrand, BrandEntity } from '@/lib/brand-context';
import { useAuth } from '@/lib/auth-context';
import { Tag, ChevronDown, Check, Search, X, Sparkles, Building2, Layers } from 'lucide-react';

export function BrandSwitcher() {
  const { user } = useAuth();
  const { brands, activeBrandId, activeBrand, setActiveBrandId, isLoading } = useBrand();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  if (user?.role !== 'MARKETING_MANAGER') {
    return null;
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBrands = brands.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.shortCode.toLowerCase().includes(q) ||
      b.client?.name?.toLowerCase().includes(q) ||
      b.client?.companyName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all shadow-xs ${
          activeBrand
            ? 'bg-blue-50/80 border-blue-200 text-blue-800 hover:bg-blue-100 hover:border-blue-300'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
        title={activeBrand ? `Active Brand Context: ${activeBrand.name}` : 'Global Context (All Brands)'}
      >
        <div className="flex items-center gap-1.5">
          {activeBrand ? (
            <span
              className="w-2 h-2 rounded-full ring-2 ring-blue-400 animate-pulse"
              style={{ backgroundColor: activeBrand.primaryColor || '#3B82F6' }}
            />
          ) : (
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          )}

          <span className="font-bold max-w-[120px] sm:max-w-[160px] truncate">
            {activeBrand ? activeBrand.name : 'All Brands'}
          </span>

          {activeBrand && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-700 border border-blue-200">
              {activeBrand.shortCode}
            </span>
          )}
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header & Search */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3 text-blue-500" /> Active Brand Scope
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {brands.length} {brands.length === 1 ? 'brand' : 'brands'}
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand or client..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Brand List */}
          <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
            {/* "All Brands" Option */}
            <button
              type="button"
              onClick={() => {
                setActiveBrandId(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                !activeBrandId ? 'bg-blue-50/80 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                  <Layers className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900">All Brands</div>
                  <div className="text-[10px] text-slate-400">View entire organization scope</div>
                </div>
              </div>
              {!activeBrandId && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
            </button>

            {/* Individual Brands */}
            {filteredBrands.map((b) => {
              const isSelected = activeBrandId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setActiveBrandId(b.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                    isSelected ? 'bg-blue-50/80 font-bold text-blue-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: b.primaryColor || '#3B82F6' }}
                    >
                      {b.shortCode.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{b.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {b.shortCode}
                        </span>
                      </div>
                      {b.client && (
                        <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" />
                          <span>{b.client.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              );
            })}

            {filteredBrands.length === 0 && (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching brands found
              </div>
            )}
          </div>

          {/* Footer Status */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px] text-slate-400">
            <span>Filter applies to all active sessions</span>
            {activeBrandId && (
              <button
                type="button"
                onClick={() => {
                  setActiveBrandId(null);
                  setIsOpen(false);
                }}
                className="text-blue-600 hover:underline font-semibold"
              >
                Reset to All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
