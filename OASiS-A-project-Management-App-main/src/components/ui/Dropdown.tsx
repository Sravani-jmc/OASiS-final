'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

type Option = {
  value: string;
  label: string;
};

type DropdownProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  placeholder?: string;
};

const Dropdown = ({ 
  label, 
  value, 
  onChange, 
  options, 
  className = '', 
  placeholder = 'Select option' 
}: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`mr-2 ${!selectedOption ? 'text-gray-400' : 'text-gray-700'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      </div>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <ul className="py-1 overflow-auto text-sm max-h-60 focus:outline-none">
            {options.map((option) => (
              <li
                key={option.value}
                className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 ${
                  option.value === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                }`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dropdown; 