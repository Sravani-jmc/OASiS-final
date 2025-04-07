'use client';

import React from 'react';
import { useLanguage } from '../providers/LanguageProvider';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

interface LanguageSwitcherProps {
  variant?: 'default' | 'minimal' | 'login';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  variant = 'default',
  className = ''
}) => {
  const { language, setLanguage, t } = useLanguage();

  // If using login variant, apply the login-specific styling
  if (variant === 'login') {
    return (
      <select 
        value={language} 
        onChange={(e) => setLanguage(e.target.value as 'ja' | 'en')}
        className="appearance-none bg-transparent px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 cursor-pointer"
        aria-label={t('app.language')}
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
      </select>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {variant === 'default' && (
        <GlobeAltIcon className="h-5 w-5 text-gray-500 mr-2" />
      )}
      
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'ja' | 'en')}
        className="bg-transparent border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
        aria-label={t('app.language')}
      >
        <option value="ja">日本語</option>
        <option value="en">English</option>
      </select>
    </div>
  );
};

export default LanguageSwitcher; 