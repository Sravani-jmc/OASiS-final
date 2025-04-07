'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import '@/styles/nprogress.css';

// Configure NProgress
NProgress.configure({
  minimum: 0.1,
  easing: 'ease',
  speed: 300,
  showSpinner: false,
});

export default function LoadingProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Create a handler to start the progress bar
    const handleStart = () => {
      NProgress.start();
    };
    
    // Create a handler to complete the progress bar
    const handleComplete = () => {
      NProgress.done();
    };
    
    // Listen for route changes
    document.addEventListener('routeChangeStart', handleStart);
    document.addEventListener('routeChangeComplete', handleComplete);
    document.addEventListener('routeChangeError', handleComplete);
    
    return () => {
      // Remove event listeners when component unmounts
      document.removeEventListener('routeChangeStart', handleStart);
      document.removeEventListener('routeChangeComplete', handleComplete);
      document.removeEventListener('routeChangeError', handleComplete);
    };
  }, []);
  
  // Also trigger loading indicator on pathname or search params change
  useEffect(() => {
    NProgress.done();
  }, [pathname, searchParams]);
  
  return null; // This component doesn't render anything
} 