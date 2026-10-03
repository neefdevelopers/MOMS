'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EquipmentReservationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/equipment');
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium text-xs">
      Redirecting to All Equipment...
    </div>
  );
}
