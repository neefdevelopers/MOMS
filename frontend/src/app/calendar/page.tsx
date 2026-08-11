'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Calendar as CalendarIcon, Plus, Filter, Video, Sun, AlertTriangle, Clock, Edit, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: month, week, day
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Filters
  const [clientIdFilter, setClientIdFilter] = useState('');
  const [brandIdFilter, setBrandIdFilter] = useState('');
  const [shootTypeFilter, setShootTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    clientId: '',
    brandId: '',
    productId: '',
    shootType: 'INDOOR',
    shootDate: new Date().toISOString().split('T')[0],
    influencerTalent: '',
    priority: 'MEDIUM',
    productionNotes: '',
  });

  const loadData = async () => {
    try {
      let url = '/calendar';
      const params = new URLSearchParams();
      if (clientIdFilter) params.append('clientId', clientIdFilter);
      if (brandIdFilter) params.append('brandId', brandIdFilter);
      if (shootTypeFilter) params.append('shootType', shootTypeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const [resEvents, resClients, resBrands] = await Promise.all([
        fetchApi(url),
        fetchApi('/clients'),
        fetchApi('/brands'),
      ]);

      setEvents(resEvents);
      setClients(resClients);
      setBrands(resBrands);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [clientIdFilter, brandIdFilter, shootTypeFilter, statusFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await fetchApi(`/calendar/${editingEvent.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/calendar', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowAddModal(false);
      setEditingEvent(null);
      resetForm();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save calendar event');
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled shoot event?')) return;
    try {
      await fetchApi(`/calendar/${eventId}/cancel`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel event');
    }
  };

  const openEdit = (eventItem: any) => {
    setEditingEvent(eventItem);
    setFormData({
      title: eventItem.title || '',
      clientId: eventItem.clientId || '',
      brandId: eventItem.brandId || '',
      productId: eventItem.productId || '',
      shootType: eventItem.shootType || 'INDOOR',
      shootDate: eventItem.shootDate ? new Date(eventItem.shootDate).toISOString().split('T')[0] : '',
      influencerTalent: eventItem.influencerTalent || '',
      priority: eventItem.priority || 'MEDIUM',
      productionNotes: eventItem.productionNotes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      clientId: clients.filter((c) => c.status === 'ACTIVE')[0]?.id || '',
      brandId: '',
      productId: '',
      shootType: 'INDOOR',
      shootDate: new Date().toISOString().split('T')[0],
      influencerTalent: '',
      priority: 'MEDIUM',
      productionNotes: '',
    });
  };

  const activeClients = clients.filter((c) => c.status === 'ACTIVE');
  const filteredBrands = brands.filter((b) => !formData.clientId || b.clientId === formData.clientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" /> Operational Media Shoot Calendar
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Centralized calendar for planning Indoor Studio shoots vs Outdoor Field shoots across active client accounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded transition-colors ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Day
            </button>
          </div>

          {user?.role === 'MEDIA_MANAGER' && (
            <button
              onClick={() => {
                resetForm();
                setEditingEvent(null);
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
            >
              <Plus className="w-4 h-4" /> Schedule Event
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border p-4 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={clientIdFilter}
            onChange={(e) => setClientIdFilter(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <select
          value={shootTypeFilter}
          onChange={(e) => setShootTypeFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Shoot Types</option>
          <option value="INDOOR">INDOOR Studio</option>
          <option value="OUTDOOR">OUTDOOR Location</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Event Statuses</option>
          <option value="SCHEDULED">SCHEDULED</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {/* Events Stream / Cards */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Calendar Events...</div>
      ) : events.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No calendar events scheduled for the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((eventItem) => (
            <div
              key={eventItem.id}
              className={`bg-card border p-5 rounded-xl space-y-3 relative transition-all ${
                eventItem.shootType === 'INDOOR' ? 'border-emerald-500/30' : 'border-purple-500/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {eventItem.shootType === 'INDOOR' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Video className="w-3 h-3" /> INDOOR
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                      <Sun className="w-3 h-3" /> OUTDOOR
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-gray-400 uppercase font-mono">
                    {new Date(eventItem.shootDate).toLocaleDateString()}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                    eventItem.status === 'CANCELLED' ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {eventItem.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white line-clamp-1">{eventItem.title}</h3>
                <p className="text-[11px] text-gray-400">
                  {eventItem.client?.name} • <span className="text-blue-400 font-bold">[{eventItem.brand?.shortCode}]</span> {eventItem.brand?.name}
                </p>
              </div>

              {eventItem.influencerTalent && (
                <div className="text-[11px] text-gray-300 bg-gray-900 p-2 rounded border border-gray-800">
                  Talent/Model: <strong className="text-white">{eventItem.influencerTalent}</strong>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-xs">
                {eventItem.shootProjects?.length > 0 ? (
                  <Link
                    href={`/projects/${eventItem.shootProjects[0].id}`}
                    className="text-emerald-400 hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    View Project <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : (
                  user?.role === 'MEDIA_MANAGER' && (
                    <Link
                      href={`/projects?createFromEvent=${eventItem.id}`}
                      className="text-blue-400 hover:underline font-bold text-[11px] flex items-center gap-1"
                    >
                      Convert to Project <ArrowRight className="w-3 h-3" />
                    </Link>
                  )
                )}

                {user?.role === 'MEDIA_MANAGER' && eventItem.status !== 'CANCELLED' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(eventItem)}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded font-semibold text-[10px] flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      onClick={() => handleCancelEvent(eventItem.id)}
                      className="px-2 py-0.5 bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 rounded font-semibold text-[10px] flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-white border-b border-border pb-3">
              {editingEvent ? 'Edit Shoot Calendar Event' : 'Schedule New Shoot Event'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-gray-400 block mb-1 font-semibold">Event Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Ojas Launch Reel Shoot"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Active Client *</label>
                <select
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value, brandId: '' })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="">Select Active Client</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Active Brand *</label>
                <select
                  required
                  value={formData.brandId}
                  onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="">Select Active Brand</option>
                  {filteredBrands.map((b) => (
                    <option key={b.id} value={b.id}>[{b.shortCode}] {b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Shoot Type *</label>
                <select
                  value={formData.shootType}
                  onChange={(e) => setFormData({ ...formData, shootType: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="INDOOR">INDOOR Studio</option>
                  <option value="OUTDOOR">OUTDOOR Location</option>
                </select>
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Shoot Date *</label>
                <input
                  type="date"
                  required
                  value={formData.shootDate}
                  onChange={(e) => setFormData({ ...formData, shootDate: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Influencer / Talent</label>
                <input
                  type="text"
                  value={formData.influencerTalent}
                  onChange={(e) => setFormData({ ...formData, influencerTalent: e.target.value })}
                  placeholder="e.g. Devika (Model)"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 font-semibold">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white font-semibold"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-semibold">Production Notes</label>
              <textarea
                rows={2}
                value={formData.productionNotes}
                onChange={(e) => setFormData({ ...formData, productionNotes: e.target.value })}
                placeholder="Shot requirements, moodboard links..."
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingEvent(null);
                }}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                {editingEvent ? 'Save Event' : 'Schedule Event'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
