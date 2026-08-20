'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from './api';
import { paginateData } from '@/components/common/PaginationControls';

export function usePagination(defaultFallback: number = 10) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultFallback);
  const [systemDefaultLoaded, setSystemDefaultLoaded] = useState<boolean>(false);

  useEffect(() => {
    fetchApi('/settings/default-page-size')
      .then((res) => {
        if (res?.defaultPageSize && typeof res.defaultPageSize === 'number') {
          setPageSize(res.defaultPageSize);
          setSystemDefaultLoaded(true);
        }
      })
      .catch(() => {
        // Fallback gracefully
        setSystemDefaultLoaded(true);
      });
  }, []);

  const paginate = <T>(items: T[]): T[] => {
    return paginateData(items, currentPage, pageSize);
  };

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    paginate,
    systemDefaultLoaded,
  };
}
