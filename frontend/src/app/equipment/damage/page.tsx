'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EquipmentDamageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/equipment/maintenance');
  }, [router]);

  return (
    <div className="p-12 text-center text-slate-500 font-medium text-xs">
      Redirecting to Damage & Maintenance...
    </div>
  );
}
