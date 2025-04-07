import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className = '' }: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-ink-600">{description}</p>
          )}
        </div>
        {actions && (
          <div className="mt-4 sm:mt-0">{actions}</div>
        )}
      </div>
    </div>
  );
} 