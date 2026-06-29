export default function ArchivedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-lg w-full bg-white shadow rounded-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Account Archived</h1>
        <p className="mt-2 text-gray-600">
          This account has been archived. Contact support to restore your tenant.
        </p>
        <a href="mailto:support@dexo.com" className="mt-6 inline-block px-4 py-2 bg-slate-900 text-white rounded-md">
          Contact Support
        </a>
      </div>
    </div>
  );
}
