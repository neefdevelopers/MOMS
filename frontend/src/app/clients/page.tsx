'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Building2, Search, Plus, Filter, Edit, Eye, CheckCircle, Clock, AlertTriangle, Archive } from 'lucide-react';
import { TableSortHeader, SortSelector } from '@/components/common/TableSortHeader';
import { PaginationControls } from '@/components/common/PaginationControls';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { RouteGuard } from '@/components/common/RouteGuard';
import { usePagination } from '@/lib/usePagination';
import { sortData, SortField, SortOrder } from '@/utils/sortUtils';
import { FavoriteButton } from '@/components/common/FavoriteButton';

export default function ClientsPage() {
  return (
    <RouteGuard module="CLIENTS">
      <ClientsContent />
    </RouteGuard>
  );
}

function ClientsContent() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination Hook
  const { currentPage, setCurrentPage, pageSize, setPageSize, paginate } = usePagination();

  // Sorting State
  const [sortBy, setSortBy] = useState<SortField | string>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField | string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [viewingClient, setViewingClient] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    gstNumber: '',
    website: '',
    status: 'ACTIVE',
    onboardingDate: new Date().toISOString().split('T')[0],
    internalNotes: '',
  });

  const loadClients = async () => {
    try {
      let url = '/clients';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetchApi(url);
      setClients(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [search, statusFilter]);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and optional leading +
    const val = e.target.value;
    const numericVal = val.replace(/[^\d+]/g, '');
    setFormData({ ...formData, mobile: numericVal });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await fetchApi(`/clients/${editingClient.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await fetchApi('/clients', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowAddModal(false);
      setEditingClient(null);
      resetForm();
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to save client');
    }
  };

  const [archiveTargetClient, setArchiveTargetClient] = useState<any>(null);
  const [archiving, setArchiving] = useState(false);

  const handleArchiveClient = (client: any) => {
    setArchiveTargetClient(client);
  };

  const confirmArchiveClient = async () => {
    if (!archiveTargetClient) return;
    setArchiving(true);
    try {
      await fetchApi(`/clients/${archiveTargetClient.id}`, {
        method: 'DELETE',
      });
      setArchiveTargetClient(null);
      loadClients();
    } catch (err: any) {
      alert(err.message || 'Failed to archive client');
    } finally {
      setArchiving(false);
    }
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      companyName: client.companyName || '',
      contactPerson: client.contactPerson || '',
      mobile: client.mobile || '',
      email: client.email || '',
      address: client.address || '',
      gstNumber: client.gstNumber || '',
      website: client.website || '',
      status: client.status || 'ACTIVE',
      onboardingDate: client.onboardingDate ? new Date(client.onboardingDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      internalNotes: client.internalNotes || '',
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      companyName: '',
      contactPerson: '',
      mobile: '',
      email: '',
      address: '',
      gstNumber: '',
      website: '',
      status: 'ACTIVE',
      onboardingDate: new Date().toISOString().split('T')[0],
      internalNotes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> Active</span>;
      case 'ON_HOLD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1 w-max"><Clock className="w-3 h-3" /> On Hold</span>;
      case 'INACTIVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-500/20 text-slate-500 border border-gray-500/30 flex items-center gap-1 w-max"><AlertTriangle className="w-3 h-3" /> Inactive</span>;
      case 'ARCHIVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 w-max"><Archive className="w-3 h-3" /> Archived</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" /> Client Operations Directory
          </h1>
        </div>

        {((user?.role as string) === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMIN' || (user?.role as string) === 'ADMINISTRATOR') && (
          <button
            onClick={() => {
              resetForm();
              setEditingClient(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/30 w-max"
          >
            <Plus className="w-4 h-4" /> Add New Client
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white border border-slate-200 p-4 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Client Name, Company, Contact Person, Email, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 focus:bg-white w-full sm:w-auto"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ON_HOLD">ON HOLD</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          <SortSelector
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(f, o) => {
              setSortBy(f);
              setSortOrder(o);
            }}
          />
        </div>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading Clients...</div>
      ) : clients.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-slate-500">
          No clients found matching filters.
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-4">
                  <TableSortHeader
                    label="Client Name"
                    field="name"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">
                  <TableSortHeader
                    label="Contact Person"
                    field="contactPerson"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">Active Brands</th>
                <th className="p-4">
                  <TableSortHeader
                    label="Status"
                    field="status"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4">
                  <TableSortHeader
                    label="Created Date"
                    field="createdAt"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    onSort={handleSort}
                  />
                </th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-slate-800">
              {paginate(sortData(clients, sortBy, sortOrder)).map((client) => {
                const createdDateStr = client.createdAt
                  ? new Date(client.createdAt).toLocaleDateString()
                  : 'N/A';
                const activeBrandsCount = (client.brands || []).filter(
                  (b: any) => b?.status === 'ACTIVE'
                ).length;

                return (
                  <tr key={client.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{client.name}</span>
                      <span className="text-[10px] text-slate-500">{client.companyName}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-medium text-slate-800 block">{client.contactPerson}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{client.mobile}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-mono font-bold text-blue-600">
                        {activeBrandsCount} Active Brand{activeBrandsCount !== 1 ? 's' : ''}
                      </span>
                    </td>

                    <td className="p-4">{getStatusBadge(client.status)}</td>

                    <td className="p-4 font-mono text-slate-500 text-[11px]">
                      {createdDateStr}
                    </td>

                    <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                      <FavoriteButton
                        entityType="CLIENT"
                        entityId={client.id}
                        title={client.name}
                        url="/clients"
                        metadata={{ subtitle: client.companyName || 'Client' }}
                        className="inline-flex"
                      />
                      {/* View Action */}
                      <button
                        onClick={() => setViewingClient(client)}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                        title="View Client Inspector"
                      >
                        <Eye className="w-3 h-3" /> View
                      </button>

                      {/* Edit Action */}
                      {((user?.role as string) === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMIN' || (user?.role as string) === 'ADMINISTRATOR') && (
                        <button
                          onClick={() => openEdit(client)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-600/30 text-blue-600 border border-blue-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                          title="Edit Client Record"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                      )}

                      {/* Archive Action */}
                      {((user?.role as string) === 'MARKETING_MANAGER' || (user?.role as string) === 'ADMIN' || (user?.role as string) === 'ADMINISTRATOR') && client.status !== 'ARCHIVED' && (
                        <button
                          onClick={() => handleArchiveClient(client)}
                          className="px-2 py-1 bg-rose-50 hover:bg-red-600/30 text-rose-600 border border-rose-200 rounded font-semibold text-[11px] inline-flex items-center gap-1"
                          title="Archive Client Record"
                        >
                          <Archive className="w-3 h-3" /> Archive
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={clients.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {/* Add / Edit Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
              {editingClient ? 'Edit Client Record' : 'Onboard New Client'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Client Display Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. ABC Healthcare"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Registered Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g. ABC Healthcare Pvt Ltd"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Primary Contact Person *</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Dr. Suresh Mehta"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Mobile Number (Digits Only) *</label>
                <input
                  type="tel"
                  required
                  pattern="[0-9+]*"
                  value={formData.mobile}
                  onChange={handleMobileChange}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. contact@abchealthcare.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Client Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white font-semibold"
                >
                  <option value="ACTIVE">ACTIVE (Can receive projects)</option>
                  <option value="ON_HOLD">ON HOLD (Temporarily paused)</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED (ReadOnly historical)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">GST Number</label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Website URL</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1 font-semibold">Onboarding Date</label>
                <input
                  type="date"
                  value={formData.onboardingDate}
                  onChange={(e) => setFormData({ ...formData, onboardingDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Company Address</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
              ></textarea>
            </div>

            <div>
              <label className="text-slate-500 block mb-1 font-semibold">Internal Notes</label>
              <textarea
                rows={2}
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                placeholder="Operational notes, retainer scope, contract highlights..."
                className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-white"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingClient(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30"
              >
                {editingClient ? 'Save Changes' : 'Onboard Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Client Modal */}
      {viewingClient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{viewingClient.name}</h2>
                <p className="text-slate-500">{viewingClient.companyName}</p>
              </div>
              {getStatusBadge(viewingClient.status)}
            </div>

            <div className="grid grid-cols-2 gap-4 text-slate-700">
              <div>
                <span className="text-slate-400 block">Contact Person:</span>
                <span className="font-bold text-slate-900">{viewingClient.contactPerson}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Mobile:</span>
                <span className="font-bold text-slate-900 font-mono">{viewingClient.mobile}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Email:</span>
                <span className="font-bold text-slate-900">{viewingClient.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block">GST Number:</span>
                <span className="font-mono text-slate-800">{viewingClient.gstNumber || 'N/A'}</span>
              </div>
            </div>

            {viewingClient.address && (
              <div>
                <span className="text-slate-400 block mb-0.5">Address:</span>
                <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">{viewingClient.address}</p>
              </div>
            )}

            {viewingClient.internalNotes && (
              <div>
                <span className="text-slate-400 block mb-0.5">Internal Notes:</span>
                <p className="p-2 bg-slate-50 rounded border border-slate-200 text-slate-700">{viewingClient.internalNotes}</p>
              </div>
            )}

            <div className="border-t border-slate-200 pt-3">
              <span className="text-slate-500 font-bold block mb-2">Associated Brands ({viewingClient.brands?.length || 0})</span>
              <div className="flex flex-wrap gap-2">
                {viewingClient.brands?.map((b: any) => (
                  <span key={b.id} className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-blue-600 rounded font-bold font-mono">
                    [{b.shortCode}] {b.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingClient(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Client Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!archiveTargetClient}
        onClose={() => setArchiveTargetClient(null)}
        onConfirm={confirmArchiveClient}
        type="ARCHIVE_PROJECT"
        title={`Archive Client '${archiveTargetClient?.name}'?`}
        description={`Are you sure you want to archive client record '${archiveTargetClient?.name}' (${archiveTargetClient?.companyName})?`}
        consequences="Consequence: The client status will be set to ARCHIVED. Existing active projects must be completed or reassigned. No new projects can be assigned to archived clients."
        confirmLabel="Archive Client"
        loading={archiving}
      />
    </div>
  );
}
