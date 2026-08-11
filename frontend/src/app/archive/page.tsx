'use client';

import React, { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { Archive, ArrowRight, ShieldAlert } from 'lucide-react';

export default function ArchivePage() {
  const [archivedProjects, setArchivedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/projects?archived=true');
        setArchivedProjects(data);
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
          <Archive className="w-5 h-5 text-purple-400" /> Read-Only Production Archive
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Archived projects preserve complete history and deliverables while operating in read-only mode.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading Archived Records...</div>
      ) : archivedProjects.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-xl text-gray-400">
          No archived projects currently in database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivedProjects.map((p) => (
            <div key={p.id} className="bg-card border border-border p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-purple-400">{p.projectId}</span>
                <span className="px-2 py-0.5 bg-gray-900 text-gray-400 border border-gray-800 rounded text-[10px] font-bold">
                  READ ONLY ARCHIVE
                </span>
              </div>
              <h3 className="font-bold text-white text-sm">{p.name}</h3>
              <p className="text-gray-400">{p.client?.name} • {p.brand?.name}</p>
              <Link href={`/projects/${p.id}`} className="text-blue-400 font-bold inline-flex items-center gap-1">
                View Historical File Repository <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
