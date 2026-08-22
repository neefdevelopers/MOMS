'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Tag, Plus, Edit, Filter, CheckCircle, AlertTriangle, Archive, Building2, Search } from 'lucide-react';

import { RouteGuard } from '@/components/common/RouteGuard';

export default function BrandsPage() {
  return (
    <RouteGuard module="BRANDS">
      <BrandsContent />
    </RouteGuard>
  );
}

function BrandsContent() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    clientId: '',
    name: '',
    shortCode: '',
    logoUrl: '',
    description: '',
    industry: '',
    primaryColor: '#3B82F6',
    status: 'ACTIVE',
  });

  const loadData = async () => {
    try {
      let url = '/brands';
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (clientIdFilter) params.append('clientId', clientIdFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const [resBrands, resClients] = await Promise.all([
        fetchApi(url),
        fetchApi('/clients'),
      ]);
      setBrands(resBrands);
      setClients(resClients);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, clientIdFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await fetchApi(`/brands/${editingBrand.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/brands', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowAddModal(false);
      setEditingBrand(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save brand');
    }
  };

  const openEdit = (brand: any) => {
    setEditingBrand(brand);
    setFormData({
      clientId: brand.clientId || '',
      name: brand.name || '',
      shortCode: brand.shortCode || '',
      logoUrl: brand.logoUrl || '',
      description: brand.description || '',
      industry: brand.industry || '',
      primaryColor: brand.primaryColor || '#3B82F6',
      status: brand.status || 'ACTIVE',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      name: '',
      shortCode: '',
      logoUrl: '',
      description: '',
      industry: '',
      primaryColor: '#3B82F6',
      status: 'ACTIVE',
    });
  };

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-blue-400" /> Brand Directory & Short Codes
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Brand short codes must be unique and are used in automated project IDs (e.g. DW-130726-OJ).
          </p>
        </div>

        {user?.role === 'MEDIA_MANAGER' && (
          <button
            onClick={() => {
              resetForm();
              setEditingBrand(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
          >
            <Plus className="w-4 h-4" /> Create Brand
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-card border border-border p-4 rounded-xl text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by brand name, short code, industry, description, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={clientIdFilter}
              onChange={(e) => setClientIdFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Parent Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Brands Cards */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Brands...</div>
      ) : brands.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No brands found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <div key={brand.id} className="bg-card border border-border p-5 rounded-xl space-y-3 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: brand.primaryColor || '#3B82F6' }}
              ></div>

              <div className="flex justify-between items-start pt-1">
                <div>
                  <span className="font-mono text-xs font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    [{brand.shortCode}]
                  </span>
                  <h3 className="text-base font-bold text-white mt-1.5">{brand.name}</h3>
                  <p className="text-[11px] text-gray-400">{brand.client?.name}</p>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    brand.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {brand.status}
                </span>
              </div>

              {brand.description && (
                <p className="text-xs text-gray-300 line-clamp-2">{brand.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border text-xs text-gray-400">
                <span>Products: <strong className="text-white">{brand.products?.length || 0}</strong></span>
                <span>Projects: <strong className="text-white">{brand._count?.projects || 0}</strong></span>

                {user?.role === 'MEDIA_MANAGER' && (
                  <button
                    onClick={() => openEdit(brand)}
                    className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded font-semibold text-[11px] flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Brand Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white border-b border-border pb-3">
              {editingBrand ? `Edit Brand (${editingBrand.shortCode})` : 'Create New Brand'}
            </h2>

            {!editingBrand && (
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Parent Active Client *</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="">Select Active Client</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyName})
                    </option>
                  ))}
                </select>
                {activeClients.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">No active clients available! Onboard an active client first.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Brand Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dhaara Wellness"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Short Code (Unique) *</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={formData.shortCode}
                  onChange={(e) => setFormData({ ...formData, shortCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. DW"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g. Health & Skincare"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Brand Logo URL</label>
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Primary Theme Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-8 h-8 rounded border-none bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Brand Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
              >
                <option value="ACTIVE">ACTIVE (Can create new projects)</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ARCHIVED">ARCHIVED (Historical read-only)</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brand story, guidelines, positioning..."
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingBrand(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                {editingBrand ? 'Save Brand' : 'Create Brand'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
