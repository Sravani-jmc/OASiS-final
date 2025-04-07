import React, { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

// Define a single interface for our component
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  options: SelectOption[];
  error?: string;
  className?: string;
  fullWidth?: boolean;
  onChange?(value: string): void;
  icon?: ReactNode;
}

// Export as SelectComponent to avoid naming conflicts
export const SelectComponent = forwardRef<HTMLSelectElement, SelectProps>(
  function SelectImpl({ label, options, error, className = '', fullWidth = true, onChange, icon, ...props }, ref) {
    const widthClass = fullWidth ? 'w-full' : '';
    const errorClass = error ? 'border-sakura-600 focus:ring-sakura-500 focus:border-sakura-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500';
    const paddingClass = icon ? 'pl-10' : '';

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

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
          <select
            ref={ref}
            className={`block rounded-md shadow-sm sm:text-sm p-2
              ${errorClass} ${widthClass} ${paddingClass}`}
            onChange={handleChange}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="mt-1 text-sm text-sakura-600">{error}</p>
        )}
      </div>
    );
  }
);

SelectComponent.displayName = 'Select'; 