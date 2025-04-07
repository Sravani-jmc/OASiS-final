import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white overflow-hidden shadow-soft rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`px-4 py-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`px-4 py-4 sm:px-6 border-t border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </div>
  );
} 