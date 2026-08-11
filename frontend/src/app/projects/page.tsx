'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  Film,
  Plus,
  MapPin,
  Calendar,
  CloudRain,
  Truck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [shootType, setShootType] = useState<'INDOOR' | 'OUTDOOR'>('INDOOR');
  const [clientId, setClientId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productId, setProductId] = useState('');
  const [shootDate, setShootDate] = useState(new Date().toISOString().split('T')[0]);
  const [influencerTalent, setInfluencerTalent] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // Indoor specific form fields
  const [studioName, setStudioName] = useState('Studio 4 - Product Bay');
  const [studioAddress, setStudioAddress] = useState('Media Ops HQ Floor 2');

  // Outdoor specific form fields
  const [outdoorLocation, setOutdoorLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [permissionStatus, setPermissionStatus] = useState('PENDING');
  const [weatherStatus, setWeatherStatus] = useState('RISK_RAIN');
  const [transportationReq, setTransportationReq] = useState(true);
  const [driver, setDriver] = useState('');
  const [droneRequirement, setDroneRequirement] = useState(false);

  const loadData = async () => {
    try {
      let query = '?';
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (selectedClient) query += `clientId=${selectedClient}&`;
      if (selectedBrand) query += `brandId=${selectedBrand}&`;
      if (selectedType) query += `shootType=${selectedType}&`;
      if (selectedStatus) query += `status=${selectedStatus}&`;

      const [resProjects, resClients, resBrands, resProducts] = await Promise.all([
        fetchApi(`/projects${query}`),
        fetchApi('/clients'),
        fetchApi('/brands'),
        fetchApi('/products'),
      ]);
      setProjects(Array.isArray(resProjects) ? resProjects : []);
      setClients(Array.isArray(resClients) ? resClients : []);
      setBrands(Array.isArray(resBrands) ? resBrands : []);
      setProducts(Array.isArray(resProducts) ? resProducts : []);
    } catch (err) {
      console.error('Failed to load project data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedClient, selectedBrand, selectedType, selectedStatus]);

  const activeClients = (clients || []).filter((c) => c?.status === 'ACTIVE');
  const activeBrands = (brands || []).filter(
    (b) => b?.status === 'ACTIVE' && (!clientId || b.clientId === clientId)
  );

  const openCreateModal = () => {
    const defaultClient = activeClients[0];
    const defaultClientId = defaultClient?.id || '';
    const defaultBrands = (brands || []).filter(
      (b) => b?.status === 'ACTIVE' && (!defaultClientId || b.clientId === defaultClientId)
    );

    setClientId(defaultClientId);
    setBrandId(defaultBrands[0]?.id || '');
    setProductId('');
    setShootDate(new Date().toISOString().split('T')[0]);
    setInfluencerTalent('');
    setStudioName('Studio 4 - Product Bay');
    setOutdoorLocation('');
    setShowModal(true);
  };

  const handleClientChange = (selectedCId: string) => {
    setClientId(selectedCId);
    const linkedBrands = (brands || []).filter(
      (b) => b?.status === 'ACTIVE' && b.clientId === selectedCId
    );
    setBrandId(linkedBrands[0]?.id || '');
    setProductId('');
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      alert('An Active Client is required to create a shoot project.');
      return;
    }
    if (!brandId) {
      alert('An Active Brand is required to create a shoot project.');
      return;
    }

    try {
      const payload: any = {
        shootType,
        clientId,
        brandId,
        productId: productId || undefined,
        shootDate,
        influencerTalent,
        priority,
        shootLocation: shootType === 'INDOOR' ? studioName : outdoorLocation,
      };

      if (shootType === 'INDOOR') {
        payload.indoorDetails = {
          studioName,
          studioAddress: studioAddress || studioName,
        };
      } else {
        payload.outdoorDetails = {
          outdoorLocation,
          locationAddress: locationAddress || outdoorLocation,
          permissionStatus,
          weatherStatus,
          transportationReq,
          driver: driver || undefined,
          droneRequirement,
        };
      }

      await fetchApi('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create shoot project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-blue-400" /> Media Shoot Projects Directory
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Create and track Indoor Studio shoots vs Outdoor Field shoots. Projects can only be created for Active Clients and Brands.
          </p>
        </div>

        {user?.role === 'MEDIA_MANAGER' && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
          >
            <Plus className="w-4 h-4" /> Create Shoot Project
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-card border border-border p-4 rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search Project ID, Name, Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Clients</option>
          {(clients || []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.status})
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Shoot Types</option>
          <option value="INDOOR">INDOOR Studio</option>
          <option value="OUTDOOR">OUTDOOR Field</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="PLANNED">PLANNED</option>
          <option value="READY_FOR_PRODUCTION">READY FOR PRODUCTION</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="WAITING_FOR_TECHNICAL_REVIEW">WAITING TECH REVIEW</option>
          <option value="WAITING_FOR_MEDIA_REVIEW">WAITING MEDIA REVIEW</option>
          <option value="WAITING_FOR_CLIENT_CONFIRMATION">WAITING CLIENT CONFIRMATION</option>
          <option value="CLIENT_REVISION_REQUESTED">REVISION REQUESTED</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-8 text-center bg-card border border-border rounded-xl text-gray-400">
          No shoot projects found matching criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`bg-card border p-5 rounded-xl space-y-4 relative flex flex-col justify-between transition-all hover:border-gray-700 ${
                proj.shootType === 'INDOOR' ? 'border-blue-900/40' : 'border-emerald-900/40'
              }`}
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400 block">{proj.projectId}</span>
                    <h3 className="text-base font-bold text-white leading-snug">{proj.name}</h3>
                  </div>

                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      proj.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : proj.status === 'CLIENT_REVISION_REQUESTED'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {proj.status ? proj.status.replace(/_/g, ' ') : 'PLANNED'}
                  </span>
                </div>

                {/* Parent Client & Brand */}
                <div className="text-xs text-gray-400 flex items-center justify-between border-y border-border py-2">
                  <div>Client: <strong className="text-gray-200">{proj.client?.name}</strong></div>
                  <div>Brand: <strong className="text-blue-400">[{proj.brand?.shortCode}] {proj.brand?.name}</strong></div>
                </div>

                {/* Location & Shoot Date */}
                <div className="space-y-1 text-xs text-gray-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{proj.shootLocation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(proj.shootDate).toLocaleDateString()}</span>
                    {proj.influencerTalent && <span>• Talent: {proj.influencerTalent}</span>}
                  </div>
                </div>

                {/* Warnings Section for Outdoor Shoots */}
                {proj.shootType === 'OUTDOOR' && proj.outdoorDetails && (
                  <div className="space-y-1.5 pt-1">
                    {proj.outdoorDetails.permissionStatus === 'PENDING' && (
                      <div className="p-2 bg-amber-950/30 border border-amber-800/40 rounded text-[11px] text-amber-300 flex items-center gap-1.5 font-medium">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Warning: Permit Application Pending</span>
                      </div>
                    )}

                    {proj.outdoorDetails.weatherStatus === 'RISK_RAIN' && (
                      <div className="p-2 bg-purple-950/30 border border-purple-800/40 rounded text-[11px] text-purple-300 flex items-center gap-1.5 font-medium">
                        <CloudRain className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>Warning: Rain / Weather Risk Alert</span>
                      </div>
                    )}

                    {proj.outdoorDetails.transportationReq && !proj.outdoorDetails.driver && (
                      <div className="p-2 bg-red-950/30 border border-red-800/40 rounded text-[11px] text-red-300 flex items-center gap-1.5 font-medium">
                        <Truck className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>Warning: Transportation Driver Not Assigned</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="text-[11px] text-gray-400">
                  Revision Count: <strong className="text-amber-400">{proj.revisionCount || 0}</strong>
                </div>

                <Link
                  href={`/projects/${proj.id}`}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Workspace <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleCreateProject} className="bg-card border border-border rounded-xl w-full max-w-xl p-6 space-y-4 text-xs my-8">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold text-white">Create New Shoot Project</h2>
              <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Only Active Clients & Brands Allowed
              </span>
            </div>

            {/* Shoot Type Toggle */}
            <div className="space-y-1">
              <label className="block text-gray-300 font-semibold mb-1">Shoot Type (Mandatory Selection)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShootType('INDOOR')}
                  className={`p-3 rounded-lg border text-center font-bold transition-all ${
                    shootType === 'INDOOR'
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-lg'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  INDOOR SHOOT
                </button>

                <button
                  type="button"
                  onClick={() => setShootType('OUTDOOR')}
                  className={`p-3 rounded-lg border text-center font-bold transition-all ${
                    shootType === 'OUTDOOR'
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-lg'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white'
                  }`}
                >
                  OUTDOOR SHOOT
                </button>
              </div>
            </div>

            {/* Client & Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Active Client *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold"
                >
                  <option value="">Select Active Client</option>
                  {activeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyName})
                    </option>
                  ))}
                </select>
                {activeClients.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">No active clients found! Onboard an active client first.</p>
                )}
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Active Brand *</label>
                <select
                  required
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold"
                >
                  <option value="">Select Active Brand</option>
                  {activeBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.shortCode}] {b.name}
                    </option>
                  ))}
                </select>
                {clientId && activeBrands.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">This client has no active brands!</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Shoot Date *</label>
                <input
                  type="date"
                  required
                  value={shootDate}
                  onChange={(e) => setShootDate(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Influencer / Talent</label>
                <input
                  type="text"
                  placeholder="e.g. Devika Sharma"
                  value={influencerTalent}
                  onChange={(e) => setInfluencerTalent(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg"
                />
              </div>
            </div>

            {/* Dynamic Form Sections based on Shoot Type */}
            {shootType === 'INDOOR' ? (
              <div className="p-4 bg-blue-950/20 border border-blue-800/40 rounded-lg space-y-3">
                <h4 className="font-bold text-blue-300">Indoor Studio Operational Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Studio Name *</label>
                    <input
                      type="text"
                      required
                      value={studioName}
                      onChange={(e) => setStudioName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Studio Address</label>
                    <input
                      type="text"
                      value={studioAddress}
                      onChange={(e) => setStudioAddress(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg space-y-3">
                <h4 className="font-bold text-emerald-300">Outdoor Shoot Operational Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Outdoor Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juhu Beach Promenade"
                      value={outdoorLocation}
                      onChange={(e) => setOutdoorLocation(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Permission Status</label>
                    <select
                      value={permissionStatus}
                      onChange={(e) => setPermissionStatus(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold"
                    >
                      <option value="PENDING">PENDING (Triggers Warning)</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="NOT_REQUIRED">NOT REQUIRED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Weather Status</label>
                    <select
                      value={weatherStatus}
                      onChange={(e) => setWeatherStatus(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg font-semibold"
                    >
                      <option value="FAVORABLE">FAVORABLE</option>
                      <option value="RISK_RAIN">RISK RAIN (Triggers Warning)</option>
                      <option value="EXTREME_HEAT">EXTREME HEAT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Driver Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="Leave empty for warning"
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                Create Shoot Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
