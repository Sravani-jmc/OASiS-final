import React from 'react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullPage?: boolean;
}

export function Loading({ size = 'md', className = '', fullPage = false }: LoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-3',
    lg: 'h-16 w-16 border-4',
  };

  const spinner = (
    <div
      className={`inline-block rounded-full border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin ${sizeClasses[size]} ${className}`}
    />
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center py-6">
      {spinner}
    </div>
  );
} 