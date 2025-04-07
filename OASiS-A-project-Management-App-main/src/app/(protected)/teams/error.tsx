'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export default function TeamsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Teams page error:', error);
  }, [error]);

  return (
    <div className="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-ink-900 mb-2">エラーが発生しました</h2>
            <p className="text-ink-600 mb-6">
              {error.message || 'チームページの読み込み中に問題が発生しました。もう一度お試しください。'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} className="w-full">
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                再試行
              </Button>
              <Link href="/dashboard">
                <Button variant="secondary" className="w-full">
                  <HomeIcon className="h-5 w-5 mr-2" />
                  ダッシュボードに戻る
                </Button>
              </Link>
            </div>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-ink-900 mb-2">エラー詳細 (開発環境のみ):</h3>
              <div className="bg-gray-50 p-3 rounded-md overflow-auto">
                <pre className="text-xs text-ink-700">{error.stack}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 