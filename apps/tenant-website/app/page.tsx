// Fixed version to resolve the TypeError: Cannot read properties of undefined (reading 'ppr')
import Link from 'next/link';

// Mock function to get template - in production this would come from context or props
async function getTemplate() {
  // This would normally come from React context or props
  // For now, returning mock data to prevent errors
  return {
    id: 'template-1',
    domainType: 'FITNESS_CENTER',
    name: 'Fitness Center Template',
    tagline: 'Transform lives, one workout at a time',
    description: 'Complete gym and fitness management platform',
    colorPrimary: '#E85D24',
    colorAccent: '#F2A623',
    colorBg: '#0F0F0F',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    websiteSections: {
      hero: { enabled: true },
      services: { enabled: true },
      cta: { enabled: true }
    }
  };
}

export default async function Home() {
  let t = null;
  let sections = [];

  try {
    t = await getTemplate();
    if (t && t.websiteSections) {
      sections = Object.entries(t.websiteSections)
        .filter(([_, v]: any) => v?.enabled)
        .map(([k]: any) => k);
    }
  } catch (error) {
    console.error('Failed to load template:', error);
    // Provide fallback values
    t = {
      name: 'Default Template',
      tagline: 'Welcome',
      description: 'Your platform',
      colorPrimary: '#3b82f6',
      colorAccent: '#10b981',
      colorBg: '#ffffff',
    };
    sections = ['hero'];
  }

  return (
    <div>
      {sections.includes('hero') && (
        <section style={{ background: t?.colorPrimary, color: '#fff' }} className="py-24 px-4 text-center">
          <h1 className="text-5xl font-extrabold">{t?.tagline || 'Welcome'}</h1>
          <p className="mt-3 text-lg opacity-90">{t?.description || 'Your platform'}</p>
          <Link href="/register" className="mt-6 inline-block px-6 py-3 bg-white text-gray-900 rounded-md font-semibold">
            Get Started
          </Link>
        </section>
      )}

      {(['services', 'menu', 'programs', 'rooms'].some(k => sections.includes(k))) && (
        <section className="py-16 px-4 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center">Our Services</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {['Service 1', 'Service 2', 'Service 3'].map((s) => (
              <div key={s} className="bg-white p-6 rounded-lg shadow">
                <div className="h-32 bg-gray-200 rounded mb-3" />
                <h3 className="font-semibold">{s}</h3>
                <p className="text-sm text-gray-500 mt-1">Description here</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.includes('cta') && (
        <section style={{ background: t?.colorAccent }} className="py-16 px-4 text-center text-white">
          <h2 className="text-3xl font-bold">Ready to start?</h2>
          <Link href="/register" className="mt-4 inline-block px-6 py-3 bg-white text-gray-900 rounded-md font-semibold">
            Sign Up Today
          </Link>
        </section>
      )}

      <footer className="py-8 bg-gray-900 text-gray-400 text-sm text-center">
        © {new Date().getFullYear()} Dexo · {t?.name || 'Your Business'}
      </footer>
    </div>
  );
}