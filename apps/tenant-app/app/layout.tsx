import './globals.css';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import BottomNav from './_components/BottomNav';
import AuthGate from './_components/AuthGate';

// DEXO brand type stack — Inter for UI, Space Grotesk for display numerals and
// titles, JetBrains Mono for codes/IDs (brand/Brand/04-typography.md).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '700'], variable: '--font-grotesk', display: 'swap' });
const jbMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-jbmono', display: 'swap' });

export const metadata = {
  title: 'Fitness App',
  description: 'Your gym in your pocket — workouts, diet, membership. Powered by Dexo.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${grotesk.variable} ${jbMono.variable} ${inter.className} bg-gray-50 pb-20`}>
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <AuthGate>{children}</AuthGate>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
