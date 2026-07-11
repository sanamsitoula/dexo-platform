'use client';

import { useEffect, useState } from 'react';

/**
 * Client-side auto-redirect to the member portal login, with a visible
 * button fallback in case the redirect is blocked or the portal is down.
 */
export default function LoginRedirect({ loginUrl, accent }: { loginUrl: string; accent: string }) {
  const [seconds, setSeconds] = useState(3);

  useEffect(() => {
    if (seconds <= 0) {
      window.location.href = loginUrl;
      return;
    }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, loginUrl]);

  return (
    <div className="mt-6">
      <a
        href={loginUrl}
        className="inline-block w-full px-6 py-3 rounded-md font-semibold text-black"
        style={{ background: accent }}
      >
        Go to Member Portal Login
      </a>
      <p className="mt-3 text-xs opacity-50" aria-live="polite">
        {seconds > 0 ? `Redirecting automatically in ${seconds}s…` : 'Redirecting…'}
      </p>
    </div>
  );
}
