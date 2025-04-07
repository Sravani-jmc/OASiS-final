import React from 'react';

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onChange,
  label,
  disabled = false,
}) => {
  return (
    <div className="flex items-center">
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => onChange(!checked)}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`${
            checked ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
      {label && (
        <label htmlFor={id} className="ml-3 text-sm text-gray-700 cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}; 