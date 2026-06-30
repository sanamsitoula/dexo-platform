'use client';

import { useState } from 'react';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const API_BASE_URL = `${API_HOST}/api`;

interface ProviderInfo {
  name: string;
  color: string;
  hoverColor: string;
  textColor: string;
  icon: React.ReactNode;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const PROVIDER_INFO: Record<string, ProviderInfo> = {
  google: {
    name: 'Google',
    color: 'bg-white border border-gray-300',
    hoverColor: 'hover:bg-gray-50',
    textColor: 'text-gray-700',
    icon: <GoogleIcon />,
  },
  github: {
    name: 'GitHub',
    color: 'bg-[#24292e] border border-[#24292e]',
    hoverColor: 'hover:bg-[#1b1f23]',
    textColor: 'text-white',
    icon: <GitHubIcon />,
  },
  apple: {
    name: 'Apple',
    color: 'bg-black border border-black',
    hoverColor: 'hover:bg-gray-800',
    textColor: 'text-white',
    icon: <AppleIcon />,
  },
};

export default function AdminSocialLoginButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      const redirectUri = `${window.location.origin}/auth/social/callback`;

      const res = await fetch(
        `${API_BASE_URL}/auth/platform/${provider}/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();

      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(`${PROVIDER_INFO[provider]?.name || provider} sign-in is not configured. Use email/password instead.`);
      }
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch')) {
        alert('Cannot connect to API server. Please make sure the backend is running on port 4000.');
      } else {
        alert('Failed to initiate social login: ' + (err?.message || 'Unknown error'));
      }
    } finally {
      setLoadingProvider(null);
    }
  };

  const providers = ['google', 'github', 'apple'];

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500 font-medium">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {providers.map((provider) => {
          const info = PROVIDER_INFO[provider];
          if (!info) return null;
          const isLoading = loadingProvider === provider;
          const isDisabled = loadingProvider !== null;

          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleSocialLogin(provider)}
              disabled={isDisabled}
              className={`${info.color} ${info.hoverColor} ${info.textColor} font-medium py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {info.icon}
                  <span>{info.name}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
