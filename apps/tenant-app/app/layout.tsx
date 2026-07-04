import './globals.css';
import BottomNav from './_components/BottomNav';
import AuthGate from './_components/AuthGate';

export const metadata = {
  title: 'Fitness App',
  description: 'Your gym in your pocket — workouts, diet, membership.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 pb-20">
        <div className="max-w-md mx-auto min-h-screen bg-white">
          <AuthGate>{children}</AuthGate>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
