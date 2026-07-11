import Link from 'next/link';

const sections = [
  {
    title: '1. Information We Collect',
    body: `We collect information you provide directly to us, such as your name, email address, phone
number, and company details when you register for an account, contact us, or sign up for a trial.
When you use the platform as a tenant, we also collect the data your business stores in the
system (e.g. member records, bookings, staff details) on your behalf.`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use the information we collect to provide, maintain, and improve the platform; to
communicate with you about your account, updates, and support requests; to process billing; and
to detect, prevent, and address fraud, abuse, or security issues.`,
  },
  {
    title: '3. Data Isolation Between Tenants',
    body: `Dexo is a multi-tenant platform: each tenant's data is logically isolated and is never
shared with or visible to other tenants. Platform staff access tenant data only as needed to
provide support or maintain the service.`,
  },
  {
    title: '4. Cookies & Similar Technologies',
    body: `We use cookies and similar technologies to keep you signed in, remember your preferences,
and understand how the platform is used so we can improve it. You can control cookies through
your browser settings, though disabling them may limit some functionality.`,
  },
  {
    title: '5. Data Sharing',
    body: `We do not sell your personal information. We may share information with service providers
who help us operate the platform (e.g. hosting, email delivery, payment processing), and only to
the extent necessary for them to perform those services, or when required by law.`,
  },
  {
    title: '6. Data Security',
    body: `We use industry-standard measures — including encrypted connections (HTTPS/TLS), access
controls, and regular security reviews — to protect your information. No method of transmission
or storage is 100% secure, but we work to protect your data to the best of our ability.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain account and tenant data for as long as your account is active or as needed to
provide the service. You may request deletion of your data at any time, subject to any legal
retention requirements.`,
  },
  {
    title: '8. Your Rights',
    body: `Depending on your location, you may have the right to access, correct, export, or delete
your personal information. To exercise these rights, contact us using the details below.`,
  },
  {
    title: '9. Changes to This Policy',
    body: `We may update this privacy policy from time to time. We will post the updated policy on
this page and update the "last updated" date below.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/" className="text-sm text-indigo-600 hover:text-indigo-500">
            ← Back to Home
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Privacy Policy
          </h1>
          <p className="mt-2 text-gray-600">
            Last updated: July 11, 2026
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{section.title}</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{section.body}</p>
            </div>
          ))}

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">10. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have questions about this privacy policy or how we handle your data, please{' '}
              <Link href="/contact" className="text-indigo-600 hover:text-indigo-500 font-medium">
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
