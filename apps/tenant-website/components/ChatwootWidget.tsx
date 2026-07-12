'use client';

import { useEffect } from 'react';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '');

/**
 * Tier 1 of the Chatwoot integration (see docs/CHATWOOT_INTEGRATION.md):
 * Customer <-> Tenant. Loads this tenant's own Chatwoot Website widget for
 * anonymous site visitors — customers chat directly with the gym/salon/etc.
 * owner or staff. No-ops silently if the tenant has no inbox provisioned yet
 * (Chatwoot not configured platform-wide, or provisioning hasn't run).
 */
export default function ChatwootWidget({ subdomain }: { subdomain: string }) {
  useEffect(() => {
    let cancelled = false;

    fetch(`${API_HOST}/api/chatwoot/public/${subdomain}/widget`)
      .then((r) => (r.ok ? r.json() : { configured: false }))
      .then((cfg: { configured: boolean; baseUrl?: string; websiteToken?: string }) => {
        if (cancelled || !cfg.configured || !cfg.baseUrl || !cfg.websiteToken) return;
        loadChatwootScript(cfg.baseUrl, cfg.websiteToken);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [subdomain]);

  return null;
}

/** Standard Chatwoot embed snippet, adapted to load once per page. */
function loadChatwootScript(baseUrl: string, websiteToken: string) {
  if ((window as any).chatwootSDK || document.getElementById('chatwoot-sdk')) return;
  const script = document.createElement('script');
  script.id = 'chatwoot-sdk';
  script.src = `${baseUrl.replace(/\/$/, '')}/packs/js/sdk.js`;
  script.defer = true;
  script.async = true;
  script.onload = () => {
    (window as any).chatwootSDK?.run({ websiteToken, baseUrl });
  };
  document.body.appendChild(script);
}
