'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function LoginPage() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    confirmPassword: '',
    resetEmail: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentForm, setCurrentForm] = useState<'login' | 'register' | 'forgot'>('login');
  const [rememberMe, setRememberMe] = useState(false);
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  useEffect(() => {
    // Clear errors when switching forms
    setError('');
    setSuccess('');
  }, [currentForm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      setError(t('auth.error.required'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await signIn('credentials', {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });
      
      if (result?.error) {
        setError(t('auth.error.invalid'));
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      setError(t('auth.error.general'));
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(t('form.required'));
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError(t('form.passwordMismatch'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.message || t('auth.error.general'));
        console.error('Registration error response:', data);
      } else {
        setSuccess(t('auth.registerSuccess'));
        // Auto switch to login form after successful registration
        setTimeout(() => {
          setCurrentForm('login');
          setFormData(prev => ({
            ...prev,
            username: formData.username, // Keep the username for login
            password: '',
            confirmPassword: '',
          }));
        }, 2000);
      }
    } catch (error) {
      setError(t('auth.error.general'));
      console.error('Register error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.resetEmail) {
      setError(t('form.required'));
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.resetEmail)) {
      setError(t('form.emailInvalid'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.resetEmail,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(t('auth.resetPasswordSuccess'));
        setOtpEmail(formData.resetEmail);
        // Transition to OTP verification after a short delay
        setTimeout(() => {
          setShowOtpVerification(true);
        }, 1500);
      } else {
        setError(data.error || t('auth.resetError'));
      }
    } catch (error) {
      console.error('Reset password error:', error);
      setError(t('auth.resetError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setError(t('auth.invalidOtp'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: otpEmail,
          otp: otpCode,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(t('auth.otpVerified'));
        setOtpCode('');
        
        // Go back to login form after a delay
        setTimeout(() => {
          setShowOtpVerification(false);
          setCurrentForm('login');
        }, 3000);
      } else {
        setError(data.error || t('auth.invalidOtp'));
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(t('auth.invalidOtp'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gray-50">
      <div className="login-container">
        <div className="login-left-panel">
          {/* Language Switcher */}
          <div className="language-switch">
            <i className="fas fa-globe"></i>
            <LanguageSwitcher variant="login" />
          </div>
          
          <div className="login-box">
            {/* Login Form */}
            {currentForm === 'login' && (
              <div key="login-form">
                <h1>OASiS</h1>
                <h2>{t('auth.login.welcome')}</h2>
                
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <span>{error}</span>
                  </div>
                )}
                
                <form onSubmit={handleLoginSubmit}>
                  <div className="input-group">
                    <input
                      type="text"
                      id="username"
                      name="username"
                      placeholder={t('auth.username')}
                      required
                      className="login-input"
                      value={formData.username}
                      onChange={handleChange}
                    />
                    <i className="fas fa-user"></i>
                  </div>
                  
                  <div className="input-group">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      placeholder={t('auth.password')}
                      required
                      className="login-input"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <i className="fas fa-lock"></i>
                  </div>
                  
                  <div className="remember-forgot">
                    <div className="remember-me">
                      <input 
                        type="checkbox" 
                        id="remember-me" 
                        name="remember-me"
                        checked={rememberMe}
                        onChange={() => setRememberMe(!rememberMe)}
                      />
                      <label htmlFor="remember-me">{t('auth.rememberMe')}</label>
                    </div>
                    
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        // Allow DOM to update before switching forms
                        setTimeout(() => {
                          setCurrentForm('forgot');
                        }, 0);
                      }} 
                      className="forgot-password"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                  
                  <button
                    type="submit"
                    className="login-button"
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth.login.processing') : t('auth.login')}
                    {isLoading && <span className="ml-2 animate-spin">⟳</span>}
                  </button>
                </form>
                
                <div className="divider">
                  <span>{t('auth.or')}</span>
                </div>
                
                <div className="register-link">
                  <span>{t('auth.noAccount')} </span>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      // Allow DOM to update before switching forms
                      setTimeout(() => {
                        setCurrentForm('register');
                      }, 0);
                    }}
                    className="font-medium"
                  >
                    {t('auth.register')}
                  </a>
                </div>
              </div>
            )}
            
            {/* Register Form */}
            {currentForm === 'register' && (
              <div key="register-form">
                <h1>OASiS</h1>
                <h2>{t('auth.register')}</h2>
                
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <span>{error}</span>
                  </div>
                )}
                
                {success && (
                  <div className="alert alert-success" role="alert">
                    <span>{success}</span>
                  </div>
                )}
                
                <form onSubmit={handleRegisterSubmit}>
                  <div className="input-group">
                    <input
                      type="text"
                      id="username"
                      name="username"
                      placeholder={t('auth.username')}
                      required
                      className="login-input"
                      value={formData.username}
                      onChange={handleChange}
                    />
                    <i className="fas fa-user"></i>
                  </div>
                  
                  <div className="input-group">
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder={t('auth.emailAddress')}
                      required
                      className="login-input"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <i className="fas fa-envelope"></i>
                  </div>
                  
                  <div className="input-group">
                    <input
                      type="password"
                      id="password"
                      name="password"
                      placeholder={t('auth.password')}
                      required
                      className="login-input"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <i className="fas fa-lock"></i>
                  </div>
                  
                  <div className="input-group">
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder={t('auth.confirmPassword')}
                      required
                      className="login-input"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                    <i className="fas fa-lock"></i>
                  </div>
                  
                  <button
                    type="submit"
                    className="login-button"
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth.login.processing') : t('auth.register')}
                    {isLoading && <span className="ml-2 animate-spin">⟳</span>}
                  </button>
                </form>
                
                <div className="register-link">
                  <span>{t('auth.have-account')} </span>
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      // Allow DOM to update before switching forms
                      setTimeout(() => {
                        setCurrentForm('login');
                      }, 0);
                    }}
                    className="font-medium"
                  >
                    {t('auth.login')}
                  </a>
                </div>
              </div>
            )}
            
            {/* Forgot Password Form */}
            {currentForm === 'forgot' && (
              <div key="forgot-form">
                <h1>OASiS</h1>
                <h2>{t('auth.resetPassword')}</h2>
                
                {error && (
                  <div className="alert alert-danger" role="alert">
                    <span>{error}</span>
                  </div>
                )}
                
                {success && (
                  <div className="alert alert-success" role="alert">
                    <span>{success}</span>
                  </div>
                )}
                
                {!showOtpVerification ? (
                  // Email Input Form
                  <>
                    <p className="forgot-instructions">
                      {t('auth.resetPasswordInstructions')}
                    </p>
                    
                    <form onSubmit={handleForgotPasswordSubmit}>
                      <div className="input-group">
                        <input
                          type="email"
                          name="resetEmail"
                          placeholder={t('auth.emailAddress')}
                          required
                          className="login-input"
                          value={formData.resetEmail}
                          onChange={handleChange}
                        />
                        <i className="fas fa-envelope"></i>
                      </div>
                      
                      <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                      >
                        {isLoading ? t('app.loading') : t('auth.sendOtp')}
                        {isLoading && <span className="ml-2 animate-spin">⟳</span>}
                      </button>
                    </form>
                  </>
                ) : (
                  // OTP Verification Form
                  <>
                    <p className="forgot-instructions">
                      {t('auth.otpInstructions')}
                    </p>
                    
                    <form onSubmit={handleOtpVerify}>
                      <div className="input-group">
                        <input
                          type="text"
                          placeholder={t('auth.enterOtp')}
                          required
                          maxLength={6}
                          className="login-input"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                        />
                        <i className="fas fa-key"></i>
                      </div>
                      
                      <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                      >
                        {isLoading ? t('app.loading') : t('auth.verifyOtp')}
                        {isLoading && <span className="ml-2 animate-spin">⟳</span>}
                      </button>
                      
                      <div className="mt-4 text-center">
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setShowOtpVerification(false);
                          }}
                          className="text-indigo-600 hover:text-indigo-500"
                        >
                          {t('auth.backToEmail')}
                        </a>
                      </div>
                    </form>
                  </>
                )}
                
                <div className="back-to-login">
                  <a 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      // Allow DOM to update before switching forms
                      setTimeout(() => {
                        setCurrentForm('login');
                      }, 0);
                    }}
                  >
                    {t('auth.backToLogin')}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel with Project Management Image */}
        <div className="login-right-panel">
          <Image 
            src="/images/project-management.png" 
            alt="Project Management Illustration" 
            width={300} 
            height={300}
            className="mx-auto"
            priority
          />
          <div className="jp-text">
            {language === 'ja' ? 'プロジェクト管理を簡単に' : 'Project Management Made Easy'}
          </div>
        </div>
      </div>
    </div>
  );
} 