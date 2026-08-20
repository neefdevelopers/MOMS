'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from './api';

export type RecentEntityType =
  | 'PROJECT'
  | 'SCRIPT'
  | 'REPORT'
  | 'EQUIPMENT'
  | 'GRAPHIC_REQUIREMENT'
  | 'TASK';

export interface RecentAccessRecord {
  id: string;
  userId: string;
  entityType: RecentEntityType;
  entityId: string;
  title: string;
  code?: string | null;
  url: string;
  metadata?: string | null;
  accessedAt: string;
}

export interface RecordRecentAccessPayload {
  entityType: RecentEntityType;
  entityId: string;
  title: string;
  code?: string;
  url: string;
  metadata?: Record<string, any> | string;
}

/**
 * Non-blocking helper to log an access event
 */
export function recordRecentAccess(payload: RecordRecentAccessPayload) {
  try {
    fetchApi('/recent-access', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).catch(() => {
      // Ignore background tracking failures gracefully
    });
  } catch (err) {
    // Ignore error
  }
}

export function useRecentAccess(limit = 15, entityType?: string) {
  const [recentRecords, setRecentRecords] = useState<RecentAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (entityType && entityType !== 'ALL') {
        params.append('entityType', entityType);
      }

      const res = await fetchApi(`/recent-access?${params.toString()}`);
      setRecentRecords(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load recent access records:', err);
    } finally {
      setLoading(false);
    }
  }, [limit, entityType]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  return {
    recentRecords,
    loading,
    refresh: fetchRecent,
  };
}
