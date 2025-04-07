import React, { InputHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
  fullWidth?: boolean;
  icon?: ReactNode;
}

// Create as an unnamed forward ref component
export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  function FormInput({ label, error, className = '', fullWidth = true, icon, ...props }, ref) {
    const widthClass = fullWidth ? 'w-full' : '';
    const errorClass = error ? 'border-sakura-600 focus:ring-sakura-500 focus:border-sakura-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500';
    const paddingClass = icon ? 'pl-10' : '';

    return (
      <div className={className}>
        {label && (
          <label htmlFor={props.id} className="block text-sm font-medium text-ink-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`block rounded-md shadow-sm sm:text-sm p-2
              ${errorClass} ${widthClass} ${paddingClass}`}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-sm text-sakura-600">{error}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput'; 