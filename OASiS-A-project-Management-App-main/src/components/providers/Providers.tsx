'use client';

import { SessionProvider } from 'next-auth/react';
import LoadingProvider from './LoadingProvider';
import LanguageProvider from './LanguageProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <LoadingProvider />
        {children}
      </LanguageProvider>
    </SessionProvider>
  );
} 