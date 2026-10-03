'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { ArrowLeft, Plus } from 'lucide-react';

const DEFAULT_CATEGORIES = [
  'Camera Body',
  'Camera Lens',
  'Lighting',
  'Audio & Microphone',
  'Grip & Rigging',
  'Tripod & Stabilizer',
  'Drone & Aerial',
  'Monitor & Display',
  'Power & Battery',
  'Cables & Storage',
  'Other Equipment',
];

const CATEGORY_PREFIXES: Record<string, string> = {
  'Camera Body': 'CAM',
  'Camera Lens': 'LENS',
  'Lighting': 'LIGHT',
  'Audio & Microphone': 'MIC',
  'Grip & Rigging': 'GRIP',
  'Tripod & Stabilizer': 'TRI',
  'Drone & Aerial': 'DRONE',
  'Monitor & Display': 'MON',
  'Power & Battery': 'PWR',
  'Cables & Storage': 'ACC',
  'Other Equipment': 'EQ',
};

export default function CreateEquipmentPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    equipmentId: '',
    category: 'Camera Body',
    brand: '',
    model: '',
    serialNumber: '',
    storageLocation: 'Studio Bay',
    condition: 'Good',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    internalNotes: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [cats, allEq] = await Promise.all([
          fetchApi('/equipment/categories').catch(() => []),
          fetchApi('/equipment').catch(() => []),
        ]);

        if (Array.isArray(cats) && cats.length > 0) {
          const names = cats.map((c: any) => (typeof c === 'string' ? c : c.name)).filter(Boolean);
          setCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...names])));
        }

        const count = Array.isArray(allEq) ? allEq.length : 0;
        const prefix = CATEGORY_PREFIXES['Camera Body'] || 'EQ';
        const num = (count + 1).toString().padStart(3, '0');
        setForm((prev) => ({
          ...prev,
          equipmentId: prev.equipmentId || `${prefix}-${num}`,
        }));
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const handleCategoryChange = (newCategory: string) => {
    const prefix = CATEGORY_PREFIXES[newCategory] || 'EQ';
    const num = Math.floor(Math.random() * 900 + 100).toString();
    setForm((prev) => ({
      ...prev,
      category: newCategory,
      equipmentId: prev.equipmentId.includes('-') ? `${prefix}-${prev.equipmentId.split('-')[1] || num}` : `${prefix}-${num}`,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.equipmentId.trim()) {
      setError('Equipment name and Equipment ID are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchApi('/equipment', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          name: form.name.trim(),
          equipmentId: form.equipmentId.trim(),
          purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined,
          status: 'AVAILABLE',
          availability: 'AVAILABLE',
        }),
      });

      router.push('/equipment');
    } catch (err: any) {
      setError(err.message || 'Failed to add equipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/equipment"
          className="inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Equipment
        </Link>

        {/* Page Header */}
        <div className="pb-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-900">Add Equipment</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register a new equipment asset into inventory</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {error}
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-gray-200 space-y-6 shadow-xs">
          {/* 1. Basic Information */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Equipment Name *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Sony FX3 Full-Frame Cinema Camera"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Equipment ID / Asset ID *</label>
                <input
                  required
                  type="text"
                  placeholder="CAM-001"
                  value={form.equipmentId}
                  onChange={(e) => setForm({ ...form, equipmentId: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Equipment Details */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Equipment Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Sony, Rode, Aputure"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  placeholder="e.g. FX3, Wireless GO II"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Serial Number</label>
                <input
                  type="text"
                  placeholder="S/N: 4892019"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Inventory */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Inventory & Location
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  placeholder="e.g. Studio Locker A, Shelf 2"
                  value={form.storageLocation}
                  onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={form.condition}
                  onChange={(e) => setForm({ ...form, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="EXCELLENT">Excellent (Brand New / Refurbished)</option>
                  <option value="GOOD">Good (Standard Operational)</option>
                  <option value="FAIR">Fair (Minor Wear)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Purchase Date</label>
                <input
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 4. Additional */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
              Additional
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Internal Notes</label>
              <textarea
                rows={3}
                placeholder="Included accessories, kit notes, warranty info..."
                value={form.internalNotes}
                onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Area */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Link
              href="/equipment"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading ? 'Saving...' : 'Save Equipment'}
            </button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
