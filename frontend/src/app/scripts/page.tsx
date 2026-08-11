'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { FileText } from 'lucide-react';

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/scripts');
        setScripts(data);
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
          <FileText className="w-5 h-5 text-blue-400" /> Media Scripts Repository
        </h1>
        <p className="text-xs text-gray-400 mt-1">Script ID format: SCR-00000X</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Scripts...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scripts.map((s) => (
            <div key={s.id} className="bg-card border border-border p-5 rounded-xl space-y-2">
              <div className="flex justify-between font-mono font-bold text-blue-400">
                <span>{s.scriptId}</span>
                <span className="text-gray-400">{s.category} • {s.language}</span>
              </div>
              <h3 className="font-bold text-white text-sm">{s.name}</h3>
              <p className="text-gray-400">{s.objective}</p>
              <div className="pt-2 border-t border-gray-800 text-gray-500">
                Project: {s.project?.name} ({s.brand?.name})
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
