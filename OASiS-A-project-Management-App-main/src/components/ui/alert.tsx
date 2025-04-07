import React from 'react';

type AlertVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  children: React.ReactNode;
}

export function Alert({
  variant = 'default',
  children,
  className = '',
  ...props
}: AlertProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  return (
    <div
      className={`rounded-md p-4 ${variantClasses[variant]} ${className}`}
      role="alert"
      {...props}
    >
      <div className="flex">{children}</div>
    </div>
  );
}

export interface AlertTitleProps {
  children: React.ReactNode;
}

export function AlertTitle({ children }: AlertTitleProps) {
  return <h3 className="text-sm font-medium mr-2">{children}</h3>;
}

export interface AlertDescriptionProps {
  children: React.ReactNode;
}

export function AlertDescription({ children }: AlertDescriptionProps) {
  return <div className="text-sm">{children}</div>;
} 