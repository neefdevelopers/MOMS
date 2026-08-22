'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from './api';
import { paginateData } from '@/components/common/PaginationControls';

let cachedDefaultPageSize: number | null = null;
let isFetchingDefault = false;
const fetchPromises: Array<(val: number | null) => void> = [];

export function usePagination(defaultFallback: number = 10) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(cachedDefaultPageSize ?? defaultFallback);
  const [systemDefaultLoaded, setSystemDefaultLoaded] = useState<boolean>(cachedDefaultPageSize !== null);

  useEffect(() => {
    if (cachedDefaultPageSize !== null) {
      setPageSize(cachedDefaultPageSize);
      setSystemDefaultLoaded(true);
      return;
    }

    if (isFetchingDefault) {
      fetchPromises.push((size) => {
        if (size !== null) setPageSize(size);
        setSystemDefaultLoaded(true);
      });
      return;
    }

    isFetchingDefault = true;
    fetchApi('/settings/default-page-size')
      .then((res) => {
        if (res?.defaultPageSize && typeof res.defaultPageSize === 'number') {
          cachedDefaultPageSize = res.defaultPageSize;
          setPageSize(res.defaultPageSize);
          fetchPromises.forEach((cb) => cb(res.defaultPageSize));
        } else {
          fetchPromises.forEach((cb) => cb(null));
        }
      })
      .catch(() => {
        fetchPromises.forEach((cb) => cb(null));
      })
      .finally(() => {
        isFetchingDefault = false;
        fetchPromises.length = 0;
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
