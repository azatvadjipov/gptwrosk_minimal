'use client';

import { useEffect, useState } from 'react';

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
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
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const checkMembership = async () => {
      try {
        console.log('🔍 Checking for Telegram WebApp...');
        console.log('window.Telegram exists:', !!window.Telegram);
        console.log('window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);
        console.log('Current URL:', window.location.href);
        console.log('User Agent:', navigator.userAgent);

        // Wait for Telegram WebApp to be ready
        if (!window.Telegram?.WebApp) {
          console.log(`❌ Telegram WebApp not found (attempt ${retryCount + 1}/10), waiting...`);

          if (retryCount < 10) {
            setRetryCount(prev => prev + 1);
            setTimeout(checkMembership, 1000);
            return;
          } else {
            console.error('❌ Failed to load Telegram WebApp after 10 attempts');
            setError('Не удалось подключиться к Telegram WebApp. Убедитесь, что приложение запущено через Telegram.');
            setLoading(false);
            return;
          }
        }

        console.log('✅ Telegram WebApp found!');
        console.log('WebApp version:', window.Telegram.WebApp.version || 'unknown');
        console.log('WebApp platform:', window.Telegram.WebApp.platform || 'unknown');

        // Ensure WebApp is ready
        if (typeof window.Telegram.WebApp.ready === 'function') {
          console.log('📞 Calling WebApp.ready()...');
          window.Telegram.WebApp.ready();
        }

        // Get initData from Telegram WebApp
        const initData = window.Telegram.WebApp.initData;

        console.log('📋 initData status:', initData ? 'present' : 'missing');
        console.log('📏 initData length:', initData?.length || 0);
        if (initData) {
          console.log('📄 initData (first 200 chars):', initData.substring(0, 200));
          console.log('🔍 initData contains user:', initData.includes('user='));
          console.log('🔍 initData contains hash:', initData.includes('hash='));
        }

        if (!initData || initData.trim() === '') {
          console.error('initData is empty or missing');
          setError('Не удалось получить данные Telegram. Убедитесь, что приложение запущено в Telegram.');
          setLoading(false);
          return;
        }

        console.log('initData validation passed, proceeding with API call');

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
        console.log('Redirecting to:', redirectUrl, 'Member status:', data.member);

        // Use window.location.replace to redirect within Telegram WebView
        window.location.replace(redirectUrl);

      } catch (err) {
        console.error('Error checking membership:', err);
        setError('Произошла ошибка при проверке доступа');
        setLoading(false);
      }
    };

    console.log('Starting membership check...');
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
            onClick={() => {
              console.log('Retry button clicked');
              setRetryCount(0);
              setError(null);
              setLoading(true);
              // Re-run the membership check
              setTimeout(() => {
                const checkMembership = async () => {
                  try {
                    if (!window.Telegram?.WebApp) {
                      console.log('Telegram WebApp not found on retry');
                      setError('Не удалось подключиться к Telegram WebApp. Попробуйте перезапустить приложение.');
                      setLoading(false);
                      return;
                    }

                    const initData = window.Telegram.WebApp.initData;
                    console.log('Retry - initData:', initData ? 'present' : 'missing');

                    if (!initData || initData.trim() === '') {
                      setError('Не удалось получить данные Telegram. Убедитесь, что приложение запущено в Telegram.');
                      setLoading(false);
                      return;
                    }

                    // Continue with API call...
                    const response = await fetch('/api/check', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ initData }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      setError(data.error || 'Произошла ошибка при проверке доступа');
                      setLoading(false);
                      return;
                    }

                    const memberUrl = process.env.NEXT_PUBLIC_MEMBER_REDIRECT_URL || 'https://ваш-сайт-для-участников';
                    const nonMemberUrl = process.env.NEXT_PUBLIC_NON_MEMBER_REDIRECT_URL || 'https://ваш-сайт-для-гостей';
                    const redirectUrl = data.member ? memberUrl : nonMemberUrl;

                    console.log('Retry - Redirecting to:', redirectUrl);
                    window.location.replace(redirectUrl);

                  } catch (err) {
                    console.error('Retry error:', err);
                    setError('Произошла ошибка при проверке доступа');
                    setLoading(false);
                  }
                };
                checkMembership();
              }, 100);
            }}
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
