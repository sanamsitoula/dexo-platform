import './globals.css';
import { tenantMiddleware } from '@dexo/tenancy/middleware';
import type { NextRequest } from 'next/server';
import BottomNav from './_components/BottomNav';

export const middleware = (req: NextRequest) => tenantMiddleware(req);

export const metadata = {
  title: 'Tenant App',
  description: 'Customer app — bottom nav + card feed',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 pb-20">
        <div className="max-w-md mx-auto min-h-screen bg-white">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
