'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Camera, Plus, Wrench, ShieldCheck, ArrowRightLeft, UserCheck } from 'lucide-react';

export default function EquipmentPage() {
  const { user } = useAuth();
  const [equipment, setEquipment] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEquipment = async () => {
    try {
      const data = await fetchApi('/equipment');
      setEquipment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  const handleUpdateMaintenance = async (id: string, maintenanceStatus: string) => {
    try {
      await fetchApi(`/equipment/${id}/maintenance`, {
        method: 'PATCH',
        body: JSON.stringify({ maintenanceStatus }),
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to update maintenance');
    }
  };

  const handleReturnEquipment = async (id: string) => {
    try {
      await fetchApi(`/equipment/${id}/movement`, {
        method: 'POST',
        body: JSON.stringify({ action: 'RETURNED', notes: 'Returned to studio bay' }),
      });
      loadEquipment();
    } catch (err: any) {
      alert(err.message || 'Failed to log equipment return');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-cyan-400" /> Equipment & Asset Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">Track camera, lens, lighting & drone movements. Tech Manager controls maintenance.</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Equipment Inventory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eqp) => (
            <div key={eqp.id} className="bg-card border border-border p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                  {eqp.equipmentId}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    eqp.availability === 'AVAILABLE'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : eqp.availability === 'ISSUED'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {eqp.availability}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{eqp.name}</h3>
                <p className="text-xs text-gray-400">{eqp.brand} {eqp.model} • SN: {eqp.serialNumber}</p>
              </div>

              {eqp.currentHolder && (
                <div className="p-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300 flex items-center justify-between">
                  <span>Current Holder: <strong className="text-white">{eqp.currentHolder}</strong></span>
                  <button
                    onClick={() => handleReturnEquipment(eqp.id)}
                    className="text-[10px] px-2 py-0.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold"
                  >
                    Return Item
                  </button>
                </div>
              )}

              {(user?.role === 'TECHNICAL_MANAGER' || user?.role === 'MEDIA_MANAGER') && (
                <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Maintenance Status:</span>
                  <select
                    value={eqp.maintenanceStatus}
                    onChange={(e) => handleUpdateMaintenance(eqp.id, e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded text-[11px]"
                  >
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="NEEDS_SERVICE">NEEDS SERVICE</option>
                    <option value="UNDER_REPAIR">UNDER REPAIR</option>
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
