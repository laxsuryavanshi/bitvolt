'use client';

import React, { Suspense, useCallback } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { FileExplorer } from '@/components/file-explorer';

const AppInternal: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialPath = searchParams.get('path') ?? '';

  const handlePathChange = useCallback(
    (path: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (path) {
        params.set('path', path);
      } else {
        params.delete('path');
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return <FileExplorer initialPath={initialPath} onPathChange={handlePathChange} />;
};

const App: React.FC = () => (
  <Suspense>
    <AppInternal />
  </Suspense>
);

export default App;
