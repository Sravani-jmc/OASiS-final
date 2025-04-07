'use client';

import { Suspense, ReactNode } from 'react';

/**
 * This component wraps content that uses useSearchParams() in a Suspense boundary
 * to prevent the "useSearchParams() should be wrapped in a suspense boundary" error
 */
export function ClientSearchParamsProvider({ 
  children,
  fallback = <div className="w-full h-full flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
}: { 
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
}

export default ClientSearchParamsProvider; 