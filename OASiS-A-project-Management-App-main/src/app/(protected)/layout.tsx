'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartBarIcon,
  MegaphoneIcon,
  CalendarDaysIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  UserGroupIcon,
  BellIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { signOut } from 'next-auth/react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import NotificationsDropdown from '@/components/NotificationsDropdown';
import ClientSearchParamsProvider from '@/components/providers/ClientSearchParamsProvider';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '';
  const { t } = useLanguage();
  const [pendingInvitations, setPendingInvitations] = useState<number>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch pending invitations when session is loaded
  useEffect(() => {
    const fetchPendingInvitations = async () => {
      if (session?.user) {
        try {
          const response = await fetch('/api/invitations/count', {
            // Add cache-busting headers
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch invitation count');
          }
          
          const data = await response.json();
          setPendingInvitations(data.count);
        } catch (error) {
          console.error('Failed to fetch pending invitations:', error);
          setPendingInvitations(0); // Reset to 0 on error
        }
      }
    };

    // Initial fetch
    if (status === 'authenticated') {
      fetchPendingInvitations();
    }
  }, [session, status]);

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Render nothing until authentication check is complete
  if (status !== 'authenticated') {
    return null;
  }

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: HomeIcon },
    { name: t('nav.projects'), href: '/projects', icon: Squares2X2Icon },
    { name: t('nav.tasks'), href: '/tasks', icon: ClipboardDocumentListIcon },
    { name: t('nav.teams'), href: '/teams', icon: UserGroupIcon },
    { name: t('nav.members'), href: '/members', icon: UsersIcon },
    { name: t('nav.reports'), href: '/reports', icon: ChartBarIcon },
    { name: t('nav.bulletins'), href: '/bulletins', icon: MegaphoneIcon },
    { name: t('nav.dailyLog'), href: '/daily-log', icon: CalendarDaysIcon },
  ];

  const handleSignOut = async () => {
    try {
      // Log the logout activity directly using the API route
      await fetch('/api/daily-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: 'システムからログアウトしました',
          category: 'system',
          startTime: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
          completed: true
        }),
      });
    } catch (error) {
      console.error('Error logging logout:', error);
      // Continue with signout even if logging fails
    }
    
    await signOut({ redirect: false });
    router.push('/login');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-10 bg-white shadow-lg flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-3">
          {!sidebarCollapsed && (
            <div className="flex-1 flex justify-center">
              <h1 className="text-2xl font-bold text-indigo-600 tracking-wide border-b-2 border-indigo-500 translate-y-2.5">{t('app.name')}</h1>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex justify-center w-full">
              <span className="text-2xl font-bold text-indigo-600 border-b-2 border-indigo-500">O</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-50 focus:outline-none"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRightIcon className="h-5 w-5" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {/* Navigation Links */}
        <nav className="mt-5 px-2 space-y-1 flex-grow">
          {navigation.map((item) => {
            // Check if this is the current active path
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-ink-700 hover:bg-gray-50 hover:text-indigo-600'
                }`}
                title={sidebarCollapsed ? item.name : ""}
              >
                <item.icon
                  className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 ${
                    isActive ? 'text-indigo-500' : 'text-ink-400 group-hover:text-indigo-500'
                  }`}
                  aria-hidden="true"
                />
                {!sidebarCollapsed && item.name}
              </Link>
            );
          })}

          {/* Always show the invitations link */}
          <Link
            href="/invitations"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
              pathname === '/invitations'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-ink-700 hover:bg-gray-50 hover:text-indigo-600'
            }`}
            title={sidebarCollapsed ? t('nav.invitations') : ""}
          >
            <BellIcon
              className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 ${
                pathname === '/invitations' ? 'text-indigo-500' : 'text-ink-400 group-hover:text-indigo-500'
              }`}
              aria-hidden="true"
            />
            {!sidebarCollapsed && t('nav.invitations')}
            {pendingInvitations > 0 && (
              <span className={`${sidebarCollapsed ? 'absolute top-0 right-0 mr-1 mt-1' : 'ml-auto'} bg-sakura-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center`}>
                {pendingInvitations}
              </span>
            )}
          </Link>

          <button
            onClick={handleSignOut}
            className={`w-full mt-4 group flex items-center px-2 py-2 text-sm font-medium rounded-md text-ink-700 hover:bg-gray-50 hover:text-indigo-600`}
            title={sidebarCollapsed ? t('auth.logout') : ""}
          >
            <ArrowRightOnRectangleIcon
              className={`${sidebarCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 text-ink-400 group-hover:text-indigo-500`}
              aria-hidden="true"
            />
            {!sidebarCollapsed && t('auth.logout')}
          </button>
        </nav>
        
        {/* Language Switcher at bottom */}
        <div className="mt-auto p-4 border-t border-gray-200">
          {!sidebarCollapsed && <LanguageSwitcher className="justify-center" />}
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'pl-16' : 'pl-64'}`}>
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="inline-block mr-4 p-1 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-gray-50 focus:outline-none md:hidden"
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h2 className="text-xl font-bold text-indigo-700 tracking-wide px-1 py-0.5 translate-y-2.5">
                {navigation.find((item) => pathname.startsWith(item.href))?.name || t('app.name')}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsDropdown />
              <span className="text-sm font-medium text-ink-700">
                {session.user.name || session.user.username}
              </span>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <ClientSearchParamsProvider>
            {children}
          </ClientSearchParamsProvider>
        </main>
      </div>
    </div>
  );
} 