import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = ''
}: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-matcha-100 text-matcha-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-sakura-100 text-sakura-800',
    info: 'bg-indigo-100 text-indigo-800',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
} 