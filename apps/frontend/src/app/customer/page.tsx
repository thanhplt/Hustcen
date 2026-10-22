'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerAliasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/tai-khoan');
  }, [router]);
  return null;
}
