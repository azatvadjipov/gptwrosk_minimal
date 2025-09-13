'use client';

import { useEffect, useState, useCallback } from 'react';

interface TelegramWebApp {
  initData: string;
  ready: () => void;
  onEvent: (eventType: string, callback: () => void) => void;
  version?: string;
  platform?: string;
  initDataUnsafe?: Record<string, unknown>;
  themeParams?: Record<string, unknown>;
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

  const checkMembership = useCallback(async () => {
      try {
        console.log('🔍 Checking for Telegram WebApp...');
        console.log('window.Telegram exists:', !!window.Telegram);
        console.log('window.Telegram.WebApp exists:', !!window.Telegram?.WebApp);
        console.log('Current URL:', window.location.href);
        console.log('User Agent:', navigator.userAgent);
        console.log('Environment variables check:');
        console.log('NEXT_PUBLIC_MEMBER_REDIRECT_URL:', process.env.NEXT_PUBLIC_MEMBER_REDIRECT_URL);
        console.log('NEXT_PUBLIC_NON_MEMBER_REDIRECT_URL:', process.env.NEXT_PUBLIC_NON_MEMBER_REDIRECT_URL);

        // Wait for Telegram WebApp to be ready
        if (!window.Telegram?.WebApp) {
          console.log(`❌ Telegram WebApp not found (attempt ${retryCount + 1}/15), waiting...`);

          if (retryCount < 15) {
            setRetryCount(prev => prev + 1);
            // Increase delay for mobile devices
            const delay = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
              ? 1500
              : 1000;
            setTimeout(() => checkMembership(), delay);
            return;
          } else {
            console.error('❌ Failed to load Telegram WebApp after 15 attempts');
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

        // Get redirect URLs from environment (NEXT_PUBLIC_ variables are available on client)
        let memberUrl = process.env.NEXT_PUBLIC_MEMBER_REDIRECT_URL || 'https://ваш-сайт-для-участников';
        let nonMemberUrl = process.env.NEXT_PUBLIC_NON_MEMBER_REDIRECT_URL || 'https://ваш-сайт-для-гостей';

        // Fallback: try to get from URL hash parameters (for cases when env vars don't load)
        if (memberUrl === 'https://ваш-сайт-для-участников') {
          const urlParams = new URLSearchParams(window.location.hash.substring(1));
          const fallbackMemberUrl = urlParams.get('member_url');
          const fallbackNonMemberUrl = urlParams.get('non_member_url');

          if (fallbackMemberUrl) memberUrl = decodeURIComponent(fallbackMemberUrl);
          if (fallbackNonMemberUrl) nonMemberUrl = decodeURIComponent(fallbackNonMemberUrl);
        }

        console.log('Redirect URLs:', { memberUrl, nonMemberUrl });

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
    }, [retryCount]);

  useEffect(() => {
    console.log('Starting membership check...');
    checkMembership();
  }, [checkMembership]);

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
