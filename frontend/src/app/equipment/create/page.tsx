'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { RoleGuard } from '@/components/common/RoleGuard';
import { Camera, ArrowLeft, PlusCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function CreateEquipmentPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextEqId, setNextEqId] = useState('EQ-000001');

  const [form, setForm] = useState({
    equipmentId: '',
    name: '',
    category: 'Camera Body',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: '',
    status: 'AVAILABLE',
    storageLocation: 'Studio Storage Bay 1',
    internalNotes: '',
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [cats, allEq] = await Promise.all([
          fetchApi('/equipment/categories').catch(() => []),
          fetchApi('/equipment').catch(() => []),
        ]);

        if (Array.isArray(cats)) setCategories(cats);

        if (Array.isArray(allEq)) {
          const nextNum = allEq.length + 1;
          const generatedId = `EQ-${nextNum.toString().padStart(6, '0')}`;
          setNextEqId(generatedId);
          setForm((prev) => ({ ...prev, equipmentId: generatedId }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.brand || !form.model || !form.serialNumber) {
      alert('Please fill out all mandatory fields: Name, Brand, Model, Serial Number.');
      return;
    }

    setLoading(true);
    try {
      await fetchApi('/equipment', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      alert(`Equipment record "${form.equipmentId}" successfully created in Master Inventory.`);
      router.push('/equipment');
    } catch (err: any) {
      alert(err.message || 'Failed to create equipment record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/equipment"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-blue-600" />
                Add New Master Equipment Record
              </h1>
          </div>
        </div>

        {/* Creation Form Card */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Equipment ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Equipment ID (Permanent Code) *
              </label>
              <input
                type="text"
                required
                value={form.equipmentId || nextEqId}
                onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-cyan-700 focus:outline-none focus:border-cyan-500 focus:bg-white"
                placeholder="EQ-000001"
              />
              <p className="text-[10px] text-slate-500 mt-1">Unique permanent code (e.g. EQ-000001). Never changed after creation.</p>
            </div>

            {/* Equipment Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Equipment Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. Sony A7 IV Cinema Body"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <input
                type="text"
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                list="category-options"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. Camera Body, Lens, Lighting, Audio, Drone"
              />
              <datalist id="category-options">
                <option value="Camera Body" />
                <option value="Lens & Optics" />
                <option value="Lighting & Flash" />
                <option value="Audio & Microphones" />
                <option value="Gimbal & Stabilization" />
                <option value="Drone & Aerial" />
                <option value="Tripods & Supports" />
                <option value="Monitors & Wireless" />
                <option value="Batteries & Power" />
              </datalist>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Brand *
              </label>
              <input
                type="text"
                required
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. Sony, Canon, RED, Aputure, DJI"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Model *
              </label>
              <input
                type="text"
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. Alpha 7 IV, 24-70mm f/2.8 GM II"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Serial Number *
              </label>
              <input
                type="text"
                required
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. SN-89240189"
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Purchase Date
              </label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            {/* Purchase Cost (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Purchase Cost (Optional)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.purchaseCost}
                onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. 2499.00"
              />
            </div>

            {/* Current Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Current Status *
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="CHECKED_OUT">CHECKED_OUT</option>
                <option value="IN_USE">IN_USE</option>
                <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                <option value="DAMAGED">DAMAGED</option>
                <option value="LOST">LOST</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>

            {/* Storage Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Storage Location *
              </label>
              <input
                type="text"
                required
                value={form.storageLocation}
                onChange={(e) => setForm({ ...form, storageLocation: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                placeholder="e.g. Studio A - Shelf 2B"
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Internal Technical Notes
            </label>
            <textarea
              rows={3}
              value={form.internalNotes}
              onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
              placeholder="e.g. Includes original Sony FE 24-70mm lens, 2x NP-FZ100 batteries, dual charger, and Pelican case."
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link
              href="/equipment"
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? 'Creating Equipment...' : 'Create Equipment Master Record'}
            </button>
          </div>
        </form>
      </div>
    </RoleGuard>
  );
}
