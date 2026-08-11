'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Palette } from 'lucide-react';

export default function GraphicReqsPage() {
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/graphic-reqs');
        setReqs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 text-xs">
      <div className="bg-card border border-border p-6 rounded-xl">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-400" /> Graphic Requirements
        </h1>
        <p className="text-xs text-gray-400 mt-1">Graphic requirement format: GR-00000X</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Graphic Requirements...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reqs.map((g) => (
            <div key={g.id} className="bg-card border border-border p-5 rounded-xl space-y-2">
              <div className="flex justify-between font-mono font-bold text-purple-400">
                <span>{g.requirementId}</span>
                <span className="text-gray-400">{g.requirementType}</span>
              </div>
              <h3 className="font-bold text-white text-sm">{g.name}</h3>
              <p className="text-gray-400">{g.objective}</p>
              <div className="pt-2 border-t border-gray-800 text-gray-500">
                Project: {g.project?.name} ({g.brand?.name})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
