'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function FallbackRedirectContent() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('to');

  useEffect(() => {
    if (redirectUrl) {
      // Use setTimeout to allow the page to render first
      const timer = setTimeout(() => {
        window.location.replace(redirectUrl);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [redirectUrl]);

  if (!redirectUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600">Не указан URL для перенаправления</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-700 mb-2">Перенаправляем…</p>
        <p className="text-sm text-gray-500">
          Если перенаправление не произошло автоматически,{' '}
          <a
            href={redirectUrl}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            нажмите здесь
          </a>
        </p>
      </div>
    </div>
  );
}

export default function FallbackRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Загрузка…</p>
        </div>
      </div>
    }>
      <FallbackRedirectContent />
    </Suspense>
  );
}
