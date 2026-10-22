'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function DangNhapRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/auth/login${query ? `?${query}` : ''}`);
  }, [router, searchParams]);

  return null;
}

export default function DangNhapPage() {
  return (
    <Suspense fallback={null}>
      <DangNhapRedirect />
    </Suspense>
  );
}
