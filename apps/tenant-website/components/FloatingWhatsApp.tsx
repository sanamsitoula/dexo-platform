// Floating WhatsApp button for the tenant-website.
// Fetches public WhatsApp config from the API on mount. Hidden if the tenant
// has not enabled WhatsApp (see TenantWhatsAppConfig.isEnabled).

import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getPublicWhatsApp(subdomain: string): Promise<{ isEnabled: boolean; phoneNumber: string; displayName: string | null }> {
  try {
    const res = await fetch(`${API_URL}/api/whatsapp/public/${subdomain}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { isEnabled: false, phoneNumber: '', displayName: null };
    return await res.json();
  } catch {
    return { isEnabled: false, phoneNumber: '', displayName: null };
  }
}

export async function FloatingWhatsApp({ subdomain }: { subdomain: string }) {
  const cfg = await getPublicWhatsApp(subdomain);
  if (!cfg.isEnabled || !cfg.phoneNumber) return null;

  return (
    <a
      href={`https://wa.me/${cfg.phoneNumber}`}
      target="_blank"
      rel="noreferrer"
      aria-label={cfg.displayName ? `Chat with ${cfg.displayName} on WhatsApp` : 'Chat on WhatsApp'}
      title={cfg.displayName ? `Chat with ${cfg.displayName}` : 'Chat on WhatsApp'}
      className="fixed bottom-5 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-lg text-white text-2xl transition-transform hover:scale-110"
    >
      💬
    </a>
  );
}