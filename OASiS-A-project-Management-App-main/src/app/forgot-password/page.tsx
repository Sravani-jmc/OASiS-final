'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage({ type: 'error', text: t('auth.emailAddress') + t('auth.error.required') });
      return;
    }
    
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      // In a real implementation, call your API endpoint
      // const response = await fetch('/api/auth/forgot-password', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
      
      // For demo purposes, simulate success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ type: 'success', text: t('auth.resetSuccess') });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      setMessage({ type: 'error', text: t('auth.resetError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-washi">
      {/* Left Panel - Form */}
      <div className="w-full md:w-1/2 flex flex-col p-8">
        {/* Language Switcher */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher variant="login" />
        </div>
        
        <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-indigo-600">{t('app.name')}</h1>
            <p className="mt-2 text-lg text-gray-600">{t('auth.resetPassword')}</p>
          </div>
          
          <div className="card p-8">
            {message && (
              <div 
                className={`${
                  message.type === 'success' 
                    ? 'bg-green-50 border-green-400 text-green-700' 
                    : 'bg-sakura-50 border-sakura-400 text-sakura-700'
                } px-4 py-3 rounded relative mb-6 border`} 
                role="alert"
              >
                <span className="block sm:inline">{message.text}</span>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="form-label">
                  {t('auth.emailAddress')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('app.loading') : t('auth.sendResetLink')}
                </button>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                {t('auth.backToLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Image */}
      <div className="hidden md:block md:w-1/2 bg-indigo-600 relative">
        <div className="absolute inset-0 flex items-center justify-center p-10">
          <div className="text-center">
            <div className="mb-6">
              <Image 
                src="/images/oasis-illustration.svg" 
                alt="OASiS Illustration" 
                width={300} 
                height={300}
                className="mx-auto"
                priority
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {t('app.name')}
            </h2>
            <p className="text-xl text-indigo-100">
              {t('app.tagline')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 