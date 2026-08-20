'use client';

import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  X,
  Layers,
  Calendar,
  Sparkles,
  Building2,
  Tag,
  Package,
  Film,
  User,
  Camera,
  CheckCircle2,
  Clock,
  RotateCcw,
  ExternalLink,
  Bookmark,
  BookmarkPlus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdvancedSearchModal({ isOpen, onClose }: AdvancedSearchModalProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Saved Filters State
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);

  // Form Parameters
  const [keywords, setKeywords] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedLanguage, setSelectedLanguage] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Results State
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const loadSavedFilters = async () => {
    try {
      const res = await fetchApi('/search/saved-filters');
      setSavedFilters(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load saved filters:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedFilters();
      Promise.all([
        fetchApi('/clients').catch(() => []),
        fetchApi('/brands').catch(() => []),
        fetchApi('/products').catch(() => []),
        fetchApi('/projects').catch(() => []),
        fetchApi('/users').catch(() => []),
      ]).then(([c, b, p, pr, u]) => {
        setClients(Array.isArray(c) ? c : []);
        setBrands(Array.isArray(b) ? b : []);
        setProducts(Array.isArray(p) ? p : []);
        setProjects(Array.isArray(pr) ? pr : []);
        setUsers(Array.isArray(u) ? u : []);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Apply Saved Filter Combination
  const applySavedFilter = (sf: any) => {
    handleReset();
    setActiveSavedFilterId(sf.id);
    const f = sf.filters || {};

    if (f.keywords) setKeywords(f.keywords);
    if (f.client) setSelectedClient(f.client);
    if (f.brand) setSelectedBrand(f.brand);
    if (f.product) setSelectedProduct(f.product);
    if (f.project) setSelectedProject(f.project);
    if (f.employee) setSelectedEmployee(f.employee);
    if (f.equipment) setSelectedEquipment(f.equipment);
    if (f.status) setSelectedStatus(f.status);
    if (f.language) setSelectedLanguage(f.language);
    if (f.priority) setSelectedPriority(f.priority);
    if (f.module) setSelectedModule(f.module);

    if (f.dateRange === 'TODAY') {
      const todayStr = new Date().toISOString().split('T')[0];
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else {
      if (f.dateFrom) setDateFrom(f.dateFrom);
      if (f.dateTo) setDateTo(f.dateTo);
    }

    // Automatically trigger search with the saved preset
    setTimeout(() => {
      triggerSearchWithParams({
        keywords: f.keywords,
        client: f.client,
        brand: f.brand,
        product: f.product,
        project: f.project,
        employee: f.employee,
        equipment: f.equipment,
        status: f.status,
        language: f.language,
        priority: f.priority,
        module: f.module,
        dateFrom: f.dateRange === 'TODAY' ? new Date().toISOString().split('T')[0] : f.dateFrom,
        dateTo: f.dateRange === 'TODAY' ? new Date().toISOString().split('T')[0] : f.dateTo,
      });
    }, 50);
  };

  const handleSaveCurrentFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterName.trim()) return;

    setSavingFilter(true);
    try {
      const currentFilters: any = {};
      if (keywords.trim()) currentFilters.keywords = keywords.trim();
      if (selectedClient.trim()) currentFilters.client = selectedClient.trim();
      if (selectedBrand.trim()) currentFilters.brand = selectedBrand.trim();
      if (selectedProduct.trim()) currentFilters.product = selectedProduct.trim();
      if (selectedProject.trim()) currentFilters.project = selectedProject.trim();
      if (selectedEmployee.trim()) currentFilters.employee = selectedEmployee.trim();
      if (selectedEquipment.trim()) currentFilters.equipment = selectedEquipment.trim();
      if (selectedStatus !== 'ALL') currentFilters.status = selectedStatus;
      if (selectedLanguage !== 'ALL') currentFilters.language = selectedLanguage;
      if (selectedPriority !== 'ALL') currentFilters.priority = selectedPriority;
      if (selectedModule !== 'ALL') currentFilters.module = selectedModule;
      if (dateFrom) currentFilters.dateFrom = dateFrom;
      if (dateTo) currentFilters.dateTo = dateTo;

      await fetchApi('/search/saved-filters', {
        method: 'POST',
        body: JSON.stringify({
          name: newFilterName.trim(),
          module: selectedModule,
          filters: currentFilters,
        }),
      });

      setNewFilterName('');
      setShowSaveDialog(false);
      await loadSavedFilters();
    } catch (err: any) {
      alert(err.message || 'Failed to save filter preset');
    } finally {
      setSavingFilter(false);
    }
  };

  const handleDeleteSavedFilter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this private saved filter?')) return;
    try {
      await fetchApi(`/search/saved-filters/${id}`, { method: 'DELETE' });
      await loadSavedFilters();
      if (activeSavedFilterId === id) setActiveSavedFilterId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete saved filter');
    }
  };

  const handleReset = () => {
    setKeywords('');
    setSelectedClient('');
    setSelectedBrand('');
    setSelectedProduct('');
    setSelectedProject('');
    setSelectedEmployee('');
    setSelectedEquipment('');
    setSelectedStatus('ALL');
    setSelectedLanguage('ALL');
    setSelectedPriority('ALL');
    setSelectedModule('ALL');
    setDateFrom('');
    setDateTo('');
    setResults(null);
    setHasSearched(false);
    setActiveSavedFilterId(null);
  };

  const triggerSearchWithParams = async (params: any) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const payload: any = {};
      if (params.keywords?.trim()) payload.keywords = params.keywords.trim();
      if (params.client?.trim()) payload.client = params.client.trim();
      if (params.brand?.trim()) payload.brand = params.brand.trim();
      if (params.product?.trim()) payload.product = params.product.trim();
      if (params.project?.trim()) payload.project = params.project.trim();
      if (params.employee?.trim()) payload.employee = params.employee.trim();
      if (params.equipment?.trim()) payload.equipment = params.equipment.trim();
      if (params.status && params.status !== 'ALL') payload.status = params.status;
      if (params.language && params.language !== 'ALL') payload.language = params.language;
      if (params.priority && params.priority !== 'ALL') payload.priority = params.priority;
      if (params.module && params.module !== 'ALL') payload.module = params.module;
      if (params.dateFrom) payload.dateFrom = params.dateFrom;
      if (params.dateTo) payload.dateTo = params.dateTo;

      const res = await fetchApi('/search/advanced', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResults(res?.results || {});
    } catch (err) {
      console.error('Advanced search error:', err);
      setResults({});
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerSearchWithParams({
      keywords,
      client: selectedClient,
      brand: selectedBrand,
      product: selectedProduct,
      project: selectedProject,
      employee: selectedEmployee,
      equipment: selectedEquipment,
      status: selectedStatus,
      language: selectedLanguage,
      priority: selectedPriority,
      module: selectedModule,
      dateFrom,
      dateTo,
    });
  };

  const activeFilterCount = [
    keywords,
    selectedClient,
    selectedBrand,
    selectedProduct,
    selectedProject,
    selectedEmployee,
    selectedEquipment,
    selectedStatus !== 'ALL' ? selectedStatus : '',
    selectedLanguage !== 'ALL' ? selectedLanguage : '',
    selectedPriority !== 'ALL' ? selectedPriority : '',
    dateFrom,
    dateTo,
  ].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 px-6 border-b border-border flex items-center justify-between bg-gray-900/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Advanced Multi-Condition Search & Saved Filters
                {activeFilterCount > 0 && (
                  <span className="text-[10px] bg-blue-500 text-white font-mono px-2 py-0.5 rounded-full font-normal">
                    {activeFilterCount} active conditions
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-gray-400">Save and combine private operational filter presets across authorized modules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* User-Private Saved Filter Presets Bar */}
          <div className="space-y-2 bg-gray-900/40 p-3.5 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-blue-400" /> Private Saved Filters & Presets:
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(true)}
                  className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 transition-colors"
                >
                  <BookmarkPlus className="w-3 h-3" /> Save Current Combination
                </button>
              )}
            </div>

            {/* Save Filter Name Prompt Popover */}
            {showSaveDialog && (
              <form onSubmit={handleSaveCurrentFilter} className="flex items-center gap-2 pt-2 border-t border-gray-800">
                <input
                  type="text"
                  placeholder="Filter name (e.g. My Weekly Shoots, Q3 Deliverables)..."
                  value={newFilterName}
                  onChange={(e) => setNewFilterName(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={savingFilter || !newFilterName.trim()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs disabled:opacity-50"
                >
                  {savingFilter ? 'Saving...' : 'Save Filter'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveDialog(false)}
                  className="px-2 py-1.5 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Saved Filter Badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {savedFilters.map((sf) => {
                const isActive = activeSavedFilterId === sf.id;
                return (
                  <div
                    key={sf.id}
                    onClick={() => applySavedFilter(sf)}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 text-xs select-none ${
                      isActive
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                        : 'bg-gray-900/90 hover:bg-gray-900 border-gray-800 hover:border-gray-700 text-gray-300'
                    }`}
                  >
                    {sf.id === 'preset_today_tasks' ? (
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    ) : sf.id === 'preset_pending_reviews' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    ) : sf.id === 'preset_active_projects' ? (
                      <Film className="w-3.5 h-3.5 text-purple-400" />
                    ) : sf.id === 'preset_high_priority' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                    )}

                    <span className="font-semibold">{sf.name}</span>

                    {!sf.isSystem && (
                      <button
                        onClick={(e) => handleDeleteSavedFilter(sf.id, e)}
                        className="text-gray-500 hover:text-red-400 p-0.5 ml-1 transition-colors"
                        title="Delete private filter"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Criteria Grid */}
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Top Keywords Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Keywords or remarks (e.g. 4K Video, Studio Shoot, Color Grade, Sony FX6, Drone Permit)..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 3x4 Structured Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Client */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-gray-500" /> Client
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nike, Acme Corp"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Brand */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-gray-500" /> Brand
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nike Running, Jordan"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Product */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Package className="w-3 h-3 text-gray-500" /> Product
                </label>
                <input
                  type="text"
                  placeholder="e.g. Air Zoom, Pegasus"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Project */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Film className="w-3 h-3 text-gray-500" /> Project / Shoot
                </label>
                <input
                  type="text"
                  placeholder="e.g. Spring Commercial, PRJ-001"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Employee */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-500" /> Employee / Staff
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul, Priya, EMP-003"
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Equipment */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-gray-500" /> Equipment & Gear
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sony FX3, 50mm Lens"
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Current Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="PLANNED">PLANNED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="AVAILABLE">AVAILABLE (Equipment)</option>
                  <option value="ISSUED">ISSUED (Equipment)</option>
                  <option value="MAINTENANCE">MAINTENANCE (Equipment)</option>
                </select>
              </div>

              {/* Language */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Language (Scripts)</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Languages</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Arabic">Arabic</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400">Priority</label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              {/* Date From */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" /> Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Date To */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" /> Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Target Module */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-gray-500" /> Target Module
                </label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Authorized Modules</option>
                  <option value="projects">Projects Only</option>
                  <option value="tasks">Tasks Only</option>
                  <option value="scripts">Scripts Only</option>
                  <option value="equipment">Equipment Only</option>
                  <option value="calendar_events">Calendar Events Only</option>
                </select>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear All Filters
              </button>

              <button
                type="submit"
                disabled={isSearching}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSearching ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>Execute Multi-Condition Search</span>
              </button>
            </div>
          </form>

          {/* Results Section */}
          {hasSearched && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Matching Operational Results
                </span>
                {results && (
                  <span className="text-gray-400 font-mono text-[11px]">
                    {Number(Object.values(results).reduce((acc: number, list: any) => acc + (list?.length || 0), 0))} records found
                  </span>
                )}
              </div>

              {isSearching ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p>Searching multi-condition criteria across authorized records...</p>
                </div>
              ) : !results || Object.keys(results).every((k) => results[k]?.length === 0) ? (
                <div className="p-8 text-center bg-gray-900/40 border border-gray-800 rounded-xl space-y-1 text-gray-400">
                  <p className="font-semibold text-gray-300">No records match the combined conditions</p>
                  <p className="text-[10px] text-gray-500">Try loosening one of the filter parameters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(results).map((category) => {
                    const items = results[category];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase px-1 pb-1 border-b border-border/40">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-blue-400" />
                            {category}
                          </span>
                          <span className="font-mono text-gray-500">{items.length} records</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {items.map((item: any) => {
                            const updatedStr = item.lastUpdatedDate
                              ? new Date(item.lastUpdatedDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : 'Recent';

                            return (
                              <Link
                                key={item.id}
                                href={item.url}
                                onClick={onClose}
                                className="block p-3 bg-gray-900/60 hover:bg-gray-900 border border-gray-800 hover:border-blue-500/50 rounded-xl transition-all group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                        {item.entityType || category}
                                      </span>
                                      <span className="font-mono text-[9px] text-gray-500">
                                        {item.internalId || item.code || item.id}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                      {item.name || item.title}
                                    </h4>
                                    <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{item.subtitle}</p>
                                  </div>
                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    {item.status && (
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-300">
                                        {item.status}
                                      </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-blue-400 transition-colors" />
                                  </div>
                                </div>

                                <div className="mt-2 pt-1.5 border-t border-gray-800/60 flex items-center justify-between text-[9px] text-gray-500">
                                  <span>
                                    {item.relatedClient && item.relatedClient !== '—'
                                      ? `Client: ${item.relatedClient}`
                                      : item.relatedBrand && item.relatedBrand !== '—'
                                      ? `Brand: ${item.relatedBrand}`
                                      : 'General Operation'}
                                  </span>
                                  <span>Updated: {updatedStr}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
