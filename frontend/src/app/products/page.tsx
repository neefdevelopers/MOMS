'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Package, Plus, Edit, Filter, Tag, Search } from 'lucide-react';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [brandIdFilter, setBrandIdFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    brandId: '',
    name: '',
    productCode: '',
    category: '',
    status: 'ACTIVE',
    internalNotes: '',
  });

  const loadData = async () => {
    try {
      let url = '/products';
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (brandIdFilter) params.append('brandId', brandIdFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const [resProds, resBrands] = await Promise.all([
        fetchApi(url),
        fetchApi('/brands'),
      ]);
      setProducts(Array.isArray(resProds) ? resProds : []);
      setBrands(Array.isArray(resBrands) ? resBrands : []);
    } catch (err) {
      console.error('Failed to load products/brands:', err);
      setProducts([]);
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, brandIdFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await fetchApi(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/products', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      brandId: product.brandId || '',
      name: product.name || '',
      productCode: product.productCode || '',
      category: product.category || '',
      status: product.status || 'ACTIVE',
      internalNotes: product.internalNotes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    const active = (brands || []).filter((b) => b?.status === 'ACTIVE');
    setFormData({
      brandId: active[0]?.id || (brands[0]?.id || ''),
      name: '',
      productCode: '',
      category: '',
      status: 'ACTIVE',
      internalNotes: '',
    });
  };

  const activeBrands = (brands || []).filter((b) => b?.status === 'ACTIVE');
  const safeProducts = Array.isArray(products) ? products : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" /> Brand Products & Codes Catalog
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Product codes must be unique within each Brand. Active products are available for shoot projects.
          </p>
        </div>

        {user?.role === 'MEDIA_MANAGER' && (
          <button
            onClick={() => {
              resetForm();
              setEditingProduct(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-card border border-border p-4 rounded-xl text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by product name, code, category, notes, brand, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            <select
              value={brandIdFilter}
              onChange={(e) => setBrandIdFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Parent Brands</option>
              {(brands || []).map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.shortCode}] {b.name} ({b.status})
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

      {/* Products Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Products...</div>
      ) : safeProducts.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No products found matching criteria.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-gray-400 uppercase text-[10px] border-b border-border">
              <tr>
                <th className="p-4">Product Code & Name</th>
                <th className="p-4">Parent Brand & Client</th>
                <th className="p-4">Category</th>
                <th className="p-4">Status</th>
                <th className="p-4">Projects Linked</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-200">
              {safeProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                        [{prod.productCode}]
                      </span>
                      {prod.brand?.shortCode && (
                        <span className="font-mono text-[10px] text-gray-400">
                          {prod.brand.shortCode}-{prod.productCode}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-white text-sm block">{prod.name}</span>
                  </td>

                  <td className="p-4">
                    <div className="font-semibold text-white">[{prod.brand?.shortCode}] {prod.brand?.name}</div>
                    <div className="text-[10px] text-gray-400">{prod.brand?.client?.name}</div>
                  </td>

                  <td className="p-4">
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-semibold text-[11px]">
                      {prod.category || 'General'}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        prod.status === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      {prod.status}
                    </span>
                  </td>

                  <td className="p-4 font-mono font-bold text-emerald-400">
                    {prod._count?.projects || 0} Projects
                  </td>

                  <td className="p-4 text-right">
                    {user?.role === 'MEDIA_MANAGER' && (
                      <button
                        onClick={() => openEdit(prod)}
                        className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl w-full max-w-md p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white border-b border-border pb-3">
              {editingProduct ? `Edit Product (${editingProduct.productCode})` : 'Add New Product'}
            </h2>

            {!editingProduct && (
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Parent Active Brand *</label>
                <select
                  required
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="">Select Active Brand</option>
                  {activeBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.shortCode}] {b.name}
                    </option>
                  ))}
                </select>
                {activeBrands.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">No active brands available! Create an active brand first.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ojas Immunity Booster"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Product Code (Unique in Brand) *</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formData.productCode}
                  onChange={(e) => setFormData({ ...formData, productCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. OJ"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Supplements, Skincare"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Can be used for shoots)</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED (Historical)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Internal Notes</label>
              <textarea
                rows={2}
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                placeholder="Product SKU details, target audience notes..."
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                {editingProduct ? 'Save Product' : 'Add Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
