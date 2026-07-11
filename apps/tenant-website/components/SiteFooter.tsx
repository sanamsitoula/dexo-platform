import Link from 'next/link';
import type { SiteTheme } from '@/lib/site-theme';

/** Shared template-aware footer for all public pages. */
export default function SiteFooter({ theme, name, contact }: {
  theme: SiteTheme;
  name: string;
  contact?: { branch?: string; address?: string; phone?: string } | null;
}) {
  return (
    <footer className="py-10 text-center text-sm" style={{ color: 'var(--site-sub)' }}>
      {contact && (contact.branch || contact.address || contact.phone) && (
        <p className="mb-2">
          {contact.branch}{contact.address ? ` · ${contact.address}` : ''}{contact.phone ? ` · ${contact.phone}` : ''}
        </p>
      )}
      <div className="space-x-3 mb-2">
        <Link href="/" className="hover:opacity-70">Home</Link>
        <Link href="/about" className="hover:opacity-70">About</Link>
        <Link href="/services" className="hover:opacity-70">Services</Link>
        <Link href="/book" className="hover:opacity-70">Book</Link>
        <Link href="/register" className="hover:opacity-70">Join</Link>
        <Link href="/contact" className="hover:opacity-70">Contact</Link>
      </div>
      <div>
        © {new Date().getFullYear()} {name}
        {theme.tpl ? ` · ${theme.tpl.templateName} template` : ''} · Powered by OneDexo
      </div>
    </footer>
  );
}
