'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EquipmentDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/equipment/monitoring');
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium text-xs">
      Redirecting to Equipment Monitoring...
    </div>
  );
}
