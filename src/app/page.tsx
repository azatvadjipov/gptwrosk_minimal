'use client';

import { useEffect, useState } from 'react';

interface TelegramWebApp {
  initData: string;
}

interface Telegram {
  WebApp: TelegramWebApp;
}

declare global {
  interface Window {
    Telegram?: Telegram;
  }
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkMembership = async () => {
      try {
        // Get initData from Telegram WebApp
        const initData = window.Telegram?.WebApp?.initData;

        if (!initData) {
          setError('Не удалось получить данные Telegram. Убедитесь, что приложение запущено в Telegram.');
          setLoading(false);
          return;
        }

        // Call our API to check membership
        const response = await fetch('/api/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Произошла ошибка при проверке доступа');
          setLoading(false);
          return;
        }

        // Get redirect URLs from environment (will be injected at build time)
        const memberUrl = process.env.NEXT_PUBLIC_MEMBER_REDIRECT_URL || 'https://ваш-сайт-для-участников';
        const nonMemberUrl = process.env.NEXT_PUBLIC_NON_MEMBER_REDIRECT_URL || 'https://ваш-сайт-для-гостей';

        // Redirect based on membership status
        const redirectUrl = data.member ? memberUrl : nonMemberUrl;

        // Use window.location.replace to redirect within Telegram WebView
        window.location.replace(redirectUrl);

      } catch (err) {
        console.error('Error checking membership:', err);
        setError('Произошла ошибка при проверке доступа');
        setLoading(false);
      }
    };

    checkMembership();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700">Проверяем доступ…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Ошибка</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return null;
}
