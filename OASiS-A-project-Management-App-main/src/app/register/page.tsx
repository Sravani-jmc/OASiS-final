'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { UserIcon, LockClosedIcon, EnvelopeIcon, IdentificationIcon, BuildingOfficeIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import '@/styles/login.css';

export default function RegisterPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    department: '',
    position: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update document title based on language
    document.title = language === 'ja' ? 'OASiS アカウント登録' : 'OASiS Registration';
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.username || !formData.email || !formData.password) {
      setError(t('auth.error.required'));
      return;
    }
    
    if (!formData.email.includes('@')) {
      setError(t('auth.error.emailInvalid'));
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.error.passwordMismatch'));
      return;
    }
    
    if (formData.password.length < 8) {
      setError(t('auth.error.passwordLength'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Register the user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          department: formData.department,
          position: formData.position
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || t('auth.error.general'));
      }
      
      // Redirect to login page on success
      router.push('/login?registered=true');
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : t('auth.error.general'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-washi">
      <div className="login-container">
        <div className="login-left-panel">
          {/* Language Switcher */}
          <LanguageSwitcher variant="login" />
          
          <div className="login-box">
            <h1 className="text-indigo-600 text-3xl font-bold tracking-tight mb-1">OASiS</h1>
            <h2 className="text-xl font-semibold mb-2">{t('auth.registerTitle')}</h2>
            <p className="text-gray-600 mb-6">{t('auth.registerInstruction')}</p>
            
            {error && (
              <div className="bg-sakura-50 border border-sakura-400 text-sakura-700 px-4 py-3 rounded-lg mb-6" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="login-input-group">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder={`${t('auth.username')} *`}
                  value={formData.username}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <UserIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="login-input-group">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={`${t('auth.email')} *`}
                  value={formData.email}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <EnvelopeIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="login-input-group">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={`${t('auth.password')} *`}
                  value={formData.password}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <LockClosedIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="login-input-group">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder={`${t('auth.confirmPassword')} *`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <LockClosedIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <p className="text-xs text-gray-500 -mt-2 mb-2">
                {t('auth.error.passwordLength')}
              </p>
              
              <div className="login-input-group">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder={t('auth.fullName')}
                  value={formData.fullName}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <IdentificationIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="login-input-group">
                <input
                  id="department"
                  name="department"
                  type="text"
                  placeholder={t('auth.department')}
                  value={formData.department}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="login-input-group">
                <input
                  id="position"
                  name="position"
                  type="text"
                  placeholder={t('auth.position')}
                  value={formData.position}
                  onChange={handleChange}
                  className="focus:ring-indigo-500 focus:border-indigo-500"
                />
                <BriefcaseIcon className="w-5 h-5 text-gray-500" />
              </div>
              
              <button
                type="submit"
                className="login-button relative mt-6"
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                )}
                <span className={isLoading ? 'opacity-0' : ''}>
                  {isLoading ? t('auth.accountCreation') : t('auth.createAccount')}
                </span>
              </button>
            </form>
            
            <div className="login-divider">
              <span>{t('auth.haveAccount')}</span>
            </div>
            
            <div className="login-register-link">
              <Link href="/login" className="font-medium hover:text-indigo-800 transition-colors">
                {t('auth.login')}
              </Link>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Image and Tagline */}
        <div className="login-right-panel">
          <div className="login-image-container">
            <Image 
              src="/images/project-management.svg" 
              alt="Project Management Illustration" 
              width={380} 
              height={300}
              className="transform transition-transform duration-1000 hover:scale-105"
              priority
            />
          </div>
          <div className="login-jp-text">
            {t('app.welcomeText')}
          </div>
          <div className="login-features">
            <div className="login-feature-item">
              <div className="login-feature-icon">🔐</div>
              <div>
                <h3 className="login-feature-title">Secure Access</h3>
                <p className="login-feature-desc">Your data is always protected and private</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">⚡</div>
              <div>
                <h3 className="login-feature-title">Instant Setup</h3>
                <p className="login-feature-desc">Get started quickly and easily</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">🌐</div>
              <div>
                <h3 className="login-feature-title">Global Access</h3>
                <p className="login-feature-desc">Work from anywhere, anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 