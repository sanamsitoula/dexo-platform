'use client';

import { useState } from 'react';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');
const API_BASE_URL = `${API_HOST}/api`;

interface ProviderInfo {
  name: string;
  className: string;
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

const FacebookIcon = () => (
  <svg className="w-4 h-4" fill="#1877F2" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PROVIDER_INFO: Record<string, ProviderInfo> = {
  google: { name: 'Google', className: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700', icon: <GoogleIcon /> },
  facebook: { name: 'Facebook', className: 'bg-[#1877F2] border border-[#1877F2] hover:bg-[#166FE5] text-white', icon: <FacebookIcon /> },
};

/** Tenant-scoped OAuth buttons — mirrors AdminSocialLoginButtons but hits the
 * per-tenant social auth endpoint so each business's own OAuth app config is used. */
export default function TenantSocialLoginButtons({ tenantId }: { tenantId: string }) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await fetch(
        `${API_BASE_URL}/auth/social/tenant/${tenantId}/${provider}/url?redirectUri=${encodeURIComponent(redirectUri)}`
      );
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(`${PROVIDER_INFO[provider]?.name || provider} sign-in is not set up for this business yet. Use email/password instead.`);
      }
    } catch (err: any) {
      alert('Cannot connect to the server. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const providers = ['google', 'facebook'];

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t" style={{ borderColor: 'var(--site-border)' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3" style={{ backgroundColor: 'var(--site-surface)', color: 'var(--site-sub)' }}>or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {providers.map((provider) => {
          const info = PROVIDER_INFO[provider];
          const isLoading = loadingProvider === provider;
          const isDisabled = loadingProvider !== null;
          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleSocialLogin(provider)}
              disabled={isDisabled}
              className={`${info.className} font-medium py-2.5 px-3 rounded-md flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>{info.icon}<span>{info.name}</span></>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
